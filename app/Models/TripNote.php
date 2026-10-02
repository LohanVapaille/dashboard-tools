<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripNote extends Model
{
    protected $fillable = ['trip_id', 'type', 'title', 'content', 'position'];

    protected $casts = [
        'content' => 'array',
    ];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }
}
