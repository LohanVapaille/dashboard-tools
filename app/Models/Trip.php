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
        'user_id',
        'guest_token',
        'is_private',
    ];

    protected $casts = [
        'is_private' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function stays()
    {
        return $this->hasMany(Stay::class)->orderBy('arrival_date');
    }

    public function transitions()
    {
        return $this->hasMany(StayTransition::class);
    }

    public function participants()
    {
        return $this->hasMany(TripParticipant::class);
    }

    protected static function booted()
    {
        static::creating(function (Trip $trip) {
            $trip->share_token = $trip->share_token ?: Str::random(32);
        });
    }

    // Un invité est propriétaire via guest_token, un utilisateur via user_id.
    public function isOwner($user, ?string $guestToken = null): bool
    {
        if ($user) {
            return $this->user_id === $user->id;
        }

        return $guestToken !== null && $this->guest_token === $guestToken;
    }

    public function participantFor($user, ?string $guestToken = null): ?TripParticipant
    {
        if ($user) {
            return $this->participants->firstWhere('user_id', $user->id);
        }
        return $guestToken ? $this->participants->firstWhere('guest_token', $guestToken) : null;
    }

    public function roleFor($user, ?string $guestToken = null): ?string
    {
        if ($this->isOwner($user, $guestToken)) {
            return 'owner';
        }
        return $this->participantFor($user, $guestToken)?->role;
    }

    public function canView($user, ?string $guestToken = null): bool
    {
        return $this->isOwner($user, $guestToken) || $this->roleFor($user, $guestToken) !== null;
    }

    public function canEdit($user, ?string $guestToken = null): bool
    {
        return $this->isOwner($user, $guestToken) || in_array($this->roleFor($user, $guestToken), ['admin', 'editor']);
    }

    // Voir uniquement le lien de partage (copier/coller) : owner, admin, editor
    public function canViewShareLink($user, ?string $guestToken = null): bool
    {
        return $this->isOwner($user, $guestToken) || in_array($this->roleFor($user, $guestToken), ['admin', 'editor']);
    }

    // Lister les membres + inviter + régénérer le lien : owner, admin
    public function canManageAccess($user, ?string $guestToken = null): bool
    {
        return $this->isOwner($user, $guestToken) || $this->roleFor($user, $guestToken) === 'admin';
    }

    // Changer un rôle / révoquer un accès : owner uniquement (y compris owner-invité)
    public function canManageRoles($user, ?string $guestToken = null): bool
    {
        return $this->isOwner($user, $guestToken);
    }
}