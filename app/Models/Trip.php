<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Trip extends Model
{
    protected $fillable = [
        'title',
        'description',
        'start_date',
        'end_date',
    ];

    public function stays()
    {
        return $this->hasMany(Stay::class)->orderBy('arrival_date');
    }

    public function transitions()
    {
        return $this->hasMany(StayTransition::class);
    }
}