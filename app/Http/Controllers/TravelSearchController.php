<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Services\Flights\AirportDirectory;
use App\Services\Flights\FlightPricing;
use App\Services\Flights\FlightProviderException;
use App\Services\Flights\FlightSearchQuery;
use App\Services\Flights\FlightSearchService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class TravelSearchController extends Controller
{
    public function airports(Request $request, AirportDirectory $directory)
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'codes' => ['nullable', 'string', 'max:200'],
        ]);

        if (!empty($validated['codes'])) {
            $airports = collect(explode(',', $validated['codes']))
                ->map(fn ($code) => $directory->find(trim($code)))
                ->filter()
                ->values();

            return response()->json(['airports' => $airports]);
        }

        return response()->json(['airports' => $directory->search($validated['q'] ?? '')]);
    }

    public function nearestAirports(Request $request, AirportDirectory $directory)
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        return response()->json([
            'airports' => $directory->nearest((float) $validated['lat'], (float) $validated['lng']),
        ]);
    }

    public function flights(Request $request, Trip $trip, FlightSearchService $search)
    {
        Gate::authorize('view', $trip);

        $validated = $request->validate([
            'origin' => ['required', 'string', 'size:3', 'alpha'],
            'destination' => ['required', 'string', 'size:3', 'alpha', 'different:origin'],
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'passengers' => ['required', 'integer', 'min:1', 'max:' . config('flights.max_passengers')],
            'cabin' => ['nullable', 'in:economy,premium_economy,business,first'],
            'max_stops' => ['nullable', 'integer', 'in:0,1,2'],
        ], [
            'destination.different' => 'Les aéroports de départ et d’arrivée doivent être différents.',
            'date.after_or_equal' => 'La date du vol ne peut pas être dans le passé.',
        ]);

        try {
            $result = $search->search(new FlightSearchQuery(
                origin: strtoupper($validated['origin']),
                destination: strtoupper($validated['destination']),
                date: $validated['date'],
                passengers: (int) $validated['passengers'],
                cabin: $validated['cabin'] ?? 'economy',
                maxStops: isset($validated['max_stops']) ? (int) $validated['max_stops'] : null,
            ));
        } catch (FlightProviderException $exception) {
            throw ValidationException::withMessages(['search' => $exception->getMessage()]);
        }

        return response()->json([
            ...$result,
            'pricing' => [
                'fee_percent' => FlightPricing::percent(),
                'fee_label' => config('flights.tax_label'),
            ],
        ]);
    }
}
