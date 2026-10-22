<?php

namespace App\Services\Budget;

use App\Models\FlightBooking;
use App\Models\StayBooking;
use App\Models\Trip;
use App\Models\TripBudgetMember;
use App\Models\TripExpense;
use Illuminate\Support\Carbon;

/**
 * Budget d'un voyage : le prévisionnel calculé depuis l'itinéraire (activités, logements, trajets,
 * réservations) et les dépenses partagées entre voyageurs, avec les remboursements à faire.
 */
class TripBudget
{
    public function __construct(private Trip $trip)
    {
    }

    public function summary(): array
    {
        $this->syncMembers();
        $this->trip->load([
            'stays.days.activities',
            'transitions.fromStay:id,location_name',
            'transitions.toStay:id,location_name',
            'budgetMembers',
            'expenses.shares',
        ]);

        $planned = $this->planned();
        $members = $this->trip->budgetMembers;
        $balances = $this->balances();

        return [
            'currency' => 'EUR',
            'travelers' => $this->travelers(),
            'target' => $this->trip->budget_target === null ? null : (float) $this->trip->budget_target,
            'planned' => $planned,
            'planned_total' => round(array_sum(array_column($planned, 'amount')), 2),
            'spent_total' => round($this->trip->expenses->sum(fn ($expense) => (float) $expense->amount), 2),
            'members' => $members->map(fn (TripBudgetMember $member) => [
                'id' => $member->id,
                'name' => $member->name,
                'custom' => $member->isCustom(),
                'removable' => $member->isCustom() && !$this->isUsed($member),
                'balance' => $balances[$member->id] ?? 0.0,
                'paid' => round($this->trip->expenses->where('paid_by', $member->id)->sum(fn ($expense) => (float) $expense->amount), 2),
            ])->values()->all(),
            'expenses' => $this->trip->expenses->map(fn (TripExpense $expense) => [
                'id' => $expense->id,
                'title' => $expense->title,
                'category' => $expense->category,
                'amount' => (float) $expense->amount,
                'split_mode' => $expense->split_mode,
                'spent_on' => $expense->spent_on?->toDateString(),
                'paid_by' => $expense->paid_by,
                'shares' => $expense->shares->map(fn ($share) => [
                    'member_id' => $share->trip_budget_member_id,
                    'amount' => (float) $share->amount,
                ])->values()->all(),
            ])->values()->all(),
            'settlements' => $this->settlements($balances),
        ];
    }

    /** Lignes du prévisionnel : les activités sont saisies par personne, le reste pour tout le groupe. */
    private function planned(): array
    {
        $travelers = $this->travelers();
        $lines = [];

        foreach ($this->trip->stays as $stay) {
            $city = trim(explode(',', $stay->location_name)[0]);

            $lines[] = [
                'key' => 'stay-' . $stay->id,
                'type' => 'stay',
                'id' => $stay->id,
                'group' => 'logement',
                'label' => 'Logement à ' . $city,
                'detail' => Carbon::parse($stay->arrival_date)->diffInDays(Carbon::parse($stay->departure_date)) . ' nuit(s)',
                'date' => Carbon::parse($stay->arrival_date)->toDateString(),
                'unit_price' => $stay->accommodation_cost === null ? null : (float) $stay->accommodation_cost,
                'per_person' => false,
                'amount' => (float) ($stay->accommodation_cost ?? 0),
                'editable' => true,
            ];

            foreach ($stay->days as $day) {
                foreach ($day->activities as $activity) {
                    $price = $activity->price === null ? null : (float) $activity->price;
                    $lines[] = [
                        'key' => 'activity-' . $activity->id,
                        'type' => 'activity',
                        'id' => $activity->id,
                        'group' => $activity->category === 'repas' ? 'repas' : 'activites',
                        'label' => $activity->title,
                        'detail' => $city,
                        'date' => Carbon::parse($day->date)->toDateString(),
                        'unit_price' => $price,
                        'per_person' => true,
                        'amount' => round(($price ?? 0) * $travelers, 2),
                        'editable' => true,
                    ];
                }
            }
        }

        foreach ($this->trip->transitions as $transition) {
            $from = trim(explode(',', $transition->fromStay?->location_name ?? '')[0]);
            $to = trim(explode(',', $transition->toStay?->location_name ?? '')[0]);
            $lines[] = [
                'key' => 'transition-' . $transition->id,
                'type' => 'transition',
                'id' => $transition->id,
                'group' => 'transport',
                'label' => 'Trajet ' . $from . ' → ' . $to,
                'detail' => $transition->transport_mode,
                'date' => null,
                'unit_price' => $transition->cost === null ? null : (float) $transition->cost,
                'per_person' => false,
                'amount' => (float) ($transition->cost ?? 0),
                'editable' => true,
            ];
        }

        // Réservations payées dans l'application : montants réels, non modifiables ici.
        FlightBooking::where('trip_id', $this->trip->id)->whereIn('status', ['ticketed', 'simulated'])->get()
            ->each(function (FlightBooking $booking) use (&$lines) {
                $lines[] = [
                    'key' => 'flight-' . $booking->id,
                    'type' => 'booking',
                    'id' => $booking->id,
                    'group' => 'transport',
                    'label' => 'Vol ' . ($booking->direction === 'return' ? 'retour' : 'aller') . ($booking->booking_reference ? ' · ' . $booking->booking_reference : ''),
                    'detail' => 'Réservé',
                    'date' => null,
                    'unit_price' => (float) $booking->total_amount,
                    'per_person' => false,
                    'amount' => (float) $booking->total_amount,
                    'editable' => false,
                ];
            });

        StayBooking::where('trip_id', $this->trip->id)->where('status', 'confirmed')->get()
            ->each(function (StayBooking $booking) use (&$lines) {
                $lines[] = [
                    'key' => 'stay-booking-' . $booking->id,
                    'type' => 'booking',
                    'id' => $booking->id,
                    'group' => 'logement',
                    'label' => $booking->property['name'] ?? 'Hébergement réservé',
                    'detail' => 'Réservé',
                    'date' => $booking->check_in?->toDateString(),
                    'unit_price' => (float) $booking->total_amount,
                    'per_person' => false,
                    'amount' => (float) $booking->total_amount,
                    'editable' => false,
                ];
            });

        return $lines;
    }

