<?php
// app/Models/TripMember.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripMember extends Model
{
    protected $fillable = ['trip_id', 'user_id', 'email', 'role', 'status'];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}