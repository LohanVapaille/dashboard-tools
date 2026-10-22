<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Services\Flights\FlightProviderException;
use App\Services\Stays\Providers\DuffelStaysProvider;
use App\Services\Stays\Providers\OpenStreetMapStaysProvider;
use App\Services\Stays\StayPricing;
use App\Services\Stays\StaySearchQuery;
use App\Services\Stays\StayProviders;
use App\Services\Stays\StaySearchService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class StaySearchController extends Controller
{
    /** Offres réservables + liens partenaires (réponse rapide). */
    public function search(Request $request, Trip $trip, StaySearchService $search, StayProviders $providers)
    {
        Gate::authorize('view', $trip);

        return response()->json([
            ...$search->offers($this->query($request)),
            'types' => OpenStreetMapStaysProvider::TYPES,
            'boards' => DuffelStaysProvider::BOARDS,
            'pricing' => [
                'fee_percent' => StayPricing::percent(),
                'fee_label' => config('stays.commission_label'),
            ],
            'instant_booking' => $providers->anyEnabled(),
        ]);
    }

    /** Annuaire complet des hébergements (plus lent, mis en cache 24 h). */
    public function listings(Request $request, Trip $trip, StaySearchService $search)
    {
        Gate::authorize('view', $trip);

        try {
            return response()->json(['properties' => $search->listings($this->query($request))]);
        } catch (FlightProviderException $exception) {
            throw ValidationException::withMessages(['listings' => $exception->getMessage()]);
        }
    }

    private function query(Request $request): StaySearchQuery
    {
        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'place_name' => ['nullable', 'string', 'max:191'],
            'check_in' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'check_out' => ['required', 'date_format:Y-m-d', 'after:check_in'],
            'adults' => ['required', 'integer', 'min:1', 'max:' . config('stays.max_guests')],
            'rooms' => ['required', 'integer', 'min:1', 'max:' . config('stays.max_rooms'), 'lte:adults'],
            'radius_km' => ['nullable', 'integer', 'min:1', 'max:25'],
        ], [
            'check_in.after_or_equal' => 'La date d’arrivée ne peut pas être dans le passé.',
            'check_out.after' => 'La date de départ doit suivre la date d’arrivée.',
            'rooms.lte' => 'Il faut au moins un adulte par chambre.',
        ]);

        if (CarbonImmutable::parse($validated['check_in'])->diffInDays(CarbonImmutable::parse($validated['check_out'])) > 30) {
            throw ValidationException::withMessages(['check_out' => 'Un séjour en ligne est limité à 30 nuits.']);
        }

        return new StaySearchQuery(
            latitude: (float) $validated['latitude'],
            longitude: (float) $validated['longitude'],
            checkIn: $validated['check_in'],
            checkOut: $validated['check_out'],
            adults: (int) $validated['adults'],
            rooms: (int) $validated['rooms'],
            radiusKm: (int) ($validated['radius_km'] ?? config('stays.search_radius_km', 5)),
            placeName: (string) ($validated['place_name'] ?? ''),
        );
    }

    /** Chambres et tarifs d'un hébergement réservable (contexte de recherche en paramètres). */
    public function rates(Request $request, string $searchResultId, StayProviders $providers)
    {
        abort_unless(preg_match('/^(srr|lite)_[A-Za-z0-9_-]+$/', $searchResultId), 404);

        try {
            $context = $request->has('check_in') ? $this->query($request) : null;

            return response()->json($providers->forProperty($searchResultId)->rates($searchResultId, $context));
        } catch (FlightProviderException $exception) {
            throw ValidationException::withMessages(['rates' => $exception->getMessage()]);
        }
    }
}
