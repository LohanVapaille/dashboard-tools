<?php

namespace App\Http\Controllers;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

use App\Models\Trip;
use App\Models\TripUser;
use App\Models\TripMember;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TripController extends Controller
{
    use AuthorizesRequests;
    public function index(Request $request)
    {
        $user = Auth::user();
        $guestToken = $request->cookie('guest_token');

        $trips = Trip::withCount('stays')
            ->when($user, function ($query, $user) {
                // 1. Si l'utilisateur est connecté :
                // Ses propres voyages OU les voyages où il participe via la table pivot
                $query->where('user_id', $user->id)
                    ->orWhereHas('users', fn($q) => $q->where('users.id', $user->id));
            }, function ($query) use ($guestToken) {
                // 2. Si c'est un invité :
                // Uniquement si un guest_token existe, sinon collection vide pour ne rien fuiter
                if (!$guestToken) {
                    // Force une requête qui ne retourne rien si aucun cookie invité n'est présent
                    $query->whereRaw('1 = 0');
                    return;
                }

                // Les voyages créés par cet invité (guest_token) OU rejoints (via trip_users)
                $query->where('guest_token', $guestToken)
                    ->orWhereHas('tripUsers', fn($q) => $q->where('guest_token', $guestToken));
            })
            ->orderBy('start_date', 'desc')
            ->get();

        return Inertia::render('Trips/Index', [
            'trips' => $trips,
        ]);
    }
    public function store(Request $request)
    {
        // Valider les données du voyage
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'cover_image' => 'nullable|string',
        ]);

        $user = Auth::user();
        $guestToken = $request->cookie('guest_token');

        // Si l'utilisateur n'est ni connecté ni muni d'un guest_token, on en crée un
        if (!$user && !$guestToken) {
            $guestToken = (string) Str::uuid();
            cookie()->queue('guest_token', $guestToken, 60 * 24 * 365);
        }

        // Création du voyage (Privé par défaut : is_private => true)
        $trip = Trip::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'cover_image' => $validated['cover_image'] ?? null,
            'user_id' => $user?->id,
            'guest_token' => $user ? null : $guestToken,
            'is_private' => true, // Privé par défaut
            'share_token' => Str::random(32),
        ]);

        // Lier le créateur en tant qu'admin dans la table pivot trip_user
        TripUser::create([
            'trip_id' => $trip->id,
            'user_id' => $user?->id,
            'guest_token' => $user ? null : $guestToken,
            'role' => 'admin',
        ]);

        return redirect()->route('trips.show', $trip->id);
    }

    public function show(Trip $trip)
    {
        $this->authorize('view', $trip);

        $trip->load(['stays.days.activities', 'stays.days.blocks', 'transitions', 'users']);

        return Inertia::render('Trips/Show', [
            'trip' => $trip,
        ]);
    }

    // Récupérer la liste des membres et le lien de partage pour la modale
    // Récupérer la liste des membres et le lien de partage pour la modale
    public function members(Trip $trip)
    {
        $this->authorize('update', $trip);

        $members = $trip->members()->with('user:id,name,email')->get()->map(function ($member) {
            return [
                'id' => $member->id,
                'name' => $member->user->name ?? 'Invité par email',
                'email' => $member->user->email ?? $member->email,
                'role' => $member->role,
                'status' => $member->status,
                'type' => $member->user_id ? 'user' : 'guest'
            ];
        });

        return response()->json([
            'members' => $members,
            'share_url' => route('trips.invite.show', $trip->share_token),
        ]);
    }

    // Modifier le rôle d'un membre (editor / viewer)
    public function updateMemberRole(Request $request, Trip $trip, $memberId)
    {
        $this->authorize('update', $trip);

        $request->validate(['role' => 'required|in:editor,viewer']);

        $member = TripMember::where('trip_id', $trip->id)->where('id', $memberId)->firstOrFail();
        $member->update(['role' => $request->role]);

        return back();
    }

    // Supprimer l'accès d'un membre
    public function removeMember(Trip $trip, $memberId)
    {
        $this->authorize('update', $trip);

        $member = TripMember::where('trip_id', $trip->id)->where('id', $memberId)->firstOrFail();
        $member->delete();

        return back();
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

    public function join($share_token, Request $request)
    {
        $trip = Trip::where('share_token', $share_token)->firstOrFail();

        $user = $request->user();
        $guestToken = $request->cookie('guest_token');

        $existingParticipation = TripUser::where('trip_id', $trip->id)
            ->when($user, fn($q) => $q->where('user_id', $user->id))
            ->when(!$user, fn($q) => $q->where('guest_token', $guestToken))
            ->first();

        if (!$existingParticipation) {
            $role = $user ? 'editor' : 'viewer';

            TripUser::create([
                'trip_id' => $trip->id,
                'user_id' => $user?->id,
                'guest_token' => $user ? null : $guestToken,
                'role' => $role,
            ]);
        }

        return redirect()->route('trips.show', $trip->id);
    }

    public function generateShareLink(Trip $trip, Request $request)
    {
        $this->authorize('update', $trip);

        if (!$trip->share_token) {
            $trip->share_token = Str::random(32);
            $trip->save();
        }

        return response()->json([
            'share_url' => route('trips.join', $trip->share_token)
        ]);
    }
}