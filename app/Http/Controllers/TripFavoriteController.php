<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use Illuminate\Http\Request;

/** Favoris de la page « Parcourir » : un compte est nécessaire pour les retrouver ensuite. */
class TripFavoriteController extends Controller
{
    public function toggle(Request $request, Trip $trip)
    {
        $user = $request->user();
        abort_unless($user, 401, 'Connectez-vous ou créez un compte gratuit pour enregistrer vos voyages favoris.');
        abort_unless($trip->isPublished(), 404);

        $changes = $user->favoriteTrips()->toggle($trip->id);

        return response()->json(['favorited' => in_array($trip->id, $changes['attached'])]);
    }
}
