<?php

namespace App\Http\Controllers;

use App\Models\FlightCartItem;
use App\Models\Trip;
use App\Services\Flights\FlightPricing;
use App\Services\Flights\FlightProviderException;
use App\Services\Flights\Providers\DuffelProvider;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class FlightCartController extends Controller
{
    public function index(Request $request)
    {
        $items = FlightCartItem::with('trip:id,title')
            ->where('user_id', $request->user()->id)
            ->orderBy('trip_id')
            ->orderByRaw("CASE direction WHEN 'outbound' THEN 0 WHEN 'oneway' THEN 1 ELSE 2 END")
            ->get();

        $active = $items->reject->isExpired();
        $flightsAmount = round((float) $active->sum('flight_amount'), 2);
        $user = $request->user();
        [$givenName, $familyName] = array_pad(explode(' ', trim((string) $user->name), 2), 2, '');

        return Inertia::render('Flights/Cart', [
            'items' => $items->map(fn (FlightCartItem $item) => [
                'id' => $item->id,
                'direction' => $item->direction,
                'trip' => $item->trip ? ['id' => $item->trip->id, 'title' => $item->trip->title] : null,
                'offer' => $item->offer,
                'expires_at' => $item->expires_at?->toIso8601String(),
                'expired' => $item->isExpired(),
            ])->values(),
            'summary' => [
                'currency' => $active->first()?->currency ?? 'EUR',
                'passengers_count' => (int) ($active->first()?->passengers_count ?? 1),
                ...FlightPricing::breakdown($flightsAmount),
                'fee_label' => config('flights.tax_label'),
            ],
            'defaults' => [
                'given_name' => $givenName,
                'family_name' => $familyName,
                'email' => $user->email,
            ],
            'seller' => config('flights.seller'),
            'cancelled' => $request->boolean('cancelled'),
        ]);
    }

    public function store(Request $request, DuffelProvider $duffel)
    {
        $validated = $request->validate([
            'trip_id' => ['required', 'integer', 'exists:trips,id'],
            'items' => ['required', 'array', 'min:1', 'max:2'],
            'items.*.offer_id' => ['required', 'string', 'max:100', 'distinct'],
            'items.*.direction' => ['required', 'in:outbound,return,oneway'],
        ]);

        $trip = Trip::findOrFail($validated['trip_id']);
        Gate::authorize('view', $trip);
        $user = $request->user();

        $prepared = [];
        foreach ($validated['items'] as $item) {
            try {
                [$offer, $raw] = $duffel->refresh($item['offer_id']);
            } catch (FlightProviderException $exception) {
                throw ValidationException::withMessages(['cart' => $exception->getMessage()]);
            }

            if (!$offer) {
                throw ValidationException::withMessages(['cart' => 'Cette offre n’est plus disponible. Relancez la recherche.']);
            }

            $expiresAt = collect([
                now()->addMinutes((int) config('flights.cart_ttl_minutes', 30)),
                $offer['expires_at'] ? Carbon::parse($offer['expires_at']) : null,
            ])->filter()->min();

            $prepared[] = [
                'user_id' => $user->id,
                'trip_id' => $trip->id,
                'provider' => 'duffel',
                'offer_id' => $offer['id'],
                'direction' => $item['direction'],
                'passengers_count' => $offer['passengers_count'],
                'currency' => $offer['currency'],
                'flight_amount' => $offer['airline_amount'],
                'offer' => $offer,
                'raw_offer' => $raw,
                'expires_at' => $expiresAt,
            ];
        }

        // Le panier ne mélange ni les devises ni les nombres de passagers :
        // un seul paiement Stripe et une seule liste de passagers.
        $others = FlightCartItem::active()->where('user_id', $user->id)->where('trip_id', '!=', $trip->id)->get();
        $reference = $others->first() ?? (object) $prepared[0];
        foreach ($prepared as $item) {
            if ((int) $item['passengers_count'] !== (int) $reference->passengers_count) {
                throw ValidationException::withMessages(['cart' => "Votre panier contient déjà des vols pour {$reference->passengers_count} passager(s). Finalisez ou videz-le avant d’ajouter ces vols."]);
            }
            if ($item['currency'] !== $reference->currency) {
                throw ValidationException::withMessages(['cart' => 'Ces vols sont proposés dans une autre devise que ceux de votre panier. Finalisez ou videz votre panier d’abord.']);
            }
        }

        DB::transaction(function () use ($user, $trip, $prepared) {
            // Un nouveau choix de vols pour ce voyage remplace le précédent.
            FlightCartItem::where('user_id', $user->id)->where('trip_id', $trip->id)->delete();
            FlightCartItem::where('user_id', $user->id)->whereNotNull('expires_at')->where('expires_at', '<=', now())->delete();
            foreach ($prepared as $item) {
                FlightCartItem::create($item);
            }
        });

        return response()->json([
            'count' => FlightCartItem::active()->where('user_id', $user->id)->count(),
            'items' => collect($prepared)->map(fn ($item) => [
                'direction' => $item['direction'],
                'offer' => $item['offer'],
                'expires_at' => $item['expires_at']->toIso8601String(),
            ]),
        ]);
    }

    public function destroy(Request $request, FlightCartItem $item)
    {
        abort_unless((int) $item->user_id === (int) $request->user()->id, 404);
        $item->delete();

        return back()->with('status', 'Vol retiré du panier.');
    }

    public function clear(Request $request)
    {
        FlightCartItem::where('user_id', $request->user()->id)->delete();

        return back()->with('status', 'Panier vidé.');
    }
}
