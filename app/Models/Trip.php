<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

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
        return $this->belongsToMany(User::class, 'trip_members')
            ->withPivot(['role', 'status', 'email'])
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


    protected static function booted()
    {
        static::creating(function (Trip $trip) {
            $trip->share_token = $trip->share_token ?: Str::random(32);
        });
    }

    public function members()
    {
        return $this->hasMany(TripMember::class);
    }

    // Si tu veux aussi lier directement aux utilisateurs via les membres :


    public function roleFor(?\App\Models\User $user): ?string
    {
        if (!$user) {
            return null;
        }

        if ($this->user_id === $user->id) {
            return 'owner';
        }

        return $this->members()->where('user_id', $user->id)->value('role');
    }

    public function canEdit(?\App\Models\User $user): bool
    {
        return in_array($this->roleFor($user), ['owner', 'editor'], true);
    }


}