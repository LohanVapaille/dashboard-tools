<?php
// app/Http/Controllers/TripInviteController.php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\TripUser;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TripInviteController extends Controller
{
    public function show(string $token)
    {
        $trip = Trip::where('share_token', $token)->firstOrFail();

        return Inertia::render('Trips/Invite/Show', [
            'trip' => [
                'id' => $trip->id,
                'title' => $trip->title,
                'description' => $trip->description,
            ],
            'token' => $token,
            'auth_user' => auth()->user()
                ? ['id' => auth()->id(), 'name' => auth()->user()->name]
                : null,
        ]);
    }

    public function joinAsGuest(Request $request, string $token)
    {
        $trip = Trip::where('share_token', $token)->firstOrFail();

        // 1. Récupérer ou créer le guest_token dans les cookies
        $guestToken = $request->cookie('guest_token');
        if (!$guestToken) {
            $guestToken = (string) Str::uuid();
            cookie()->queue('guest_token', $guestToken, 60 * 24 * 365); // 1 an
        }

        // 2. Vérifier si l'invité n'est pas déjà enregistré sur ce voyage
        $existing = TripUser::where('trip_id', $trip->id)
            ->where('guest_token', $guestToken)
            ->first();

        // 3. S'il n'y est pas, on l'ajoute en mode 'viewer' (lecture seule)
        if (!$existing && $trip->user_id !== auth()->id()) {
            TripUser::create([
                'trip_id' => $trip->id,
                'user_id' => null,
                'guest_token' => $guestToken,
                'role' => 'viewer', // <--- Rôle lecture seule
            ]);
        }

        return redirect()->route('trips.show', $trip->id);
    }
}