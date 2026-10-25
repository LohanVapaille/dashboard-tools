<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\StayTransition;
use Illuminate\Http\Request;

class StayTransitionController extends Controller
{
    public function store(Request $request, Trip $trip)
    {
        $validated = $request->validate([
            'from_stay_id' => 'required|exists:stays,id',
            'to_stay_id' => 'required|exists:stays,id',
            'transport_mode' => 'required|in:car,train,flight,bus,ferry',
            'duration_minutes' => 'nullable|integer',
            'cost' => 'nullable|numeric',
            'notes' => 'nullable|string',
            // Billet : tout ce qui concerne le vol, le train ou le bus.
            'reference' => 'nullable|string|max:60',
            'carrier' => 'nullable|string|max:80',
            'service_number' => 'nullable|string|max:30',
            'departure_at' => 'nullable|date',
            'arrival_at' => 'nullable|date|after_or_equal:departure_at',
            'departure_place' => 'nullable|string|max:120',
            'arrival_place' => 'nullable|string|max:120',
            'seat' => 'nullable|string|max:60',
            'baggage' => 'nullable|string|max:120',
            'booking_url' => 'nullable|url:http,https|max:2048',
            'distance_km' => 'nullable|integer|min:0',
        ]);

        $trip->transitions()->create($validated);

        return back();
    }

    public function update(Request $request, StayTransition $transition)
    {
        $validated = $request->validate([
            'transport_mode' => 'required|in:car,train,flight,bus,ferry',
            'duration_minutes' => 'nullable|integer',
            'cost' => 'nullable|numeric',
            'notes' => 'nullable|string',
            // Billet : tout ce qui concerne le vol, le train ou le bus.
            'reference' => 'nullable|string|max:60',
            'carrier' => 'nullable|string|max:80',
            'service_number' => 'nullable|string|max:30',
            'departure_at' => 'nullable|date',
            'arrival_at' => 'nullable|date|after_or_equal:departure_at',
            'departure_place' => 'nullable|string|max:120',
            'arrival_place' => 'nullable|string|max:120',
            'seat' => 'nullable|string|max:60',
            'baggage' => 'nullable|string|max:120',
            'booking_url' => 'nullable|url:http,https|max:2048',
            'distance_km' => 'nullable|integer|min:0',
        ]);

        $transition->update($validated);

        return back();
    }

    public function destroy(StayTransition $transition)
    {
        $transition->delete();
        return back();
    }
}