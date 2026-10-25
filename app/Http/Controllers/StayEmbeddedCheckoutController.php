<?php

namespace App\Http\Controllers;

use App\Mail\StayOrderConfirmation;
use App\Models\StayBooking;
use App\Models\StayOrder;
use App\Models\Trip;
use App\Services\Flights\FlightProviderException;
use App\Services\Stays\LiteApiClient;
use App\Services\Stays\StayProviders;
use App\Services\Stays\StaySearchQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Réservation d'hôtel sans quitter le site, payée dans le module Nuitée/LiteAPI intégré à la page.
 * Nuitée encaisse, rembourse et reverse la commission : le site n'encaisse rien.
 */
class StayEmbeddedCheckoutController extends Controller
{
    /** Bloque le tarif (prebook) et renvoie de quoi afficher le module de paiement Nuitée. */
    public function start(Request $request, StayProviders $providers, LiteApiClient $client)
    {
        abort_unless($providers->checkoutMode() === 'embedded', 403, 'La réservation intégrée n’est pas activée.');

        $validated = $request->validate([
            'trip_id' => ['required', 'integer', 'exists:trips,id'],
            'search_result_id' => ['required', 'string', 'max:120', 'regex:/^lite_[A-Za-z0-9_-]+$/'],
            'rate_id' => ['required', 'string', 'max:120'],
            'context' => ['required', 'array'],
            'context.latitude' => ['required', 'numeric', 'between:-90,90'],
            'context.longitude' => ['required', 'numeric', 'between:-180,180'],
            'context.check_in' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'context.check_out' => ['required', 'date_format:Y-m-d', 'after:context.check_in'],
            'context.adults' => ['required', 'integer', 'min:1', 'max:' . config('stays.max_guests')],
            'context.rooms' => ['required', 'integer', 'min:1', 'max:' . config('stays.max_rooms')],
            'holder.first_name' => ['required', 'string', 'max:60'],
            'holder.last_name' => ['required', 'string', 'max:60'],
            'holder.email' => ['required', 'email', 'max:191'],
            'holder.phone' => ['nullable', 'string', 'max:40'],
            'special_requests' => ['nullable', 'string', 'max:500'],
            'accept_terms' => ['accepted'],
        ]);

        $trip = Trip::findOrFail($validated['trip_id']);
        Gate::authorize('view', $trip);
        $context = $validated['context'];
        $query = new StaySearchQuery(
            (float) $context['latitude'], (float) $context['longitude'], $context['check_in'], $context['check_out'],
            (int) $context['adults'], (int) $context['rooms'],
        );

        try {
            $provider = $providers->forProperty($validated['search_result_id']);
            $shown = Cache::get(StaySearchController::rateCacheKey($validated['search_result_id'], $validated['rate_id']));
            if ($shown) {
                [$property, $room, $rate] = [$shown['property'], $shown['room'], $shown['rate']];
            } else {
                $details = $provider->rates($validated['search_result_id'], $query);
                $property = $details['property'];
                $room = collect($details['rooms'])->first(fn ($room) => collect($room['rates'])->contains('id', $validated['rate_id']));
                $rate = $room ? collect($room['rates'])->firstWhere('id', $validated['rate_id']) : null;
            }
            if (!$rate) {
                throw new FlightProviderException('Cette chambre n’est plus disponible. Choisissez une autre offre.');
            }
            $prebook = $client->prebook($rate['offer_id'], true);
        } catch (FlightProviderException $exception) {
            throw ValidationException::withMessages(['checkout' => $exception->getMessage()]);
        }

        if (empty($prebook['secretKey']) || empty($prebook['transactionId']) || empty($prebook['prebookId'])) {
            throw ValidationException::withMessages(['checkout' => 'Le paiement sécurisé n’a pas pu être préparé. Réessayez dans un instant.']);
        }

        $amount = round((float) ($prebook['price'] ?? $rate['total_amount']), 2);
        $currency = strtoupper($prebook['currency'] ?? $rate['currency']);
        $holder = $validated['holder'];

        $order = DB::transaction(function () use ($request, $trip, $validated, $holder, $prebook, $amount, $currency, $property, $room, $rate, $query) {
            $order = StayOrder::create([
                'user_id' => $request->user()->id,
                'status' => 'payment_pending',
                'payment_method' => 'liteapi_sdk',
                'provider_transaction_id' => $prebook['transactionId'],
                'currency' => $currency,
                'stays_amount' => $amount,
                'fee_percent' => 0,
                'fee_amount' => 0,
                'total_amount' => $amount,
                'guests' => [['given_name' => $holder['first_name'], 'family_name' => $holder['last_name']]],
                'contact_email' => $holder['email'],
                'contact_phone' => (string) ($holder['phone'] ?? ''),
                'special_requests' => $validated['special_requests'] ?? null,
                'terms_accepted_at' => now(),
            ]);

            $order->bookings()->create([
                'user_id' => $order->user_id,
                'trip_id' => $trip->id,
                'provider' => 'liteapi',
                'rate_id' => $rate['id'],
                'quote_id' => $prebook['prebookId'],
                'status' => 'pending',
                'check_in' => $query->checkIn,
                'check_out' => $query->checkOut,
                'guests' => $query->adults,
                'rooms' => $query->rooms,
                'currency' => $currency,
                'stay_amount' => $amount,
                'fee_amount' => 0,
                'total_amount' => $amount,
                'property' => collect($property)->except(['price', 'links'])->all(),
                'room' => collect($room)->except('rates')->all(),
                'rate' => $rate,
            ]);

            return $order;
        });

        return response()->json([
            'reference' => $order->reference,
            'amount' => $amount,
            'currency' => $currency,
            'price_changed' => abs($amount - (float) $rate['total_amount']) >= 0.01,
            'payment' => [
                'public_key' => $client->sandbox() ? 'sandbox' : 'live',
                'secret_key' => $prebook['secretKey'],
                'return_url' => route('stays.embedded.complete', $order),
            ],
        ]);
    }

