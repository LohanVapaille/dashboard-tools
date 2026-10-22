<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\StayTransition;
use App\Models\Trip;
use App\Models\TripBudgetMember;
use App\Models\TripExpense;
use App\Services\Budget\TripBudget;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BudgetController extends Controller
{
    use AuthorizesRequests;

    public function show(Trip $trip)
    {
        $this->authorize('view', $trip);

        return response()->json((new TripBudget($trip))->summary());
    }

    public function updateTarget(Request $request, Trip $trip)
    {
        $validated = $request->validate(['budget_target' => ['nullable', 'numeric', 'min:0', 'max:10000000']]);
        $trip->update($validated);

        return $this->summary($trip);
    }

    /** Modifie un montant prévu : prix par personne d'une activité, coût d'un logement ou d'un trajet. */
    public function updatePlanned(Request $request, Trip $trip)
    {
        $validated = $request->validate([
            'type' => ['required', 'in:activity,stay,transition'],
            'id' => ['required', 'integer'],
            'amount' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
        ]);

        $amount = $validated['amount'];

        match ($validated['type']) {
            'activity' => Activity::whereKey($validated['id'])
                ->whereHas('day.stay', fn ($query) => $query->where('trip_id', $trip->id))
                ->firstOrFail()->update(['price' => $amount]),
            'stay' => $trip->stays()->findOrFail($validated['id'])->update(['accommodation_cost' => $amount]),
            'transition' => StayTransition::where('trip_id', $trip->id)->findOrFail($validated['id'])->update(['cost' => $amount]),
        };

        return $this->summary($trip);
    }

    public function storeMember(Request $request, Trip $trip)
    {
        $validated = $request->validate(['name' => ['required', 'string', 'max:60']]);
        abort_if($trip->budgetMembers()->count() >= 30, 422, 'Trop de personnes sur ce voyage.');
        $trip->budgetMembers()->create(['name' => trim($validated['name'])]);

        return $this->summary($trip);
    }

    public function updateMember(Request $request, Trip $trip, TripBudgetMember $member)
    {
        abort_unless((int) $member->trip_id === (int) $trip->id && $member->isCustom(), 404);
        $member->update($request->validate(['name' => ['required', 'string', 'max:60']]));

        return $this->summary($trip);
    }

    public function destroyMember(Trip $trip, TripBudgetMember $member)
    {
        abort_unless((int) $member->trip_id === (int) $trip->id && $member->isCustom(), 404);
        abort_if(
            $member->paidExpenses()->exists() || $member->shares()->exists(),
            422,
            'Cette personne apparaît dans des dépenses : retirez-la d’abord de ces dépenses.'
        );
        $member->delete();

        return $this->summary($trip);
    }

    public function storeExpense(Request $request, Trip $trip)
    {
        $data = $this->validateExpense($request, $trip);

        DB::transaction(function () use ($trip, $data) {
            $expense = $trip->expenses()->create($data['expense']);
            $expense->shares()->createMany($data['shares']);
        });

        return $this->summary($trip);
    }

    public function updateExpense(Request $request, Trip $trip, TripExpense $expense)
    {
        abort_unless((int) $expense->trip_id === (int) $trip->id, 404);
        $data = $this->validateExpense($request, $trip);

        DB::transaction(function () use ($expense, $data) {
            $expense->update($data['expense']);
            $expense->shares()->delete();
            $expense->shares()->createMany($data['shares']);
        });

        return $this->summary($trip);
    }

    public function destroyExpense(Trip $trip, TripExpense $expense)
    {
        abort_unless((int) $expense->trip_id === (int) $trip->id, 404);
        $expense->delete();

        return $this->summary($trip);
    }

    /** Valide la dépense et calcule la part de chacun en centimes, pour que la somme tombe juste. */
    private function validateExpense(Request $request, Trip $trip): array
    {
        $memberIds = $trip->budgetMembers()->pluck('id')->all();

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:191'],
            'category' => ['required', Rule::in(TripExpense::CATEGORIES)],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
            'spent_on' => ['nullable', 'date'],
            'paid_by' => ['required', 'integer', Rule::in($memberIds)],
            'split_mode' => ['required', 'in:equal,amounts'],
            'shares' => ['required', 'array', 'min:1', 'max:30'],
            'shares.*.member_id' => ['required', 'integer', 'distinct', Rule::in($memberIds)],
            'shares.*.amount' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
        ], [
            'shares.required' => 'Choisissez au moins une personne concernée.',
        ]);

        $total = (int) round($validated['amount'] * 100);
        $shares = collect($validated['shares']);

        if ($validated['split_mode'] === 'equal') {
            $count = $shares->count();
            $base = intdiv($total, $count);
            $remainder = $total - $base * $count;
            $amounts = $shares->values()->map(fn ($share, $index) => $base + ($index < $remainder ? 1 : 0));
        } else {
            $amounts = $shares->map(fn ($share) => (int) round(((float) ($share['amount'] ?? 0)) * 100))->values();
            if ($amounts->sum() !== $total) {
                throw ValidationException::withMessages([
                    'shares' => 'La somme des parts (' . number_format($amounts->sum() / 100, 2, ',', ' ') . ' €) doit être égale au montant.',
                ]);
            }
        }

        return [
            'expense' => [
                'title' => $validated['title'],
                'category' => $validated['category'],
                'amount' => $total / 100,
                'split_mode' => $validated['split_mode'],
                'spent_on' => $validated['spent_on'] ?? null,
                'paid_by' => $validated['paid_by'],
            ],
            'shares' => $shares->values()->map(fn ($share, $index) => [
                'trip_budget_member_id' => $share['member_id'],
                'amount' => $amounts[$index] / 100,
            ])->filter(fn ($share) => $share['amount'] > 0 || $validated['split_mode'] === 'equal')->values()->all(),
        ];
    }

    private function summary(Trip $trip)
    {
        return response()->json((new TripBudget($trip->fresh()))->summary());
    }
}
