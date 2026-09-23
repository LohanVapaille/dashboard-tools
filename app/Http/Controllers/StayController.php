<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\Stay;
use Illuminate\Http\Request;
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
}