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
        'source_url',
        'start_time',
        'latitude',
        'longitude',
        'time',
        'notes',
        'order_index',
    ];

    protected static function booted()
    {
        // Une nouvelle activité se place à la fin de sa période.
        static::creating(function (Activity $activity) {
            if (!$activity->isDirty('order_index')) {
                $activity->order_index = (int) static::where('day_id', $activity->day_id)
                    ->where('period', $activity->period)
                    ->max('order_index') + 1;
            }
        });
    }

    public function day()
    {
        return $this->belongsTo(Day::class);
    }
}