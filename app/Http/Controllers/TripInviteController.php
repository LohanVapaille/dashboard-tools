<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\TripParticipant;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Lien de partage d'un voyage.
 *
 * L'ouverture du lien (GET) n'a aucun effet : les robots d'aperçu des messageries
 * (WhatsApp, Messenger, Slack…) qui l'ouvrent ne créent plus de faux invités.
 * On ne rejoint le voyage qu'en validant le formulaire (POST), avec un pseudo si
 * l'on n'est pas connecté.
 */
class TripInviteController extends Controller
{
    private const GUEST_COOKIE_MINUTES = 60 * 24 * 365;

    public function show(Request $request, string $token)
    {
        $trip = Trip::with(['stays:id,trip_id,location_name', 'user:id,name', 'participants'])->where('share_token', $token)->firstOrFail();
        $user = $request->user();
        $guestToken = $request->cookie('guest_token');

        if ($trip->canView($user, $guestToken)) {
            return redirect()->route('trips.show', $trip);
        }

        if (!$user) {
            // Après connexion ou inscription, retour sur cette invitation.
            $request->session()->put('url.intended', route('trips.join', $token));
        }

        $members = $trip->participants->where('status', 'accepted');

        return Inertia::render('Trips/Invite/Show', [
            'trip' => [
                'title' => $trip->title,
                'description' => $trip->description,
                'start_date' => $trip->start_date,
                'end_date' => $trip->end_date,
                'destinations' => $trip->stays->pluck('location_name')->map(fn ($name) => Str::before($name, ','))->unique()->values(),
                'owner' => $trip->user?->name,
                'members_count' => $members->count() + 1,
            ],
            'token' => $token,
            'authUser' => $user ? ['name' => $user->name] : null,
            'guestName' => $request->cookie('guest_name'),
            'guestTripsRemaining' => $user ? null : max(0, TripController::GUEST_TRIP_LIMIT - TripController::guestTripCount($guestToken)),
            'guestTripLimit' => TripController::GUEST_TRIP_LIMIT,
        ]);
    }

    public function join(Request $request, string $token)
    {
        $trip = Trip::where('share_token', $token)->firstOrFail();
        $user = $request->user();
        $guestToken = $request->cookie('guest_token');

        if ($trip->canView($user, $guestToken)) {
            return redirect()->route('trips.show', $trip);
        }

        if ($user) {
            TripParticipant::firstOrCreate(
                ['trip_id' => $trip->id, 'user_id' => $user->id],
                ['role' => 'viewer', 'status' => 'accepted'],
            );

            return redirect()->route('trips.show', $trip)->with('status', 'Bienvenue dans « ' . $trip->title . ' » !');
        }

        $validated = $request->validate([
            'pseudo' => ['required', 'string', 'min:2', 'max:30', "regex:/^[\\pL\\pN][\\pL\\pN '._-]*$/u"],
        ], [
            'pseudo.required' => 'Choisissez un pseudo pour que les autres membres vous reconnaissent.',
            'pseudo.regex' => 'Le pseudo ne peut contenir que des lettres, chiffres, espaces, points, tirets et apostrophes.',
        ]);
        $pseudo = trim(preg_replace('/\s+/', ' ', $validated['pseudo']));

        if (!$guestToken) {
            $guestToken = (string) Str::uuid();
        }

        if (TripController::guestTripCount($guestToken) >= TripController::GUEST_TRIP_LIMIT) {
            return back()->withErrors([
                'guest_limit' => 'Vous avez atteint la limite de ' . TripController::GUEST_TRIP_LIMIT . ' voyages sans compte. Créez un compte gratuit pour rejoindre ce voyage.',
            ]);
        }

        try {
            TripParticipant::firstOrCreate(
                ['trip_id' => $trip->id, 'guest_token' => $guestToken],
                ['guest_name' => $pseudo, 'role' => 'viewer', 'status' => 'accepted'],
            );
        } catch (UniqueConstraintViolationException) {
            // Double clic ou double envoi simultané : la participation existe déjà.
        }

        return redirect()->route('trips.show', $trip)
            ->withCookie(cookie('guest_token', $guestToken, self::GUEST_COOKIE_MINUTES))
            ->withCookie(cookie('guest_name', $pseudo, self::GUEST_COOKIE_MINUTES))
            ->with('guestWarning', ['remaining' => max(0, TripController::GUEST_TRIP_LIMIT - TripController::guestTripCount($guestToken))]);
    }
}
