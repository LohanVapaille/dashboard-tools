<?php

namespace App\Http\Controllers;

use App\Models\StayBooking;
use App\Models\StayOrder;
use App\Services\Flights\FlightProviderException;
use App\Services\Stays\StayProviders;
use App\Services\Stays\StayOrderProcessor;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class StayOrderController extends Controller
{
    public function show(Request $request, StayOrder $order)
    {
        $this->authorizeOrder($request, $order);

        return Inertia::render('Stays/Receipt', [
            'order' => self::present($order->load('bookings')),
            'seller' => config('flights.seller'),
            'feeLabel' => config('stays.commission_label'),
        ]);
    }

    public function status(Request $request, StayOrder $order)
    {
        $this->authorizeOrder($request, $order);

        return response()->json(['order' => self::present($order->load('bookings'))]);
    }

    public function cancel(Request $request, StayOrder $order, StayBooking $booking, StayProviders $providers, StayOrderProcessor $processor)
    {
        $this->authorizeOrder($request, $order);
        abort_unless((int) $booking->stay_order_id === (int) $order->id && $booking->status === 'confirmed', 404);

        try {
            // Montant remboursé par l'hébergement ; nos frais de service ne sont pas remboursés.
            $refund = min($providers->forKey($booking->provider)->cancel($booking), (float) $booking->stay_amount);
        } catch (FlightProviderException $exception) {
            throw ValidationException::withMessages(['cancellation' => $exception->getMessage()]);
        }

        $booking->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        $refunded = true;
        if ($refund > 0) {
            $refunded = $processor->refundBooking($order, $booking, $refund, 'voluntary_cancellation');
            if (!$refunded) {
                Log::critical('Manual stay refund required', ['order' => $order->reference, 'booking' => $booking->id, 'amount' => $refund]);
            }
        }

        $processor->finalize($order);

        return back()->with('status', $refund > 0
            ? ($refunded ? 'Réservation annulée. Le remboursement apparaîtra sous 5 à 10 jours.' : 'Réservation annulée. Votre remboursement est traité manuellement sous 14 jours.')
            : 'Réservation annulée. Ce tarif n’ouvrait plus droit à remboursement.');
    }

    /** Montant remboursé par l'hébergement si l'on annule maintenant. */
    public static function currentRefund(StayBooking $booking): float
    {
        $step = collect($booking->rate['cancellation_timeline'] ?? [])
            ->sortBy('before')
            ->first(fn ($step) => !empty($step['before']) && Carbon::parse($step['before'])->isFuture());

        return $step ? round(min((float) $step['refund_amount'], (float) $booking->stay_amount), 2) : 0.0;
    }

    public static function present(StayOrder $order): array
    {
        return [
            'type' => 'stay',
            'reference' => $order->reference,
            'status' => $order->status,
            'currency' => $order->currency,
            'stays_amount' => (float) $order->stays_amount,
            'fee_percent' => (float) $order->fee_percent,
            'fee_amount' => (float) $order->fee_amount,
            'total_amount' => (float) $order->total_amount,
            'refunded_amount' => (float) $order->refunded_amount,
            'guests' => $order->guests,
            'contact_email' => $order->contact_email,
            'special_requests' => $order->special_requests,
            'receipt_url' => $order->stripe_receipt_url,
            'paid_at' => $order->paid_at?->toIso8601String(),
            'created_at' => $order->created_at?->toIso8601String(),
            'failure_reason' => $order->failure_reason,
            'bookings' => $order->bookings->map(fn (StayBooking $booking) => [
                'id' => $booking->id,
                'trip_id' => $booking->trip_id,
                'status' => $booking->status,
                'reference' => $booking->reference ?: $booking->provider_booking_id,
                'check_in' => $booking->check_in->toDateString(),
                'check_out' => $booking->check_out->toDateString(),
                'nights' => max(1, $booking->check_in->diffInDays($booking->check_out)),
                'guests' => $booking->guests,
                'rooms' => $booking->rooms,
                'property' => $booking->property,
                'room' => $booking->room,
                'rate' => $booking->rate,
                'stay_amount' => (float) $booking->stay_amount,
                'fee_amount' => (float) $booking->fee_amount,
                'total_amount' => (float) $booking->total_amount,
                'refunded_amount' => (float) $booking->refunded_amount,
                'failure_reason' => $booking->failure_reason,
                'cancelled_at' => $booking->cancelled_at?->toIso8601String(),
                'can_cancel' => $booking->status === 'confirmed' && $booking->check_in->isFuture(),
                'refund_if_cancelled' => $booking->status === 'confirmed' ? self::currentRefund($booking) : 0,
            ])->values(),
        ];
    }

    private function authorizeOrder(Request $request, StayOrder $order): void
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id, 404);
    }
}
