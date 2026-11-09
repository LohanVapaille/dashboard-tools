<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\Stay;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StayController extends Controller
{
    public function store(Request $request, Trip $trip)
    {
        $validated = $request->validate([
            'location_name' => 'required|string|max:191',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'arrival_date' => 'required|date',
            'departure_date' => 'required|date|after_or_equal:arrival_date',
            'notes' => 'nullable|string',
        ]);

        // 1. Enregistre le séjour
        $stay = $trip->stays()->create($validated);

        // 2. Génère automatiquement les jours entre arrival_date et departure_date avec leur day_number
        $start = Carbon::parse($stay->arrival_date);
        $end = Carbon::parse($stay->departure_date);
        $dayNumber = 1;

        while ($start->lte($end)) {
            $stay->days()->create([
                'date' => $start->toDateString(),
                'day_number' => $dayNumber,
            ]);
            $start->addDay();
            $dayNumber++;
        }

        return back();
    }

    public function update(Request $request, Stay $stay)
    {
        $validated = $request->validate([
            'location_name' => 'required|string|max:191',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'arrival_date' => 'required|date',
            'departure_date' => 'required|date|after_or_equal:arrival_date',
            'notes' => 'nullable|string',
        ]);

        // 1. Mise à jour des informations du séjour
        $stay->update($validated);

        // 2. Synchronisation des jours si les dates ont changé
        $start = Carbon::parse($stay->arrival_date);
        $end = Carbon::parse($stay->departure_date);

        // Récupération des dates souhaitées
        $targetDates = [];
        $current = $start->copy();
        while ($current->lte($end)) {
            $targetDates[] = $current->toDateString();
            $current->addDay();
        }

        // Suppression des jours qui ne rentrent plus dans l'intervalle
        $stay->days()->whereNotIn('date', $targetDates)->delete();

        // Création des nouveaux jours absents
        $existingDates = $stay->days()->pluck('date')->toArray();

        foreach ($targetDates as $date) {
            if (!in_array($date, $existingDates)) {
                $stay->days()->create([
                    'date' => $date,
                    'day_number' => 0, // Temporaire avant réordonnancement
                ]);
            }
        }

        // 3. Réindexation propre des numéro de jours (day_number)
        $days = $stay->days()->orderBy('date', 'asc')->get();
        foreach ($days as $index => $day) {
            $day->update(['day_number' => $index + 1]);
        }

        return back();
    }

    /**
     * Réorganise les étapes : elles s'enchaînent dans le nouvel ordre à partir de la première date
     * du voyage, chacune garde son nombre de nuits et ses journées (activités comprises) suivent.
     * Les trajets qui ne relient plus deux étapes consécutives sont supprimés.
     */
    public function reorder(Request $request, Trip $trip)
    {
        $stays = $trip->stays()->orderBy('arrival_date')->orderBy('departure_date')->get();

        $validated = $request->validate([
            'stays' => ['required', 'array', 'size:' . $stays->count()],
            'stays.*' => ['required', 'integer', 'distinct'],
        ]);

        $order = array_map('intval', $validated['stays']);
        abort_unless(
            collect($order)->sort()->values()->all() === $stays->pluck('id')->sort()->values()->all(),
            422,
            'La liste des étapes ne correspond pas au voyage.'
        );

        $byId = $stays->keyBy('id');
        $cursor = Carbon::parse($stays->first()->arrival_date)->startOfDay();

        DB::transaction(function () use ($trip, $order, $byId, &$cursor) {
            foreach ($order as $id) {
                $stay = $byId[$id];
                $arrival = Carbon::parse($stay->arrival_date)->startOfDay();
                $nights = (int) $arrival->diffInDays(Carbon::parse($stay->departure_date)->startOfDay());
                $offset = (int) $arrival->diffInDays($cursor, false);

                if ($offset !== 0) {
                    foreach ($stay->days()->get() as $day) {
                        $day->update(['date' => Carbon::parse($day->date)->addDays($offset)->toDateString()]);
                    }
                    $stay->update([
                        'arrival_date' => $cursor->toDateString(),
                        'departure_date' => $cursor->copy()->addDays($nights)->toDateString(),
                    ]);
                }

                $cursor = $cursor->copy()->addDays($nights);
            }

            $pairs = collect($order)->sliding(2)->map(fn ($pair) => $pair->values()->implode('-'))->all();
            $trip->transitions()->get()
                ->reject(fn ($transition) => in_array("{$transition->from_stay_id}-{$transition->to_stay_id}", $pairs, true))
                ->each->delete();
        });

        return back();
    }

    public function destroy(Stay $stay)
    {
        // Les jours, activités et trajets liés sont supprimés en cascade.
        $stay->delete();

        return back();
    }
}
