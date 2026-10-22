<?php

namespace App\Services\Payments;

use App\Models\FlightOrder;
use App\Models\StayOrder;
use App\Services\Flights\FlightOrderProcessor;
use App\Services\Stays\StayOrderProcessor;

/** Aiguille les événements Stripe Checkout vers la commande de vols ou d'hébergements concernée. */
class CheckoutEventRouter
{
    public function __construct(
        private readonly FlightOrderProcessor $flights,
        private readonly StayOrderProcessor $stays,
    ) {
    }

    public static function concerns(array $event): bool
    {
        $metadata = $event['data']['object']['metadata'] ?? [];

        return !empty($metadata['flight_order_id']) || !empty($metadata['stay_order_id']);
    }

    public function handle(array $event): void
    {
        $session = $event['data']['object'] ?? [];
        $metadata = $session['metadata'] ?? [];
        $type = $event['type'] ?? '';
        $paid = in_array($type, ['checkout.session.completed', 'checkout.session.async_payment_succeeded'], true);
        $expired = $type === 'checkout.session.expired';

        if (!empty($metadata['flight_order_id']) && $order = FlightOrder::find($metadata['flight_order_id'])) {
            if ($paid) {
                $this->flights->handlePaidSession($order, $session);
            } elseif ($expired) {
                $this->flights->markExpired($order);
            }
        }

        if (!empty($metadata['stay_order_id']) && $order = StayOrder::find($metadata['stay_order_id'])) {
            if ($paid) {
                $this->stays->handlePaidSession($order, $session);
            } elseif ($expired) {
                $this->stays->markExpired($order);
            }
        }
    }
}
