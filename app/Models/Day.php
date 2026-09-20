<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Day extends Model
{
    protected $fillable = [
        'stay_id',
        'date',
        'day_number',
        'notes',
        'hidden_periods',
    ];

    protected $casts = [
        'hidden_periods' => 'array',
    ];

    public function stay()
    {
        return $this->belongsTo(Stay::class);
    }

    public function activities()
    {
        return $this->hasMany(Activity::class)->orderBy('id');
    }

    public function blocks()
    {
        return $this->hasMany(DayBlock::class)->orderBy('position');
    }
}