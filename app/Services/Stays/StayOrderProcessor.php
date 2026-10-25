<?php

namespace App\Services\Stays;

use App\Mail\StayOrderConfirmation;
use App\Models\StayBooking;
use App\Models\StayCartItem;
use App\Models\StayOrder;
use App\Services\Flights\FlightProviderException;
use App\Services\Payments\StripeClient;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/** Même principe que pour les vols : passage atomique payment_pending → processing, puis confirmation. */
class StayOrderProcessor
{
    public function __construct(
        private readonly StayProviders $providers,
        private readonly StripeClient $stripe,
    ) {
    }

    public function handlePaidSession(StayOrder $order, array $session): StayOrder
    {
        if (($session['payment_status'] ?? null) !== 'paid' || ($session['id'] ?? null) !== $order->stripe_checkout_session_id) {
            return $order;
        }

        $claimed = StayOrder::whereKey($order->id)->where('status', 'payment_pending')->update([
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
            $this->confirm($order, $booking);
        }

        $this->finalize($order);

        StayCartItem::where('user_id', $order->user_id)->whereIn('rate_id', $order->bookings->pluck('rate_id'))->delete();

        if ($order->bookings()->where('status', 'confirmed')->exists()) {
            try {
                Mail::to($order->contact_email)->send(new StayOrderConfirmation($order->fresh('bookings')));
            } catch (\Throwable $exception) {
                Log::error('Stay confirmation email failed', ['order' => $order->reference, 'exception' => $exception]);
            }
        }

        return $order->fresh('bookings');
    }

    public function markExpired(StayOrder $order): void
    {
        StayOrder::whereKey($order->id)->where('status', 'payment_pending')->update(['status' => 'expired']);
        $order->bookings()->where('status', 'pending')->update(['status' => 'expired']);
    }

    private function confirm(StayOrder $order, StayBooking $booking): void
    {
        try {
            $result = $this->providers->forKey($booking->provider)->book($booking, $order);

            $booking->update([
                'status' => $result['confirmed'] ? 'confirmed' : 'failed',
                'provider_booking_id' => $result['id'],
                'reference' => $result['reference'],
                'failure_reason' => $result['confirmed'] ? null : 'L’hébergement n’a pas confirmé la réservation.',
            ]);
            if (!$result['confirmed']) {
                $this->refundBooking($order, $booking, (float) $booking->total_amount, 'stay_booking_failed');
            }
        } catch (\Throwable $exception) {
            Log::error('Stay booking failed', ['order' => $order->reference, 'booking' => $booking->id, 'exception' => $exception]);
            $booking->update([
                'status' => 'failed',
                'failure_reason' => $exception instanceof FlightProviderException
                    ? $exception->getMessage()
                    : 'L’hébergement n’a pas pu confirmer la réservation.',
            ]);
            $this->refundBooking($order, $booking, (float) $booking->total_amount, 'stay_booking_failed');
        }
    }

    public function refundBooking(StayOrder $order, StayBooking $booking, float $amount, string $reason): bool
    {
        $amount = round(min($amount, (float) $booking->total_amount - (float) $booking->refunded_amount), 2);
        if ($amount <= 0 || !$order->stripe_payment_intent_id) {
            return false;
        }

        $refunded = $this->stripe->refund(
            $order->stripe_payment_intent_id,
            StayPricing::toMinor($amount, $order->currency),
            $reason,
            'stay-refund-' . $booking->id . '-' . $reason,
        );

        if ($refunded) {
            $booking->increment('refunded_amount', $amount);
            $order->increment('refunded_amount', $amount);
        }

        return $refunded;
    }

    public function finalize(StayOrder $order): void
    {
        $statuses = $order->bookings()->pluck('status');
        $confirmed = $statuses->filter(fn ($status) => $status === 'confirmed')->count();

        $order->update([
            'status' => match (true) {
                $statuses->every(fn ($status) => $status === 'cancelled') => 'cancelled',
                $confirmed === $statuses->count() => 'confirmed',
                $confirmed > 0 || $statuses->contains('cancelled') => 'partially_confirmed',
                default => 'failed',
            },
            'failure_reason' => $statuses->contains('failed')
                ? 'Un hébergement n’a pas pu être confirmé. Le montant correspondant a été remboursé automatiquement.'
                : null,
        ]);
    }
}
