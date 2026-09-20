<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Activity extends Model
{
    protected $fillable = [
        'day_id',
        'period',
        'category',
        'title',
        'description',
        'price',
        'location_name',
        'latitude',
        'longitude',
        'time',
        'notes',
    ];

    public function day()
    {
        return $this->belongsTo(Day::class);
    }
}