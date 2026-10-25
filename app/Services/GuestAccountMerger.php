<?php

namespace App\Services;

use App\Models\Trip;
use App\Models\TripParticipant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;

/**
 * Rattache au compte les voyages créés et rejoints en tant qu'invité,
 * quelle que soit la méthode de connexion (e-mail, inscription, Google).
 */
class GuestAccountMerger
{
    public function merge(User $user, Request $request): void
    {
        $guestToken = $request->cookie('guest_token');
        if (!$guestToken) {
            return;
        }

        DB::transaction(function () use ($user, $guestToken) {
            Trip::where('guest_token', $guestToken)->update(['user_id' => $user->id, 'guest_token' => null]);

            TripParticipant::with('trip')->where('guest_token', $guestToken)->get()->each(function (TripParticipant $participant) use ($user) {
                $alreadyMember = $participant->trip?->user_id === $user->id
                    || TripParticipant::where('trip_id', $participant->trip_id)->where('user_id', $user->id)->exists();

                // Déjà membre avec son compte : la participation d'invité devient inutile.
                $alreadyMember
                    ? $participant->delete()
                    : $participant->update(['user_id' => $user->id, 'guest_token' => null, 'guest_name' => null]);
            });
        });

        Cookie::queue(Cookie::forget('guest_token'));
    }
}
