<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Models\TripUser;
use App\Models\TripMember;
use App\Models\Trip;

class CheckTripAccess
{
    public function handle(Request $request, Closure $next, string $action = 'create')
    {
        $user = $request->user();
        $guestToken = $request->cookie('guest_token');

        if (!$user && !$guestToken) {
            $guestToken = (string) Str::uuid();
            cookie()->queue('guest_token', $guestToken, 60 * 24 * 365);
        }

        if ($action === 'share' && !$user) {
            return response()->json(['message' => 'Veuillez vous inscrire pour partager ce voyage.'], 403);
        }

        // Règle : Vérification des droits d'écriture
        if ($action === 'edit') {
            $trip = $request->route('trip');

            if (!$trip && $request->route('stay')) {
                $trip = $request->route('stay')->trip;
            }
            if (!$trip && $request->route('day')) {
                $trip = $request->route('day')->stay->trip;
            }
            if (!$trip && $request->route('activity')) {
                $trip = $request->route('activity')->day->stay->trip;
            }
            // Pour les routes comme /stays/{stay} où le paramètre s'appelle 'stay'
            if (!$trip && $request->route('stay')) {
                $stay = $request->route('stay');
                $trip = is_object($stay) ? $stay->trip : Trip::find($stay)?->trip;
            }

            if ($trip) {
                $isOwner = $user && $trip->user_id === $user->id;
                $role = null;

                if ($user) {
                    // 1. Chercher dans TripUser
                    $tripUser = TripUser::where('trip_id', $trip->id)->where('user_id', $user->id)->first();
                    $role = $tripUser?->role;

                    // 2. Si non trouvé, chercher dans TripMember
                    if (!$role) {
                        $tripMember = TripMember::where('trip_id', $trip->id)->where('user_id', $user->id)->first();
                        $role = $tripMember?->role;
                    }
                } else if ($guestToken) {
                    // 3. Chercher pour un invité sans compte via guest_token
                    $tripUser = TripUser::where('trip_id', $trip->id)->where('guest_token', $guestToken)->first();
                    $role = $tripUser?->role;
                }

                // Autoriser si propriétaire OU si le rôle est 'admin' ou 'editor'
                $canEdit = $isOwner || in_array($role, ['admin', 'editor']);

                if (!$canEdit) {
                    return response()->json([
                        'message' => 'Accès refusé : vous êtes en mode lecture seule.'
                    ], 403);
                }
            }
        }

        return $next($request);
    }
}