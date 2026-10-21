<?php

namespace App\Http\Controllers;

use App\Models\FlightBooking;
use App\Models\FlightCartItem;
use App\Models\FlightOrder;
use App\Services\Flights\DuffelClient;
use App\Services\Flights\FlightOrderProcessor;
use App\Services\Flights\FlightPricing;
use App\Services\Flights\FlightProviderException;
use App\Services\Flights\Providers\DuffelProvider;
use App\Services\Payments\StripeClient;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FlightCheckoutController extends Controller
{
    public function store(Request $request, DuffelProvider $duffel, StripeClient $stripe, DuffelClient $duffelClient)
    {
        $user = $request->user();
        $items = FlightCartItem::where('user_id', $user->id)->get();

        if ($items->isEmpty()) {
            throw ValidationException::withMessages(['checkout' => 'Votre panier est vide.']);
        }
        if ($items->contains->isExpired()) {
            throw ValidationException::withMessages(['checkout' => 'Certains tarifs ont expiré. Retirez-les du panier et relancez la recherche pour obtenir un prix à jour.']);
        }
        if (!$stripe->configured()) {
            throw ValidationException::withMessages(['checkout' => 'Le paiement en ligne n’est pas encore configuré (STRIPE_SECRET manquante).']);
        }
        // Jamais de vrai débit si les billets ne seraient pas réellement émis.
        if (str_starts_with((string) config('services.stripe.secret'), 'sk_live_') && !$duffelClient->bookingEnabled()) {
            throw ValidationException::withMessages(['checkout' => 'La vente de billets n’est pas encore ouverte. Aucun montant n’a été débité.']);
        }

        $passengersCount = (int) $items->first()->passengers_count;
        $request->merge(['contact_phone' => self::normalizePhone((string) $request->input('contact_phone'))]);
        $validated = $request->validate([
            'passengers' => ['required', 'array', 'size:' . $passengersCount],
            'passengers.*.title' => ['required', 'in:mr,ms,mrs,miss'],
            'passengers.*.gender' => ['required', 'in:m,f'],
            'passengers.*.given_name' => ['required', 'string', 'max:50', "regex:/^[\\pL][\\pL '\\-]*$/u"],
            'passengers.*.family_name' => ['required', 'string', 'max:50', "regex:/^[\\pL][\\pL '\\-]*$/u"],
            'passengers.*.born_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:' . now()->subYears(18)->toDateString(), 'after:1900-01-01'],
            'contact_email' => ['required', 'email', 'max:255'],
            'contact_phone' => ['required', 'regex:/^\+[1-9]\d{6,14}$/'],
            'accept_terms' => ['accepted'],
        ], [
            'passengers.size' => "Renseignez les {$passengersCount} passager(s).",
            'passengers.*.given_name.regex' => 'Le prénom ne doit contenir que des lettres, espaces, tirets ou apostrophes.',
            'passengers.*.family_name.regex' => 'Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes.',
            'passengers.*.born_on.before_or_equal' => 'La réservation en ligne est réservée aux passagers majeurs.',
            'contact_phone.regex' => 'Indiquez un numéro au format international, par exemple +33 6 12 34 56 78.',
            'accept_terms.accepted' => 'Vous devez accepter les conditions de vente et les règles tarifaires.',
        ]);

        // Prix garanti : on recharge chaque offre auprès de la compagnie avant de facturer.
        $changed = [];
        foreach ($items as $item) {
            try {
                [$offer, $raw] = $duffel->refresh($item->offer_id);
            } catch (FlightProviderException $exception) {
                throw ValidationException::withMessages(['checkout' => $exception->getMessage() . ' Retirez ce vol du panier.']);
            }
            if (!$offer) {
                throw ValidationException::withMessages(['checkout' => 'Un des vols n’est plus disponible. Retirez-le du panier et relancez la recherche.']);
            }
            if (abs((float) $offer['airline_amount'] - (float) $item->flight_amount) >= 0.01) {
                $changed[] = $item->id;
                $item->update(['offer' => $offer, 'raw_offer' => $raw, 'flight_amount' => $offer['airline_amount']]);
                continue;
            }
            $item->update(['offer' => $offer, 'raw_offer' => $raw]);
        }

        if ($changed) {
            return response()->json([
                'price_changed' => true,
                'message' => 'La compagnie a modifié le tarif d’un vol depuis son ajout au panier. Vérifiez le nouveau total avant de payer.',
            ], 409);
        }

        $order = DB::transaction(function () use ($user, $items, $validated) {
            $flightsAmount = round((float) $items->sum('flight_amount'), 2);
            $feeTotal = round($items->sum(fn ($item) => FlightPricing::fee((float) $item->flight_amount)), 2);

            $order = FlightOrder::create([
                'user_id' => $user->id,
                'status' => 'payment_pending',
                'currency' => $items->first()->currency,
                'flights_amount' => $flightsAmount,
                'fee_percent' => FlightPricing::percent(),
                'fee_amount' => $feeTotal,
                'total_amount' => round($flightsAmount + $feeTotal, 2),
                'passengers' => $validated['passengers'],
                'contact_email' => $validated['contact_email'],
                'contact_phone' => $validated['contact_phone'],
                'terms_accepted_at' => now(),
            ]);

            foreach ($items as $item) {
                $fee = FlightPricing::fee((float) $item->flight_amount);
                FlightBooking::create([
                    'user_id' => $user->id,
                    'trip_id' => $item->trip_id,
                    'flight_order_id' => $order->id,
                    'direction' => $item->direction,
                    'duffel_offer_id' => $item->offer_id,
                    'status' => 'pending',
                    'currency' => $item->currency,
                    'flight_amount' => $item->flight_amount,
                    'service_fee' => $fee,
                    'total_amount' => round((float) $item->flight_amount + $fee, 2),
                    'passengers' => $validated['passengers'],
                    'offer_snapshot' => $item->raw_offer,
                    'offer' => $item->offer,
                ]);
            }

            return $order;
        });

        try {
            $session = $stripe->createCheckoutSession($this->sessionParams($order->load('bookings')), $this->branding());
        } catch (\RuntimeException $exception) {
            $order->update(['status' => 'failed', 'failure_reason' => 'Session de paiement non créée.']);
            $order->bookings()->update(['status' => 'failed']);
            throw ValidationException::withMessages(['checkout' => 'Impossible d’ouvrir la page de paiement sécurisée. ' . $exception->getMessage()]);
        }

        $order->update(['stripe_checkout_session_id' => $session['id']]);

        return response()->json(['url' => $session['url'], 'reference' => $order->reference]);
    }

    /** Retour depuis Stripe : on vérifie le paiement sans attendre le webhook. */
    public function success(Request $request, FlightOrder $order, StripeClient $stripe, FlightOrderProcessor $processor)
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id, 404);

        $sessionId = (string) $request->query('session_id');
        if ($order->status === 'payment_pending' && $sessionId !== '' && hash_equals((string) $order->stripe_checkout_session_id, $sessionId)) {
            try {
                $processor->handlePaidSession($order, $stripe->retrieveCheckoutSession($sessionId));
            } catch (\RuntimeException) {
                // Le webhook prendra le relais ; la page de commande se met à jour seule.
            }
        }

        return redirect()->route('flights.orders.show', $order);
    }

    public function webhook(Request $request, FlightOrderProcessor $processor)
    {
        $secrets = array_filter([config('services.stripe.flight_webhook_secret'), config('services.stripe.webhook_secret')]);
        $valid = collect($secrets)->contains(fn ($secret) => StripeClient::validSignature($request->getContent(), $request->header('Stripe-Signature'), $secret));

        if (!$valid) {
            return response()->json(['message' => 'Signature Stripe invalide.'], 400);
        }

        return $this->handleEvent($request->json()->all(), $processor);
    }

    public function handleEvent(array $event, FlightOrderProcessor $processor)
    {
        $session = $event['data']['object'] ?? [];
        $order = FlightOrder::find($session['metadata']['flight_order_id'] ?? null);

        if (!$order) {
            return response()->json(['received' => true]);
        }

        match ($event['type'] ?? '') {
            'checkout.session.completed', 'checkout.session.async_payment_succeeded' => $processor->handlePaidSession($order, $session),
            'checkout.session.expired' => $processor->markExpired($order),
            default => null,
        };

        return response()->json(['received' => true]);
    }

    private function sessionParams(FlightOrder $order): array
    {
        $currency = strtolower($order->currency);
        $lineItems = $order->bookings->map(function (FlightBooking $booking) use ($currency, $order) {
            $offer = $booking->offer;
            $label = match ($booking->direction) {
                'return' => 'Vol retour',
                'outbound' => 'Vol aller',
                default => 'Vol',
            };
            $departure = Carbon::parse(substr($offer['departure'], 0, 19))->locale('fr')->isoFormat('ddd D MMM YYYY [à] HH:mm');
            $stops = $offer['stops'] === 0 ? 'direct' : $offer['stops'] . ' escale(s)';

            return [
                'price_data' => [
                    'currency' => $currency,
                    'unit_amount' => FlightPricing::toMinor((float) $booking->flight_amount, $order->currency),
                    'product_data' => [
                        'name' => sprintf('%s · %s (%s) → %s (%s)', $label, $offer['origin']['city'] ?: $offer['origin']['code'], $offer['origin']['code'], $offer['destination']['city'] ?: $offer['destination']['code'], $offer['destination']['code']),
                        'description' => sprintf('%s · %s · %s · %d passager(s) · tarif compagnie, taxes aéroportuaires incluses', $offer['airline']['name'], $departure, $stops, $offer['passengers_count']),
                    ],
                ],
                'quantity' => 1,
            ];
        })->values()->all();

        if ((float) $order->fee_amount > 0) {
            $lineItems[] = [
                'price_data' => [
                    'currency' => $currency,
                    'unit_amount' => FlightPricing::toMinor((float) $order->fee_amount, $order->currency),
                    'product_data' => [
                        'name' => config('flights.tax_label') . ' (' . rtrim(rtrim(number_format((float) $order->fee_percent, 2, ',', ''), '0'), ',') . ' %)',
                        'description' => 'Émission des billets, assistance et gestion de votre réservation.',
                    ],
                ],
                'quantity' => 1,
            ];
        }

        return [
            'mode' => 'payment',
            'locale' => 'fr',
            'submit_type' => 'book',
            'customer_email' => $order->contact_email,
            'client_reference_id' => (string) $order->id,
            'line_items' => $lineItems,
            'metadata' => ['flight_order_id' => (string) $order->id, 'reference' => $order->reference],
            'payment_intent_data' => [
                'description' => 'Billets d’avion — commande ' . $order->reference,
                'receipt_email' => $order->contact_email,
                'metadata' => ['flight_order_id' => (string) $order->id, 'reference' => $order->reference],
            ],
            'custom_text' => [
                'submit' => ['message' => 'Vos billets sont émis auprès de la compagnie dès la validation du paiement. Si un billet ne peut pas être émis, il vous est remboursé automatiquement.'],
                'after_submit' => ['message' => 'Commande ' . $order->reference . ' · Les conditions d’annulation dépendent du tarif choisi (voir conditions de vente).'],
            ],
            // Stripe impose au moins 30 minutes : marge pour la latence réseau.
            'expires_at' => now()->addMinutes(31)->timestamp,
            'success_url' => route('flights.checkout.success', $order) . '?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('flights.cart.index', ['cancelled' => 1]),
        ];
    }

    private function branding(): array
    {
        return [
            'branding_settings' => [
                'display_name' => config('flights.seller.name'),
                'button_color' => '#4f46e5',
                'background_color' => '#f8fafc',
                'border_style' => 'rounded',
            ],
        ];
    }

    public static function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[^\d+]/', '', $phone);
        if (str_starts_with($phone, '00')) {
            $phone = '+' . substr($phone, 2);
        }
        // Numéro français saisi sans indicatif : 06 12 34 56 78 → +33612345678
        if (preg_match('/^0[1-9]\d{8}$/', $phone)) {
            $phone = '+33' . substr($phone, 1);
        }

        return $phone;
    }
}
