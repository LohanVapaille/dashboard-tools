<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Stay extends Model
{
    protected $fillable = [
        'trip_id',
        'location_name',
        'latitude',
        'longitude',
        'arrival_date',
        'departure_date',
        'notes',
    ];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function days()
    {
        return $this->hasMany(Day::class)->orderBy('date');
    }
}