<?php
// app/Models/TripParticipant.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripParticipant extends Model
{
    protected $fillable = ['trip_id', 'user_id', 'guest_token', 'email', 'role', 'status'];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}