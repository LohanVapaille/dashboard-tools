<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class SupportConversation extends Model
{
    use Prunable;

    public const TOPICS = [
        'reservation' => 'Réservation ou billet',
        'paiement' => 'Paiement et remboursement',
        'compte' => 'Mon compte',
        'programme' => 'Programme et IA',
        'bug' => 'Problème technique',
        'partenariat' => 'Partenariat',
        'autre' => 'Autre question',
    ];

    protected $fillable = ['token', 'user_id', 'guest_token', 'trip_id', 'name', 'email', 'topic', 'status', 'last_message_at', 'agent_read_at', 'customer_read_at'];

    protected $hidden = ['guest_token'];

    protected $casts = [
        'last_message_at' => 'datetime',
        'agent_read_at' => 'datetime',
        'customer_read_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(fn (SupportConversation $conversation) => $conversation->token ??= Str::random(48));
    }

    /** Conservation annoncée dans la politique de confidentialité : 3 ans après le dernier échange. */
    public function prunable()
    {
        return static::where('last_message_at', '<', now()->subYears(3));
    }

    public function getRouteKeyName(): string
    {
        return 'token';
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class)->orderBy('id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function topicLabel(): string
    {
        return self::TOPICS[$this->topic] ?? $this->topic;
    }

    public function present(bool $forAgent = false): array
    {
        $this->loadMissing('messages');

        return [
            'token' => $this->token,
            'id' => $this->id,
            'name' => $this->name,
            'email' => $forAgent ? $this->email : null,
            'topic' => $this->topic,
            'topic_label' => $this->topicLabel(),
            'status' => $this->status,
            'trip' => $forAgent && $this->trip ? ['id' => $this->trip->id, 'title' => $this->trip->title] : null,
            'registered' => (bool) $this->user_id,
            'last_message_at' => $this->last_message_at?->toIso8601String(),
            'unread' => $forAgent
                ? $this->messages->where('author', 'customer')->filter(fn ($message) => !$this->agent_read_at || $message->created_at->gt($this->agent_read_at))->count()
                : $this->messages->where('author', 'agent')->filter(fn ($message) => !$this->customer_read_at || $message->created_at->gt($this->customer_read_at))->count(),
            'messages' => $this->messages->map->present()->values()->all(),
        ];
    }
}
