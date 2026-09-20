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
    ];

    public function stay()
    {
        return $this->belongsTo(Stay::class);
    }

    public function activities()
    {
        return $this->hasMany(Activity::class)->orderBy('id');
    }
}