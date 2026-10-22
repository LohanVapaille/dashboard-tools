<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripExpenseShare extends Model
{
    protected $fillable = ['trip_expense_id', 'trip_budget_member_id', 'amount'];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function expense()
    {
        return $this->belongsTo(TripExpense::class, 'trip_expense_id');
    }

    public function member()
    {
        return $this->belongsTo(TripBudgetMember::class, 'trip_budget_member_id');
    }
}
