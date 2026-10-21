<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Statuts : payment_pending → processing → confirmed | partially_confirmed | failed,
 * ou expired si le paiement n'a pas abouti, cancelled après annulation complète.
 */
class FlightOrder extends Model
{
    protected $fillable = [
        'user_id', 'reference', 'status', 'currency', 'flights_amount', 'fee_percent', 'fee_amount',
        'total_amount', 'refunded_amount', 'passengers', 'contact_email', 'contact_phone',
        'stripe_checkout_session_id', 'stripe_payment_intent_id', 'stripe_receipt_url',
        'terms_accepted_at', 'paid_at', 'failure_reason',
    ];

    protected $hidden = ['stripe_checkout_session_id', 'stripe_payment_intent_id'];

    protected function casts(): array
    {
        return [
            'passengers' => 'array',
            'flights_amount' => 'decimal:2',
            'fee_percent' => 'decimal:2',
            'fee_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'refunded_amount' => 'decimal:2',
            'terms_accepted_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (FlightOrder $order) {
            do {
                $reference = 'TP-' . Str::upper(Str::random(6));
            } while (static::where('reference', $reference)->exists());

            $order->reference = $order->reference ?: $reference;
        });
    }

    public function getRouteKeyName(): string
    {
        return 'reference';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(FlightBooking::class)->orderByRaw("CASE direction WHEN 'outbound' THEN 0 WHEN 'oneway' THEN 1 ELSE 2 END");
    }

    public function isPaid(): bool
    {
        return $this->paid_at !== null;
    }
}
