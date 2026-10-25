<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Réservation faite chez un partenaire et rangée dans le voyage (billet, logement, activité). */
class TripReservation extends Model
{
    public const KINDS = ['flight', 'train', 'bus', 'car', 'ferry', 'stay', 'activity', 'other'];

    protected $fillable = [
        'trip_id', 'user_id', 'kind', 'title', 'provider', 'reference', 'starts_at', 'ends_at',
        'origin', 'destination', 'address', 'travelers', 'price', 'currency', 'url', 'notes', 'details',
    ];

    protected $casts = [
        'starts_at' => 'datetime:Y-m-d\TH:i',
        'ends_at' => 'datetime:Y-m-d\TH:i',
        'price' => 'float',
        'travelers' => 'integer',
        'details' => 'array',
    ];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }
}
