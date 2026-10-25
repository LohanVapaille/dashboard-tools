<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar', // <-- Ajoute ceci pour autoriser l'enregistrement de l'avatar
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'subscription_ends_at' => 'datetime',
        ];
    }

    /** Membre de l'équipe qui répond au chat d'assistance (SUPPORT_ADMIN_EMAILS). */
    public function isSupportAgent(): bool
    {
        return in_array(strtolower((string) $this->email), array_map('strtolower', config('support.admins', [])), true);
    }

    public function hasPremiumAccess(): bool
    {
        return in_array($this->subscription_status, ['active', 'trialing'], true)
            && (!$this->subscription_ends_at || $this->subscription_ends_at->isFuture());
    }

    public function trips()
    {
        return $this->hasMany(Trip::class); // ou belongsToMany selon ta structure de base de données
    }
}