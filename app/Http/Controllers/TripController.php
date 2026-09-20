<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use Inertia\Inertia;
use Illuminate\Http\Request;

class TripController extends Controller
{
    public function index()
    {
        $trips = auth()->user()->trips()->with('stays')->get();
        return Inertia::render('Trips/Index', ['trips' => $trips]);
    }

    public function show(Trip $trip)
    {
        $trip->load(['stays.days.activities', 'transitions']);
        return Inertia::render('Trips/Show', ['trip' => $trip]);
    }
}