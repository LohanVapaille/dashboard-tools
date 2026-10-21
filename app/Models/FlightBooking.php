<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Un billet (un trajet) au sein d'une commande. */
class FlightBooking extends Model
{
    protected $fillable = [
        'user_id', 'trip_id', 'flight_order_id', 'direction', 'duffel_offer_id', 'status', 'currency',
        'flight_amount', 'service_fee', 'total_amount', 'refunded_amount', 'passengers',
        'offer_snapshot', 'offer', 'stripe_checkout_session_id', 'stripe_payment_intent_id', 'duffel_order_id',
        'booking_reference', 'ticket_numbers', 'failure_reason', 'cancelled_at', 'tax_refund_requested_at',
    ];

    protected $hidden = ['offer_snapshot', 'passengers', 'stripe_checkout_session_id', 'stripe_payment_intent_id'];

    protected function casts(): array
    {
        return [
            'passengers' => 'array',
            'offer_snapshot' => 'array',
            'offer' => 'array',
            'ticket_numbers' => 'array',
            'flight_amount' => 'decimal:2',
            'service_fee' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'refunded_amount' => 'decimal:2',
            'cancelled_at' => 'datetime',
            'tax_refund_requested_at' => 'datetime',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(FlightOrder::class, 'flight_order_id');
    }
}