    /** Retour du module de paiement : le paiement est accepté, on confirme la réservation auprès de l'hôtel. */
    public function complete(Request $request, StayOrder $order, StayProviders $providers)
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id && $order->payment_method === 'liteapi_sdk', 404);

        // Un seul passage confirme la réservation, même si la page est rechargée.
        $claimed = StayOrder::whereKey($order->id)->where('status', 'payment_pending')->update(['status' => 'processing']);

        if ($claimed) {
            $order->refresh()->load('bookings');
            /** @var StayBooking $booking */
            $booking = $order->bookings->first();

            try {
                $result = $providers->forKey('liteapi')->book($booking, $order);
                $booking->update([
                    'provider_booking_id' => $result['id'],
                    'reference' => $result['reference'],
                    'status' => $result['confirmed'] ? 'confirmed' : 'failed',
                ]);
                $order->update(['status' => $result['confirmed'] ? 'confirmed' : 'failed', 'paid_at' => $result['confirmed'] ? now() : null]);
            } catch (FlightProviderException $exception) {
                Log::warning('Embedded stay booking failed', ['order' => $order->reference, 'error' => $exception->getMessage()]);
                $booking->update(['status' => 'failed', 'failure_reason' => $exception->getMessage()]);
                $order->update([
                    'status' => 'failed',
                    'failure_reason' => 'L’hôtel n’a pas confirmé la réservation. Aucun montant n’est prélevé : l’autorisation bancaire est levée sous 1 à 2 jours ouvrés.',
                ]);
            }

            if ($order->status === 'confirmed') {
                rescue(fn () => $this->rememberInTrip($order, $booking->fresh()), report: true);
                rescue(fn () => Mail::to($order->contact_email)->send(new StayOrderConfirmation($order->fresh('bookings'))), report: true);
            }
        }

        return redirect()->route('stays.orders.show', $order)->with('status', match ($order->fresh()->status) {
            'confirmed' => 'Réservation confirmée ! Votre hébergement est enregistré dans votre voyage.',
            'processing' => 'Confirmation en cours auprès de l’hôtel…',
            default => 'La réservation n’a pas pu être confirmée par l’hôtel. Aucun montant ne vous sera prélevé.',
        });
    }

    /** Range la réservation confirmée dans l'onglet Logements du voyage. */
    private function rememberInTrip(StayOrder $order, StayBooking $booking): void
    {
        if (!$booking->trip_id) {
            return;
        }

        $property = $booking->property;
        $booking->trip?->reservations()->create([
            'user_id' => $order->user_id,
            'kind' => 'stay',
            'title' => $property['name'] ?? 'Hébergement',
            'provider' => 'Nuitée · réservé sur ' . config('app.name'),
            'reference' => $booking->reference ?: $booking->provider_booking_id,
            'starts_at' => $booking->check_in->format('Y-m-d') . ' ' . ($property['check_in'] ?? '15:00'),
            'ends_at' => $booking->check_out->format('Y-m-d') . ' ' . ($property['check_out'] ?? '11:00'),
            'address' => $property['address'] ?? $property['city'] ?? null,
            'travelers' => $booking->guests,
            'price' => (float) $booking->total_amount,
            'currency' => $booking->currency,
            'url' => route('stays.orders.show', $order),
            'details' => ['stay_order' => $order->reference, 'stay_booking_id' => $booking->id, 'receipt' => true, 'locked' => true],
        ]);
    }
}
