<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripExpense extends Model
{
    public const CATEGORIES = ['activite', 'logement', 'transport', 'repas', 'courses', 'autre'];

    protected $fillable = ['trip_id', 'paid_by', 'title', 'category', 'amount', 'split_mode', 'spent_on'];

    protected $casts = [
        'amount' => 'decimal:2',
        'spent_on' => 'date:Y-m-d',
    ];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function payer()
    {
        return $this->belongsTo(TripBudgetMember::class, 'paid_by');
    }

    public function shares()
    {
        return $this->hasMany(TripExpenseShare::class);
    }
}
