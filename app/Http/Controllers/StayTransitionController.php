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
            'transport_mode' => 'required|string',
            'duration_minutes' => 'nullable|integer',
            'cost' => 'nullable|numeric',
            'notes' => 'nullable|string',
        ]);

        $trip->transitions()->create($validated);

        return back();
    }

    public function update(Request $request, StayTransition $transition)
    {
        $validated = $request->validate([
            'transport_mode' => 'required|string',
            'duration_minutes' => 'nullable|integer',
            'cost' => 'nullable|numeric',
            'notes' => 'nullable|string',
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