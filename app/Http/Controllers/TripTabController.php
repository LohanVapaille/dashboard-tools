<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class TripTabController extends Controller
{
    use AuthorizesRequests;

    public function update(Request $request, Trip $trip)
    {
        $this->authorize('update', $trip);
        $validated = $request->validate([
            'visible_tabs' => ['required', 'array', 'min:1'],
            'visible_tabs.*' => ['string', 'in:program,transport,stays,budget,photos'],
        ]);

        if (!in_array('program', $validated['visible_tabs'], true)) {
            return response()->json(['message' => 'Le programme doit rester visible.'], 422);
        }

        $trip->update(['visible_tabs' => array_values(array_unique($validated['visible_tabs']))]);
        return response()->json(['visible_tabs' => $trip->visible_tabs]);
    }
}
