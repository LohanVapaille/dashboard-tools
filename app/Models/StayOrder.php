<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/** Un paiement Stripe regroupant un ou plusieurs hébergements (statuts identiques aux vols). */
class StayOrder extends Model
{
    protected $fillable = [
        'user_id', 'reference', 'status', 'payment_method', 'provider_transaction_id', 'currency', 'stays_amount', 'fee_percent', 'fee_amount',
        'total_amount', 'refunded_amount', 'guests', 'contact_email', 'contact_phone', 'special_requests',
        'stripe_checkout_session_id', 'stripe_payment_intent_id', 'stripe_receipt_url',
        'terms_accepted_at', 'paid_at', 'failure_reason',
    ];

    protected $hidden = ['stripe_checkout_session_id', 'stripe_payment_intent_id', 'provider_transaction_id'];

    protected function casts(): array
    {
        return [
            'guests' => 'array',
            'stays_amount' => 'decimal:2',
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
        static::creating(function (StayOrder $order) {
            if (!$order->reference) {
                do {
                    $reference = 'TS-' . Str::upper(Str::random(6));
                } while (static::where('reference', $reference)->exists());
                $order->reference = $reference;
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'reference';
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(StayBooking::class)->orderBy('check_in');
    }
}
