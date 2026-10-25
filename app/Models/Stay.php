<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


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
        'accommodation_cost',
    ];

    protected $casts = [
        'accommodation_cost' => 'decimal:2',
    ];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function days()
    {
        return $this->hasMany(Day::class)->orderBy('date');
    }

    /** Crée un jour par date entre l'arrivée et le départ (inclus), numérotés à partir de 1. */
    public function generateDays(): void
    {
        $date = \Carbon\Carbon::parse($this->arrival_date);
        $end = \Carbon\Carbon::parse($this->departure_date);
        $dayNumber = 1;

        while ($date->lte($end)) {
            $this->days()->create(['date' => $date->toDateString(), 'day_number' => $dayNumber++]);
            $date->addDay();
        }
    }
}