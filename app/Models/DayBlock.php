<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DayBlock extends Model
{
    public const TYPES = ['memo', 'booking', 'checklist', 'budget'];

    protected $fillable = ['day_id', 'type', 'title', 'content', 'position'];

    protected $casts = [
        'content' => 'array',
    ];

    public static function defaults(string $type): array
    {
        return match ($type) {
            'memo' => ['title' => 'Pense-bête', 'content' => ['text' => '']],
            'booking' => ['title' => 'Réservation', 'content' => ['url' => '', 'reference' => '', 'time' => '']],
            'checklist' => ['title' => 'Checklist', 'content' => ['items' => []]],
            'budget' => ['title' => 'Budget du jour', 'content' => ['items' => []]],
        };
    }

    public function day()
    {
        return $this->belongsTo(Day::class);
    }
}