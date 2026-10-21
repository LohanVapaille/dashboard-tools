<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class TripPhoto extends Model
{
    protected $fillable = ['trip_id', 'user_id', 'path', 'caption'];

    protected $appends = ['url'];

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->path);
    }
}
