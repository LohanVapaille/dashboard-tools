<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Ligne du prévisionnel ajoutée à la main (key null) ou réglage d'une ligne calculée (montant, masquée). */
class TripBudgetLine extends Model
{
    public const GROUPS = ['logement', 'transport', 'activites', 'repas', 'autre'];

    protected $fillable = ['trip_id', 'key', 'group', 'label', 'amount', 'per_person', 'hidden'];

    protected $casts = [
        'amount' => 'float',
        'per_person' => 'boolean',
        'hidden' => 'boolean',
    ];
}
