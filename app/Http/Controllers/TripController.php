<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Trip;
use App\Models\TripParticipant;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TripController extends Controller
{
    use AuthorizesRequests;

    // Nombre maximum de voyages (créés + rejoints) pour un utilisateur sans compte
    private const GUEST_TRIP_LIMIT = 3;

    public function index(Request $request)
    {
        $user = Auth::user();
        $guestToken = $request->cookie('guest_token');

        $owned = $user
            ? Trip::withCount('stays')->where('user_id', $user->id)->orderBy('start_date', 'desc')->get()
            : ($guestToken
                ? Trip::withCount('stays')->where('guest_token', $guestToken)->orderBy('start_date', 'desc')->get()
                : collect());

        $joinedQuery = Trip::withCount('stays')->where('user_id', '!=', $user?->id ?? 0);

        if ($user) {
            $joinedQuery->whereHas('participants', fn($q) => $q->where('user_id', $user->id))
                ->with(['participants' => fn($q) => $q->where('user_id', $user->id)]);
        } elseif ($guestToken) {
            $joinedQuery->where(function ($q) use ($guestToken) {
                $q->where('guest_token', '!=', $guestToken)->orWhereNull('guest_token');
            })
                ->whereHas('participants', fn($q) => $q->where('guest_token', $guestToken))
                ->with(['participants' => fn($q) => $q->where('guest_token', $guestToken)]);
        } else {
            $joinedQuery->whereRaw('1 = 0');
        }

        $joined = $joinedQuery->orderBy('start_date', 'desc')->get()->map(function ($trip) {
            $trip->my_role = $trip->participants->first()?->role;
            unset($trip->participants);
            return $trip;
        });

        return Inertia::render('Trips/Index', [
            'ownedTrips' => $owned,
            'joinedTrips' => $joined,
            'guestTripsRemaining' => $user ? null : max(0, self::GUEST_TRIP_LIMIT - $this->guestTripCount($guestToken)),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'cover_image' => 'nullable|string',
        ]);

        $user = Auth::user();
        $guestToken = $request->cookie('guest_token');

        if (!$user && !$guestToken) {
            $guestToken = (string) Str::uuid();
            cookie()->queue('guest_token', $guestToken, 60 * 24 * 365);
        }

        if (!$user && $this->guestTripCount($guestToken) >= self::GUEST_TRIP_LIMIT) {
            return back()->withErrors([
                'guest_limit' => 'Vous avez atteint la limite de ' . self::GUEST_TRIP_LIMIT . ' voyages sans compte. Créez un compte gratuit pour continuer.',
            ]);
        }

        $trip = Trip::create([
            ...$validated,
            'user_id' => $user?->id,
            'guest_token' => $user ? null : $guestToken,
            'is_private' => true,
        ]);

        $redirect = redirect()->route('trips.show', $trip->id);

        if (!$user) {
            $redirect->with('guestWarning', [
                'remaining' => max(0, self::GUEST_TRIP_LIMIT - $this->guestTripCount($guestToken)),
            ]);
        }

        return $redirect;
    }

    public function show(Trip $trip)
    {
        $this->authorize('view', $trip);

        $user = Auth::user();
        $guestToken = request()->cookie('guest_token');

        $trip->load(['stays.days.activities', 'stays.days.blocks', 'transitions', 'participants.user:id,name']);

        $trip->permissions = [
            'isOwner' => $trip->isOwner($user, $guestToken),
            'role' => $trip->roleFor($user, $guestToken),
            'canEdit' => $trip->canEdit($user, $guestToken),
            'canViewShareLink' => $trip->canViewShareLink($user, $guestToken),
            'canManageAccess' => $trip->canManageAccess($user, $guestToken),
            'canManageRoles' => $trip->canManageRoles($user, $guestToken),
        ];

        $trip->avatars = $trip->participants
            ->where('status', 'accepted')
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->user->name ?? ($p->email ?? 'Invité'),
                'role' => $p->role,
            ])->values();

        return Inertia::render('Trips/Show', [
            'trip' => $trip,
            'guestWarning' => session('guestWarning'),
        ]);
    }

    public function update(Request $request, Trip $trip)
    {
        $this->authorize('update', $trip);

        $validated = $request->validate([
            'title' => 'required|string|max:191',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $trip->update($validated);

        return back();
    }

    public function destroy(Trip $trip)
    {
        $this->authorize('delete', $trip);
        $trip->delete();
        return redirect()->route('trips.index');
    }

    public function leave(Trip $trip, Request $request)
    {
        $user = Auth::user();
        $guestToken = $request->cookie('guest_token');

        abort_if($trip->isOwner($user, $guestToken), 403, 'Le propriétaire ne peut pas quitter son propre voyage.');

        TripParticipant::where('trip_id', $trip->id)
            ->when($user, fn($q) => $q->where('user_id', $user->id))
            ->when(!$user, fn($q) => $q->where('guest_token', $guestToken))
            ->delete();

        return redirect()->route('trips.index');
    }

    public function join($share_token, Request $request)
    {
        $trip = Trip::where('share_token', $share_token)->firstOrFail();

        $user = $request->user();
        $guestToken = $request->cookie('guest_token');

        if (!$user && !$guestToken) {
            $guestToken = (string) Str::uuid();
            cookie()->queue('guest_token', $guestToken, 60 * 24 * 365);
        }

        if ($trip->isOwner($user, $guestToken)) {
            return redirect()->route('trips.show', $trip->id);
        }

        $existing = TripParticipant::where('trip_id', $trip->id)
            ->when($user, fn($q) => $q->where('user_id', $user->id))
            ->when(!$user, fn($q) => $q->where('guest_token', $guestToken))
            ->first();

        if (!$existing) {
            if (!$user && $this->guestTripCount($guestToken) >= self::GUEST_TRIP_LIMIT) {
                return redirect()->route('trips.index')->withErrors([
                    'guest_limit' => 'Vous avez atteint la limite de ' . self::GUEST_TRIP_LIMIT . ' voyages sans compte. Créez un compte gratuit pour rejoindre plus de voyages.',
                ]);
            }

            TripParticipant::create([
                'trip_id' => $trip->id,
                'user_id' => $user?->id,
                'guest_token' => $user ? null : $guestToken,
                'role' => 'viewer',
                'status' => 'accepted',
            ]);
        }

        $redirect = redirect()->route('trips.show', $trip->id);

        if (!$user) {
            $redirect->with('guestWarning', [
                'remaining' => max(0, self::GUEST_TRIP_LIMIT - $this->guestTripCount($guestToken)),
            ]);
        }

        return $redirect;
    }

    // Récupère juste l'URL du lien : owner, admin, editor
    public function shareLink(Trip $trip)
    {
        $this->authorize('viewShareLink', $trip);

        return response()->json([
            'share_url' => route('trips.join', $trip->share_token),
        ]);
    }

    // Régénère le token de partage : owner, admin
    public function generateShareLink(Trip $trip)
    {
        $this->authorize('manageAccess', $trip);

        if (!$trip->share_token) {
            $trip->share_token = Str::random(32);
            $trip->save();
        }

        return response()->json(['share_url' => route('trips.join', $trip->share_token)]);
    }

    // Total de voyages d'un invité : ceux qu'il possède + ceux qu'il a rejoints
    private function guestTripCount(?string $guestToken): int
    {
        if (!$guestToken) {
            return 0;
        }

        $owned = Trip::where('guest_token', $guestToken)->count();
        $joined = TripParticipant::where('guest_token', $guestToken)->distinct('trip_id')->count('trip_id');

        return $owned + $joined;
    }
}