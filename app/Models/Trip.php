<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Trip extends Model
{
    protected $guarded = [];

    public function stays()
    {
        return $this->hasMany(Stay::class)->orderBy('order_index');
    }
    public function transitions()
    {
        return $this->hasMany(StayTransition::class);
    }
}
