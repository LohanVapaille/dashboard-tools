<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StayTransition extends Model
{
    protected $guarded = [];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function fromStay()
    {
        return $this->belongsTo(Stay::class, 'from_stay_id');
    }

    public function toStay()
    {
        return $this->belongsTo(Stay::class, 'to_stay_id');
    }
}
