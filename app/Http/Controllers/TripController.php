<?php

namespace App\Http\Controllers;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

use App\Models\Trip;
use App\Models\TripUser;
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

        // On filtre pour que chaque utilisateur (ou invité) ne voie que ses propres voyages
        $trips = Trip::withCount('stays')
            ->when($user, function ($query, $user) {
                // Si connecté : on récupère les voyages créés par l'utilisateur OU où il est participant via la table pivot
                $query->where('user_id', $user->id)
                    ->orWhereHas('users', fn($q) => $q->where('users.id', $user->id));
            }, function ($query) use ($guestToken) {
                // Si invité : on récupère via le guest_token du cookie
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

        $trip->load(['stays.days.activities', 'stays.days.blocks', 'transitions']);

        return Inertia::render('Trips/Show', [
            'trip' => $trip,
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