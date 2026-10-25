<?php

namespace App\Services\Flights;

use App\Mail\FlightOrderConfirmation;
use App\Models\FlightBooking;
use App\Models\FlightCartItem;
use App\Models\FlightOrder;
use App\Services\Flights\Providers\DuffelProvider;
use App\Services\Payments\StripeClient;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Transforme un paiement Stripe réussi en billets. Appelé à la fois par le
 * webhook et par la page de retour de paiement : le passage atomique de
 * payment_pending à processing garantit qu'une commande n'est émise qu'une fois.
 */
class FlightOrderProcessor
{
    public function __construct(
        private readonly DuffelClient $duffel,
        private readonly StripeClient $stripe,
    ) {
    }

    /** @param array $session Objet checkout.session renvoyé par Stripe. */
    public function handlePaidSession(FlightOrder $order, array $session): FlightOrder
    {
        if (($session['payment_status'] ?? null) !== 'paid' || ($session['id'] ?? null) !== $order->stripe_checkout_session_id) {
            return $order;
        }

        $claimed = FlightOrder::whereKey($order->id)
            ->where('status', 'payment_pending')
            ->update([
                'status' => 'processing',
                'paid_at' => now(),
                'stripe_payment_intent_id' => $session['payment_intent'] ?? null,
            ]);

        if (!$claimed) {
            return $order->fresh();
        }

        $order->refresh();
        $order->update(['stripe_receipt_url' => $this->stripe->receiptUrl($order->stripe_payment_intent_id)]);

        foreach ($order->bookings as $booking) {
            $this->issue($order, $booking);
        }

        $this->finalize($order);

        FlightCartItem::where('user_id', $order->user_id)
            ->whereIn('offer_id', $order->bookings->pluck('duffel_offer_id'))
            ->delete();

        if ($order->bookings()->whereIn('status', ['ticketed', 'simulated'])->exists()) {
            try {
                Mail::to($order->contact_email)->send(new FlightOrderConfirmation($order->fresh('bookings')));
            } catch (\Throwable $exception) {
                Log::error('Flight confirmation email failed', ['order' => $order->reference, 'exception' => $exception]);
            }
        }

        return $order->fresh('bookings');
    }

    public function markExpired(FlightOrder $order): void
    {
        FlightOrder::whereKey($order->id)->where('status', 'payment_pending')->update(['status' => 'expired']);
        $order->bookings()->where('status', 'pending')->update(['status' => 'expired']);
    }

    private function issue(FlightOrder $order, FlightBooking $booking): void
    {
        if (!$this->duffel->bookingEnabled()) {
            // Mode démonstration : paiement réel (test Stripe) mais aucun billet émis chez la compagnie.
            $booking->update([
                'status' => 'simulated',
                'booking_reference' => 'DEMO' . Str::upper(Str::random(2)),
            ]);

            return;
        }

        try {
            $passengerIds = DuffelProvider::passengerIds($booking->offer_snapshot ?? []);
            $passengers = collect($order->passengers)->values()->map(fn (array $passenger, int $index) => [
                'id' => $passengerIds[$index] ?? throw new \RuntimeException('Passagers de l’offre introuvables.'),
                'title' => $passenger['title'],
                'gender' => $passenger['gender'],
                'given_name' => $passenger['given_name'],
                'family_name' => $passenger['family_name'],
                'born_on' => $passenger['born_on'],
                'email' => $order->contact_email,
                'phone_number' => $order->contact_phone,
            ])->all();

            $duffelOrder = $this->duffel->createOrder(
                $booking->duffel_offer_id,
                $passengers,
                number_format((float) $booking->flight_amount, 2, '.', ''),
                $booking->currency,
                collect($booking->services ?? [])->map(fn ($service) => ['id' => $service['id'], 'quantity' => $service['quantity']])->all(),
            );

            $booking->update([
                'status' => 'ticketed',
                'duffel_order_id' => $duffelOrder['id'] ?? null,
                'booking_reference' => $duffelOrder['booking_reference'] ?? null,
                'ticket_numbers' => collect($duffelOrder['documents'] ?? [])
                    ->where('type', 'electronic_ticket')
                    ->pluck('unique_identifier')
                    ->values()
                    ->all(),
            ]);
        } catch (\Throwable $exception) {
            Log::error('Flight ticketing failed', ['order' => $order->reference, 'booking' => $booking->id, 'exception' => $exception]);
            $booking->update([
                'status' => 'failed',
                'failure_reason' => $exception instanceof FlightProviderException
                    ? $exception->getMessage()
                    : 'La compagnie n’a pas pu émettre ce billet.',
            ]);
            // Billet non émis : remboursement intégral de sa part (vol + frais).
            $this->refundBooking($order, $booking, (float) $booking->total_amount, 'ticketing_failed');
        }
    }

    public function refundBooking(FlightOrder $order, FlightBooking $booking, float $amount, string $reason): bool
    {
        $amount = round(min($amount, (float) $booking->total_amount - (float) $booking->refunded_amount), 2);
        if ($amount <= 0 || !$order->stripe_payment_intent_id) {
            return false;
        }

        $refunded = $this->stripe->refund(
            $order->stripe_payment_intent_id,
            FlightPricing::toMinor($amount, $order->currency),
            $reason,
            'flight-refund-' . $booking->id . '-' . $reason,
        );

        if ($refunded) {
            $booking->increment('refunded_amount', $amount);
            $order->increment('refunded_amount', $amount);
        }

        return $refunded;
    }

    public function finalize(FlightOrder $order): void
    {
        $statuses = $order->bookings()->pluck('status');
        $issued = $statuses->filter(fn ($status) => in_array($status, ['ticketed', 'simulated'], true))->count();

        $order->update([
            'status' => match (true) {
                $statuses->every(fn ($status) => $status === 'cancelled') => 'cancelled',
                $issued === $statuses->count() => 'confirmed',
                $issued > 0 || $statuses->contains('cancelled') => 'partially_confirmed',
                default => 'failed',
            },
            'failure_reason' => $statuses->contains('failed')
                ? 'Un ou plusieurs billets n’ont pas pu être émis. Les montants correspondants ont été remboursés automatiquement.'
                : null,
        ]);
    }
}
