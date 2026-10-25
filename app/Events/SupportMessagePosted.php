<?php

namespace App\Events;

use App\Models\SupportConversation;
use App\Models\SupportMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

/**
 * Nouveau message (ou changement d'état) diffusé en direct : au client sur le canal de sa conversation
 * (nommé d'après un jeton secret), et à l'équipe sur le canal privé des agents.
 */
class SupportMessagePosted implements ShouldBroadcastNow
{
    public function __construct(public SupportConversation $conversation, public ?SupportMessage $message = null)
    {
    }

    public function broadcastOn(): array
    {
        return [new Channel('support.' . $this->conversation->token), new PrivateChannel('support.agents')];
    }

    public function broadcastAs(): string
    {
        return 'support.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'token' => $this->conversation->token,
            'status' => $this->conversation->status,
            'message' => $this->message?->present(),
        ];
    }
}
