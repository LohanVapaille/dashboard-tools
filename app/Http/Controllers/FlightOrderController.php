<?php

namespace App\Http\Controllers;

use App\Models\FlightBooking;
use App\Models\FlightOrder;
use App\Services\Flights\DuffelClient;
use App\Services\Flights\FlightOrderProcessor;
use App\Services\Flights\FlightProviderException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class FlightOrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = FlightOrder::with('bookings')
            ->where('user_id', $request->user()->id)
            ->whereNotNull('paid_at')
            ->latest()
            ->get()
            ->map(fn (FlightOrder $order) => $this->present($order));

        $stayOrders = \App\Models\StayOrder::with('bookings')
            ->where('user_id', $request->user()->id)
            ->whereNotNull('paid_at')
            ->latest()
            ->get()
            ->map(fn (\App\Models\StayOrder $order) => StayOrderController::present($order));

        $user = $request->user();
        $partnerReservations = \App\Models\TripReservation::with('trip:id,title')
            ->where(fn ($query) => $query->where('user_id', $user->id)->orWhereHas('trip', fn ($trip) => $trip->where('user_id', $user->id)))
            // Les hôtels payés dans le module Nuitée figurent déjà dans les commandes d'hébergement.
            ->where(fn ($query) => $query->whereNull('details')->orWhereNull('details->stay_order'))
            ->orderByRaw('starts_at is null')
            ->orderBy('starts_at')
            ->get();

        return Inertia::render('Reservations/Index', [
            'flightOrders' => $orders,
            'stayOrders' => $stayOrders,
            'partnerReservations' => $partnerReservations,
        ]);
    }

    public function show(Request $request, FlightOrder $order)
    {
        $this->authorizeOrder($request, $order);

        return Inertia::render('Flights/Receipt', [
            'order' => $this->present($order->load('bookings')),
            'seller' => config('flights.seller'),
            'feeLabel' => config('flights.tax_label'),
        ]);
    }

    /** Suivi en direct pendant l'émission des billets. */
    public function status(Request $request, FlightOrder $order)
    {
        $this->authorizeOrder($request, $order);

        return response()->json(['order' => $this->present($order->load('bookings'))]);
    }

    public function cancellationQuote(Request $request, FlightOrder $order, FlightBooking $booking, DuffelClient $duffel)
    {
        $this->authorizeBooking($request, $order, $booking);

        if ($booking->status === 'simulated') {
            $conditions = $booking->offer['conditions'] ?? [];
            $refundable = (bool) ($conditions['refundable'] ?? false);
            $quote = [
                'id' => null,
                'refundable' => $refundable,
                'refund_amount' => $refundable ? max(0, round((float) $booking->flight_amount - (float) ($conditions['refund_penalty'] ?? 0), 2)) : 0,
                'currency' => $booking->currency,
                'expires_at' => now()->addMinutes(10)->toIso8601String(),
            ];
        } else {
            try {
                $data = $duffel->cancellationQuote($booking->duffel_order_id);
            } catch (FlightProviderException $exception) {
                throw ValidationException::withMessages(['cancellation' => $exception->getMessage()]);
            }
            $quote = [
                'id' => $data['id'] ?? null,
                'refundable' => (float) ($data['refund_amount'] ?? 0) > 0,
                'refund_amount' => round((float) ($data['refund_amount'] ?? 0), 2),
                'currency' => strtoupper($data['refund_currency'] ?? $booking->currency),
                'expires_at' => $data['expires_at'] ?? now()->addMinutes(10)->toIso8601String(),
            ];
        }

        Cache::put($this->quoteKey($booking), $quote, now()->addMinutes(10));

        return response()->json(['quote' => $quote]);
    }

    public function cancel(Request $request, FlightOrder $order, FlightBooking $booking, DuffelClient $duffel, FlightOrderProcessor $processor)
    {
        $this->authorizeBooking($request, $order, $booking);

        $quote = Cache::pull($this->quoteKey($booking));
        if (!$quote || Carbon::parse($quote['expires_at'])->isPast()) {
            throw ValidationException::withMessages(['cancellation' => 'Le devis d’annulation a expiré. Demandez-en un nouveau.']);
        }

        if ($booking->status === 'ticketed') {
            try {
                $duffel->confirmCancellation($quote['id']);
            } catch (FlightProviderException $exception) {
                throw ValidationException::withMessages(['cancellation' => $exception->getMessage()]);
            }
        }

        $booking->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        $refunded = true;
        if ($quote['refund_amount'] > 0) {
            $refunded = $quote['currency'] === $order->currency
                && $processor->refundBooking($order, $booking, $quote['refund_amount'], 'voluntary_cancellation');
            if (!$refunded) {
                Log::critical('Manual flight refund required', ['order' => $order->reference, 'booking' => $booking->id, 'quote' => $quote]);
            }
        }

        $processor->finalize($order);

        return back()->with('status', $quote['refund_amount'] > 0
            ? ($refunded
                ? 'Billet annulé. Le remboursement apparaîtra sur votre moyen de paiement sous 5 à 10 jours.'
                : 'Billet annulé. Votre remboursement est traité manuellement par notre équipe sous 30 jours.')
            : 'Billet annulé. Ce tarif n’ouvrait pas droit à remboursement ; vous pouvez demander le remboursement des taxes.');
    }

    /**
     * Remboursement des taxes et redevances liées à l'embarquement effectif
     * (art. L224-66 du Code de la consommation) pour un billet non utilisé.
     */
    public function requestTaxRefund(Request $request, FlightOrder $order, FlightBooking $booking)
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id && (int) $booking->flight_order_id === (int) $order->id, 404);
        abort_unless(in_array($booking->status, ['ticketed', 'simulated', 'cancelled'], true) && !$booking->tax_refund_requested_at, 422);

        $booking->update(['tax_refund_requested_at' => now()]);

        $support = config('flights.seller.email');
        if ($support) {
            try {
                Mail::raw(
                    "Demande de remboursement des taxes (art. L224-66 C. conso)\nCommande : {$order->reference}\nBillet : {$booking->id} — PNR {$booking->booking_reference}\nClient : {$order->contact_email}\nÀ traiter sous 30 jours.",
                    fn ($message) => $message->to($support)->subject('Remboursement de taxes — ' . $order->reference),
                );
            } catch (\Throwable $exception) {
                Log::error('Tax refund notification failed', ['order' => $order->reference, 'exception' => $exception]);
            }
        }

        return back()->with('status', 'Demande enregistrée. Les taxes remboursables vous seront reversées sous 30 jours maximum, sans frais.');
    }

    private function present(FlightOrder $order): array
    {
        return [
            'reference' => $order->reference,
            'status' => $order->status,
            'currency' => $order->currency,
            'flights_amount' => (float) $order->flights_amount,
            'fee_percent' => (float) $order->fee_percent,
            'fee_amount' => (float) $order->fee_amount,
            'total_amount' => (float) $order->total_amount,
            'refunded_amount' => (float) $order->refunded_amount,
            'passengers' => $order->passengers,
            'contact_email' => $order->contact_email,
            'contact_phone' => $order->contact_phone,
            'receipt_url' => $order->stripe_receipt_url,
            'paid_at' => $order->paid_at?->toIso8601String(),
            'created_at' => $order->created_at?->toIso8601String(),
            'failure_reason' => $order->failure_reason,
            'bookings' => $order->bookings->map(fn (FlightBooking $booking) => [
                'id' => $booking->id,
                'trip_id' => $booking->trip_id,
                'direction' => $booking->direction,
                'status' => $booking->status,
                'offer' => $booking->offer,
                'booking_reference' => $booking->booking_reference,
                'ticket_numbers' => $booking->ticket_numbers ?? [],
                'flight_amount' => (float) $booking->flight_amount,
                'fee_amount' => (float) $booking->service_fee,
                'total_amount' => (float) $booking->total_amount,
                'refunded_amount' => (float) $booking->refunded_amount,
                'services' => $booking->services ?? [],
                'services_amount' => (float) $booking->services_amount,
                'failure_reason' => $booking->failure_reason,
                'cancelled_at' => $booking->cancelled_at?->toIso8601String(),
                'tax_refund_requested_at' => $booking->tax_refund_requested_at?->toIso8601String(),
                'can_cancel' => in_array($booking->status, ['ticketed', 'simulated'], true)
                    && isset($booking->offer['departure'])
                    && Carbon::parse(substr($booking->offer['departure'], 0, 19))->isFuture(),
            ])->values(),
        ];
    }

    private function authorizeOrder(Request $request, FlightOrder $order): void
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id, 404);
    }

    private function authorizeBooking(Request $request, FlightOrder $order, FlightBooking $booking): void
    {
        $this->authorizeOrder($request, $order);
        abort_unless((int) $booking->flight_order_id === (int) $order->id, 404);
        abort_unless(in_array($booking->status, ['ticketed', 'simulated'], true), 422, 'Ce billet ne peut plus être annulé.');
    }

    private function quoteKey(FlightBooking $booking): string
    {
        return 'flight-cancel-quote:' . $booking->id;
    }
}
