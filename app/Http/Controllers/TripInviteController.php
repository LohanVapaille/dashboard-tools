<?php
// app/Http/Controllers/TripInviteController.php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\TripMember;
use Illuminate\Http\Request;
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

        $guestTripIds = $request->session()->get('guest_trip_ids', []);
        $guestTripIds[] = $trip->id;
        $request->session()->put('guest_trip_ids', array_values(array_unique($guestTripIds)));

        return redirect()->route('trips.show', $trip->id);
    }

    public function joinAsUser(Request $request, string $token)
    {
        // Si l'utilisateur n'est pas connecté, on le redirige vers l'inscription/connexion
        // en sauvegardant son intention de rejoindre ce voyage (via Inertia/Session si besoin)
        if (!auth()->check()) {
            return redirect()->route('register'); // Ou route de login avec un retour vers l'invitation
        }

        $trip = Trip::where('share_token', $token)->firstOrFail();
        $user = auth()->user();

        // Si c'est le propriétaire, on le laisse simplement accéder au voyage
        if ($trip->user_id === $user->id) {
            return redirect()->route('trips.show', $trip->id);
        }

        // Vérifier si l'utilisateur est déjà dans trip_members
        $existingMember = TripMember::where('trip_id', $trip->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$existingMember) {
            // S'il avait été invité par email (donc ligne existante avec son email mais sans user_id)
            $pendingByEmail = TripMember::where('trip_id', $trip->id)
                ->whereNull('user_id')
                ->where('email', $user->email)
                ->first();

            if ($pendingByEmail) {
                $pendingByEmail->update([
                    'user_id' => $user->id,
                    'email' => null,
                    'status' => 'accepted'
                ]);
            } else {
                // Sinon, on l'ajoute automatiquement en lecture seule (viewer)
                TripMember::create([
                    'trip_id' => $trip->id,
                    'user_id' => $user->id,
                    'role' => 'viewer',
                    'status' => 'accepted',
                ]);
            }
        }

        return redirect()->route('trips.show', $trip->id);
    }
}