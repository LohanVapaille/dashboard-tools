<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Day extends Model
{
    protected $guarded = [];

    public function stay()
    {
        return $this->belongsTo(Stay::class);
    }
    public function activities()
    {
        return $this->hasMany(Activity::class)->orderBy('start_time');
    }
}
