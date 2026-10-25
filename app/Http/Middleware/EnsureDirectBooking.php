<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Bloque panier et paiement tant que la vente directe n'est pas activée (modèle partenaires). */
class EnsureDirectBooking
{
    public function handle(Request $request, Closure $next)
    {
        if (!config('commerce.direct_booking')) {
            $message = 'La réservation se fait directement chez nos partenaires, qui sont vos vendeurs.';

            return $request->expectsJson()
                ? response()->json(['message' => $message], 403)
                : redirect()->route('trips.index')->with('status', $message);
        }

        return $next($request);
    }
}
