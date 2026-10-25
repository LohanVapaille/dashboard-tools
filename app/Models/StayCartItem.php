<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StayCartItem extends Model
{
    protected $fillable = [
        'user_id', 'trip_id', 'provider', 'search_result_id', 'rate_id', 'quote_id', 'check_in', 'check_out',
        'guests', 'rooms', 'currency', 'stay_amount', 'property', 'room', 'rate', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'property' => 'array',
            'room' => 'array',
            'rate' => 'array',
            'stay_amount' => 'decimal:2',
            'check_in' => 'date:Y-m-d',
            'check_out' => 'date:Y-m-d',
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

    public function nights(): int
    {
        return max(1, $this->check_in->diffInDays($this->check_out));
    }
}
