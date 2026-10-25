<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StayBooking extends Model
{
    protected $fillable = [
        'stay_order_id', 'user_id', 'trip_id', 'provider', 'rate_id', 'quote_id', 'provider_booking_id',
        'reference', 'status', 'check_in', 'check_out', 'guests', 'rooms', 'currency', 'stay_amount',
        'fee_amount', 'total_amount', 'refunded_amount', 'property', 'room', 'rate', 'failure_reason', 'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'property' => 'array',
            'room' => 'array',
            'rate' => 'array',
            'stay_amount' => 'decimal:2',
            'fee_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'refunded_amount' => 'decimal:2',
            'check_in' => 'date:Y-m-d',
            'check_out' => 'date:Y-m-d',
            'cancelled_at' => 'datetime',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(StayOrder::class, 'stay_order_id');
    }
}
