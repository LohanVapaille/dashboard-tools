<?php

namespace App\Http\Controllers;

use App\Models\FlightCartItem;
use App\Models\Trip;
use App\Services\Flights\FlightProviderException;
use App\Services\Flights\Providers\DuffelProvider;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class FlightCartController extends Controller
{
    public function store(Request $request, DuffelProvider $duffel)
    {
        $validated = $request->validate([
            'trip_id' => ['required', 'integer', 'exists:trips,id'],
            'items' => ['required', 'array', 'min:1', 'max:2'],
            'items.*.offer_id' => ['required', 'string', 'max:100', 'distinct'],
            'items.*.direction' => ['required', 'in:outbound,return,oneway'],
            'items.*.services' => ['nullable', 'array', 'max:40'],
            'items.*.services.*.id' => ['required', 'string', 'max:100'],
            'items.*.services.*.quantity' => ['required', 'integer', 'min:1', 'max:9'],
        ]);

        $trip = Trip::findOrFail($validated['trip_id']);
        Gate::authorize('view', $trip);
        $user = $request->user();

        $prepared = [];
        foreach ($validated['items'] as $item) {
            try {
                [$offer, $raw] = $duffel->refresh($item['offer_id'], !empty($item['services']));
                if (!$offer) {
                    throw new FlightProviderException('Cette offre n’est plus disponible. Relancez la recherche.');
                }
                [$services, $servicesAmount] = DuffelProvider::resolveServices($raw, $item['services'] ?? []);
            } catch (FlightProviderException $exception) {
                throw ValidationException::withMessages(['cart' => $exception->getMessage()]);
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
                // Montant versé à la compagnie : billet + bagages choisis.
                'flight_amount' => round($offer['airline_amount'] + $servicesAmount, 2),
                'services' => $services,
                'services_amount' => $servicesAmount,
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

    /** Bagages achetables pour une offre (prix taxes et frais inclus). */
    public function baggage(string $offerId, DuffelProvider $duffel)
    {
        abort_unless(preg_match('/^off_[A-Za-z0-9]+$/', $offerId), 404);

        try {
            [$offer, $raw] = $duffel->refresh($offerId, true);
        } catch (FlightProviderException $exception) {
            throw ValidationException::withMessages(['baggage' => $exception->getMessage()]);
        }

        return response()->json([
            'included' => $offer['baggage'] ?? null,
            'passengers_count' => $offer['passengers_count'] ?? 1,
            'options' => DuffelProvider::baggageOptions($raw),
        ]);
    }

    public function destroy(Request $request, FlightCartItem $item)
    {
        abort_unless((int) $item->user_id === (int) $request->user()->id, 404);
        $item->delete();

        return back()->with('status', 'Vol retiré du panier.');
    }
}