    /** Solde de chacun : ce qu'il a payé moins sa part (positif = on lui doit de l'argent). */
    private function balances(): array
    {
        $cents = $this->trip->budgetMembers->mapWithKeys(fn ($member) => [$member->id => 0])->all();

        foreach ($this->trip->expenses as $expense) {
            $cents[$expense->paid_by] = ($cents[$expense->paid_by] ?? 0) + $this->cents($expense->amount);
            foreach ($expense->shares as $share) {
                $cents[$share->trip_budget_member_id] = ($cents[$share->trip_budget_member_id] ?? 0) - $this->cents($share->amount);
            }
        }

        return array_map(fn ($value) => $value / 100, $cents);
    }

    /** Remboursements minimaux : le plus gros débiteur rembourse le plus gros créancier, et ainsi de suite. */
    private function settlements(array $balances): array
    {
        $debtors = [];
        $creditors = [];
        foreach ($balances as $memberId => $balance) {
            $value = (int) round($balance * 100);
            if ($value < 0) {
                $debtors[$memberId] = -$value;
            } elseif ($value > 0) {
                $creditors[$memberId] = $value;
            }
        }

        $transfers = [];
        while ($debtors && $creditors) {
            arsort($debtors);
            arsort($creditors);
            $from = array_key_first($debtors);
            $to = array_key_first($creditors);
            $amount = min($debtors[$from], $creditors[$to]);

            $transfers[] = ['from' => $from, 'to' => $to, 'amount' => $amount / 100];

            $debtors[$from] -= $amount;
            $creditors[$to] -= $amount;
            if ($debtors[$from] === 0) {
                unset($debtors[$from]);
            }
            if ($creditors[$to] === 0) {
                unset($creditors[$to]);
            }
        }

        return $transfers;
    }

    /** Le propriétaire et les participants acceptés font automatiquement partie des comptes. */
    public function syncMembers(): void
    {
        $this->trip->loadMissing(['user:id,name', 'participants.user:id,name']);

        $people = collect();
        if ($this->trip->user_id) {
            $people->push(['user_id' => $this->trip->user_id, 'guest_token' => null, 'name' => $this->trip->user?->name ?? 'Organisateur']);
        } elseif ($this->trip->guest_token) {
            $people->push(['user_id' => null, 'guest_token' => $this->trip->guest_token, 'name' => 'Organisateur']);
        }

        foreach ($this->trip->participants->where('status', 'accepted') as $participant) {
            if (!$participant->user_id && !$participant->guest_token) {
                continue;
            }
            $people->push([
                'user_id' => $participant->user_id,
                'guest_token' => $participant->user_id ? null : $participant->guest_token,
                'name' => $participant->user?->name ?? $participant->guest_name ?? $participant->email ?? 'Invité',
            ]);
        }

        foreach ($people as $person) {
            $key = $person['user_id'] ? ['user_id' => $person['user_id']] : ['guest_token' => $person['guest_token']];
            $member = TripBudgetMember::firstOrNew(['trip_id' => $this->trip->id, ...$key]);
            $member->name = mb_substr($person['name'], 0, 60);
            if ($member->isDirty()) {
                $member->save();
            }
        }
    }

    private function isUsed(TripBudgetMember $member): bool
    {
        return $this->trip->expenses->contains(fn ($expense) => (int) $expense->paid_by === (int) $member->id
            || $expense->shares->contains('trip_budget_member_id', $member->id));
    }

    private function travelers(): int
    {
        return max(1, (int) ($this->trip->travelers ?: 1));
    }

    private function cents($amount): int
    {
        return (int) round(((float) $amount) * 100);
    }
}
