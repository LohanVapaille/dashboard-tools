<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportMessage extends Model
{
    protected $fillable = ['support_conversation_id', 'author', 'author_name', 'body'];

    public function conversation()
    {
        return $this->belongsTo(SupportConversation::class, 'support_conversation_id');
    }

    public function present(): array
    {
        return [
            'id' => $this->id,
            'author' => $this->author,
            'author_name' => $this->author_name,
            'body' => $this->body,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
