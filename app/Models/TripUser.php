<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class TripUser extends Pivot
{
    protected $table = 'trip_user';

    protected $fillable = [
        'trip_id',
        'user_id',
        'guest_token',
        'role',
    ];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}