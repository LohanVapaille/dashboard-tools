<?php

namespace App\Http\Controllers;

use App\Models\StayBooking;
use App\Models\StayCartItem;
use App\Models\StayOrder;
use App\Services\Flights\FlightProviderException;
use App\Services\Payments\StripeClient;
use App\Services\Stays\LiteApiClient;
use App\Services\Stays\StayProviders;
use App\Services\Stays\StayOrderProcessor;
use App\Services\Stays\StayPricing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StayCheckoutController extends Controller
{
    public function store(Request $request, StayProviders $providers, StripeClient $stripe)
    {
        $user = $request->user();
        $items = StayCartItem::where('user_id', $user->id)->orderBy('check_in')->get();

        if ($items->isEmpty()) {
            throw ValidationException::withMessages(['checkout' => 'Aucun hébergement dans votre panier.']);
        }
        if ($items->contains->isExpired()) {
            throw ValidationException::withMessages(['checkout' => 'Un tarif a expiré. Retirez cet hébergement et relancez la recherche.']);
        }
        if (!$stripe->configured()) {
            throw ValidationException::withMessages(['checkout' => 'Le paiement en ligne n’est pas encore configuré (STRIPE_SECRET manquante).']);
        }
        // Jamais de vrai débit pour une réservation d'hôtel fictive (clé LiteAPI de test).
        if (str_starts_with((string) config('services.stripe.secret'), 'sk_live_') && $items->contains('provider', 'liteapi') && app(LiteApiClient::class)->sandbox()) {
            throw ValidationException::withMessages(['checkout' => 'La réservation d’hôtels n’est pas encore ouverte. Aucun montant n’a été débité.']);
        }

        $request->merge(['contact_phone' => FlightCheckoutController::normalizePhone((string) $request->input('contact_phone'))]);
        $validated = $request->validate([
            'guests' => ['required', 'array', 'min:1', 'max:' . config('stays.max_guests')],
            'guests.*.given_name' => ['required', 'string', 'max:50', "regex:/^[\\pL][\\pL '\\-]*$/u"],
            'guests.*.family_name' => ['required', 'string', 'max:50', "regex:/^[\\pL][\\pL '\\-]*$/u"],
            'contact_email' => ['required', 'email', 'max:255'],
            'contact_phone' => ['required', 'regex:/^\+[1-9]\d{6,14}$/'],
            'special_requests' => ['nullable', 'string', 'max:500'],
            'accept_terms' => ['accepted'],
        ], [
            'guests.*.given_name.regex' => 'Le prénom ne doit contenir que des lettres, espaces, tirets ou apostrophes.',
            'guests.*.family_name.regex' => 'Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes.',
            'contact_phone.regex' => 'Indiquez un numéro au format international, par exemple +33 6 12 34 56 78.',
            'accept_terms.accepted' => 'Vous devez accepter les conditions de vente et les conditions de l’hébergement.',
        ]);

        // Nouveau devis juste avant de facturer : prix et disponibilité garantis.
        $changed = false;
        foreach ($items as $item) {
            try {
                $quote = $providers->forKey($item->provider)->quote($item->rate);
            } catch (FlightProviderException $exception) {
                throw ValidationException::withMessages(['checkout' => $exception->getMessage() . ' Retirez « ' . ($item->property['name'] ?? 'cet hébergement') . ' » du panier.']);
            }
            $amount = (float) $quote['amount'];
            if (abs($amount - (float) $item->stay_amount) >= 0.01) {
                $changed = true;
            }
            $item->update(['quote_id' => $quote['id'], 'stay_amount' => $amount]);
        }

        if ($changed) {
            return response()->json([
                'price_changed' => true,
                'message' => 'Le prix d’un hébergement a changé depuis son ajout au panier. Vérifiez le nouveau total avant de payer.',
            ], 409);
        }

        $order = DB::transaction(function () use ($user, $items, $validated) {
            $staysAmount = round((float) $items->sum('stay_amount'), 2);
            $fees = round($items->sum(fn ($item) => StayPricing::fee((float) $item->stay_amount)), 2);

            $order = StayOrder::create([
                'user_id' => $user->id,
                'status' => 'payment_pending',
                'currency' => $items->first()->currency,
                'stays_amount' => $staysAmount,
                'fee_percent' => StayPricing::percent(),
                'fee_amount' => $fees,
                'total_amount' => round($staysAmount + $fees, 2),
                'guests' => $validated['guests'],
                'contact_email' => $validated['contact_email'],
                'contact_phone' => $validated['contact_phone'],
                'special_requests' => $validated['special_requests'] ?? null,
                'terms_accepted_at' => now(),
            ]);

            foreach ($items as $item) {
                $fee = StayPricing::fee((float) $item->stay_amount);
                StayBooking::create([
                    'stay_order_id' => $order->id,
                    'user_id' => $user->id,
                    'trip_id' => $item->trip_id,
                    'provider' => $item->provider,
                    'rate_id' => $item->rate_id,
                    'quote_id' => $item->quote_id,
                    'status' => 'pending',
                    'check_in' => $item->check_in,
                    'check_out' => $item->check_out,
                    'guests' => $item->guests,
                    'rooms' => $item->rooms,
                    'currency' => $item->currency,
                    'stay_amount' => $item->stay_amount,
                    'fee_amount' => $fee,
                    'total_amount' => round((float) $item->stay_amount + $fee, 2),
                    'property' => $item->property,
                    'room' => $item->room,
                    'rate' => $item->rate,
                ]);
            }

            return $order;
        });

        try {
            $session = $stripe->createCheckoutSession($this->sessionParams($order->load('bookings')), [
                'branding_settings' => [
                    'display_name' => config('flights.seller.name'),
                    'button_color' => '#059669',
                    'background_color' => '#f8fafc',
                    'border_style' => 'rounded',
                ],
            ]);
        } catch (\RuntimeException $exception) {
            $order->update(['status' => 'failed', 'failure_reason' => 'Session de paiement non créée.']);
            $order->bookings()->update(['status' => 'failed']);
            throw ValidationException::withMessages(['checkout' => 'Impossible d’ouvrir la page de paiement sécurisée. ' . $exception->getMessage()]);
        }

        $order->update(['stripe_checkout_session_id' => $session['id']]);

        return response()->json(['url' => $session['url'], 'reference' => $order->reference]);
    }

    public function success(Request $request, StayOrder $order, StripeClient $stripe, StayOrderProcessor $processor)
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id, 404);

        $sessionId = (string) $request->query('session_id');
        if ($order->status === 'payment_pending' && $sessionId !== '' && hash_equals((string) $order->stripe_checkout_session_id, $sessionId)) {
            try {
                $processor->handlePaidSession($order, $stripe->retrieveCheckoutSession($sessionId));
            } catch (\RuntimeException) {
                // Le webhook prendra le relais.
            }
        }

        return redirect()->route('stays.orders.show', $order);
    }

    private function sessionParams(StayOrder $order): array
    {
        $currency = strtolower($order->currency);
        $lineItems = $order->bookings->map(function (StayBooking $booking) use ($currency, $order) {
            $nights = max(1, $booking->check_in->diffInDays($booking->check_out));

            return [
                'price_data' => [
                    'currency' => $currency,
                    'unit_amount' => StayPricing::toMinor((float) $booking->stay_amount, $order->currency),
                    'product_data' => [
                        'name' => sprintf('%s · %d nuit(s)', $booking->property['name'] ?? 'Hébergement', $nights),
                        'description' => sprintf(
                            'Du %s au %s · %s · %s · %d voyageur(s) · taxes incluses',
                            $booking->check_in->locale('fr')->isoFormat('D MMM YYYY'),
                            $booking->check_out->locale('fr')->isoFormat('D MMM YYYY'),
                            $booking->room['name'] ?? 'Chambre',
                            $booking->rate['board_label'] ?? '',
                            $booking->guests,
                        ),
                        ...(!empty($booking->property['photos'][0]) ? ['images' => [$booking->property['photos'][0]]] : []),
                    ],
                ],
                'quantity' => 1,
            ];
        })->values()->all();

        if ((float) $order->fee_amount > 0) {
            $lineItems[] = [
                'price_data' => [
                    'currency' => $currency,
                    'unit_amount' => StayPricing::toMinor((float) $order->fee_amount, $order->currency),
                    'product_data' => [
                        'name' => config('stays.commission_label') . ' (' . rtrim(rtrim(number_format((float) $order->fee_percent, 2, ',', ''), '0'), ',') . ' %)',
                        'description' => 'Réservation, assistance et gestion de votre séjour.',
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
            'metadata' => ['stay_order_id' => (string) $order->id, 'reference' => $order->reference],
            'payment_intent_data' => [
                'description' => 'Hébergement — commande ' . $order->reference,
                'receipt_email' => $order->contact_email,
                'metadata' => ['stay_order_id' => (string) $order->id, 'reference' => $order->reference],
            ],
            'custom_text' => [
                'submit' => ['message' => 'Votre réservation est confirmée auprès de l’hébergement dès la validation du paiement. Si elle ne peut pas l’être, vous êtes remboursé automatiquement.'],
                'after_submit' => ['message' => 'Commande ' . $order->reference . ' · Conditions d’annulation selon le tarif choisi.'],
            ],
            'expires_at' => now()->addMinutes(31)->timestamp,
            'success_url' => route('stays.checkout.success', $order) . '?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('flights.cart.index', ['cancelled' => 1, 'section' => 'stays']),
        ];
    }
}
