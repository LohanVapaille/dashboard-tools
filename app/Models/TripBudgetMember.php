<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripBudgetMember extends Model
{
    protected $fillable = ['trip_id', 'name', 'user_id', 'guest_token'];

    protected $hidden = ['guest_token'];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function paidExpenses()
    {
        return $this->hasMany(TripExpense::class, 'paid_by');
    }

    public function shares()
    {
        return $this->hasMany(TripExpenseShare::class);
    }

    // Personne ajoutée à la main (pas un compte ni un invité du voyage).
    public function isCustom(): bool
    {
        return $this->user_id === null && $this->guest_token === null;
    }
}
