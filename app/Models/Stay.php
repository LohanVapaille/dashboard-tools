<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Stay extends Model
{
    protected $guarded = [];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }
    public function days()
    {
        return $this->hasMany(Day::class)->orderBy('date');
    }
}
