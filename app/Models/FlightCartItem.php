<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FlightCartItem extends Model
{
    protected $fillable = [
        'user_id', 'trip_id', 'provider', 'offer_id', 'direction', 'passengers_count',
        'currency', 'flight_amount', 'offer', 'raw_offer', 'expires_at', 'services', 'services_amount',
    ];

    protected $hidden = ['raw_offer'];

    protected function casts(): array
    {
        return [
            'offer' => 'array',
            'services' => 'array',
            'services_amount' => 'decimal:2',
            'raw_offer' => 'array',
            'flight_amount' => 'decimal:2',
            'expires_at' => 'datetime',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function scopeActive(Builder $query): void
    {
        $query->where(fn (Builder $q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }
}
