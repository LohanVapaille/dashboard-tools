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
        'user_id',       // Permet de lier le voyage à un utilisateur inscrit
        'guest_token',   // Permet de lier le voyage à un invité non inscrit (cookie)
        'is_private',    // Définit si le voyage est privé ou non (par défaut true)
    ];

    protected $casts = [
        'is_private' => 'boolean',
    ];

    // Relation avec l'utilisateur créateur
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Relation avec les participants (table pivot trip_user)
    public function users()
    {
        return $this->belongsToMany(User::class, 'trip_user')
            ->withPivot('role', 'guest_token')
            ->withTimestamps();
    }

    public function tripUsers()
    {
        return $this->hasMany(TripUser::class);
    }

    public function stays()
    {
        return $this->hasMany(Stay::class)->orderBy('arrival_date');
    }

    public function transitions()
    {
        return $this->hasMany(StayTransition::class);
    }
}