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

    public function destroy(Stay $stay)
    {
        $stay->delete();

        return back();
    }
}