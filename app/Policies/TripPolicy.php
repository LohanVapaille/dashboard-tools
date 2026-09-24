<?php

namespace App\Policies;

use App\Models\Trip;
use App\Models\User;

class TripPolicy
{
    // Détermine si l'utilisateur peut voir les détails du voyage
    public function view(?User $user, Trip $trip): bool
    {
        // 1. Si l'utilisateur connecté est le créateur du voyage -> ACCÈS AUTORISÉ
        if ($user && $trip->user_id === $user->id) {
            return true;
        }

        // 2. Si le voyage n'est pas privé -> Tout le monde peut le voir
        if (!$trip->is_private) {
            return true;
        }

        // 3. Si l'utilisateur fait partie des participants (via la table pivot)
        if ($user && $trip->users()->where('users.id', $user->id)->exists()) {
            return true;
        }

        // 4. Pour les invités non connectés (via le cookie guest_token)
        $guestToken = request()->cookie('guest_token');
        if ($guestToken) {
            if ($trip->guest_token === $guestToken) {
                return true;
            }
            if ($trip->tripUsers()->where('guest_token', $guestToken)->exists()) {
                return true;
            }
        }

        return false;
    }

    // Seul le créateur peut modifier
    public function update(?User $user, Trip $trip): bool
    {
        if ($user && $trip->user_id === $user->id) {
            return true;
        }

        $guestToken = request()->cookie('guest_token');
        if ($guestToken && $trip->guest_token === $guestToken) {
            return true;
        }

        return false;
    }

    // Seul le créateur peut supprimer
    public function delete(?User $user, Trip $trip): bool
    {
        if ($user && $trip->user_id === $user->id) {
            return true;
        }

        $guestToken = request()->cookie('guest_token');
        if ($guestToken && $trip->guest_token === $guestToken) {
            return true;
        }

        return false;
    }
}