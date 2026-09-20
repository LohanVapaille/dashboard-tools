<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TripController extends Controller
{
    public function index()
    {
        $trips = Trip::withCount('stays')->orderBy('start_date', 'desc')->get();

        return Inertia::render('Trips/Index', [
            'trips' => $trips,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:191',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        Trip::create($validated);

        return redirect()->route('trips.index');
    }

    public function show(Trip $trip)
    {
        $trip->load(['stays.days.activities', 'transitions']);

        return Inertia::render('Trips/Show', [
            'trip' => $trip,
        ]);
    }

    public function update(Request $request, Trip $trip)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:191',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $trip->update($validated);

        return back();
    }

    public function destroy(Trip $trip)
    {
        $trip->delete();

        return redirect()->route('trips.index');
    }
}