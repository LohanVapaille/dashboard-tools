<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Models\TripUser;
use App\Models\Trip;

class CheckTripAccess
{
    public function handle(Request $request, Closure $next, string $action = 'create')
    {
        $user = $request->user();

        // Récupérer ou créer un token invité dans les cookies
        $guestToken = $request->cookie('guest_token');
        if (!$user && !$guestToken) {
            $guestToken = (string) Str::uuid();
            cookie()->queue('guest_token', $guestToken, 60 * 24 * 365); // 1 an
        }

        // Règle : Pour partager, il faut obligatoirement être inscrit
        if ($action === 'share' && !$user) {
            return response()->json(['message' => 'Veuillez vous inscrire pour partager ce voyage.'], 403);
        }

        // Compter les voyages de l'utilisateur (via user_id ou guest_token)
        if (!$user) {
            $createdCount = Trip::where('guest_token', $guestToken)->count();
            $joinedCount = TripUser::where('guest_token', $guestToken)->count();
            $totalTrips = $createdCount + $joinedCount;

            // Limite de 2 voyages max pour les non-inscrits
            if ($action === 'create_or_join' && $totalTrips >= 2) {
                return response()->json([
                    'message' => 'Limite de 2 voyages atteinte. Créez un compte pour continuer sans limite !',
                    'require_register' => true
                ], 403);
            }
        }

        return $next($request);
    }
}