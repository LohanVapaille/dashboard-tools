<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\TripUser;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TripController extends Controller
{
    public function index()
    {
        $trips = Trip::withCount('stays')->orderBy('start_date', 'desc')->get();

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
            // On stocke le cookie pour 1 an
            cookie()->queue('guest_token', $guestToken, 60 * 24 * 365);
        }

        // Création du voyage
        $trip = Trip::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'cover_image' => $validated['cover_image'] ?? null,
            'user_id' => $user?->id,
            'guest_token' => $user ? null : $guestToken,
            'share_token' => Str::random(32), // Token unique pour le partage
        ]);

        // Lier le créateur en tant qu'admin dans la table pivot trip_user
        TripUser::create([
            'trip_id' => $trip->id,
            'user_id' => $user?->id,
            'guest_token' => $user ? null : $guestToken,
            'role' => 'admin', // Le créateur est l'admin du voyage
        ]);

        return redirect()->route('trips.show', $trip->id);
    }

    public function show(Trip $trip)
    {
        $trip->load(['stays.days.activities', 'stays.days.blocks', 'transitions']);

        return Inertia::render('Trips/Show', [
            'trip' => $trip,
        ]);
    }

    public function update(Request $request, Trip $trip)
    {
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
        $trip->delete();

        return redirect()->route('trips.index');
    }

    // ==========================================
    // NOUVELLES MÉTHODES : GESTION DU PARTAGE
    // ==========================================

    public function join($share_token, Request $request)
    {
        $trip = Trip::where('share_token', $share_token)->firstOrFail();

        $user = $request->user();
        $guestToken = $request->cookie('guest_token');

        // Vérifier si l'utilisateur ou l'invité participe déjà au voyage
        $existingParticipation = TripUser::where('trip_id', $trip->id)
            ->when($user, fn($q) => $q->where('user_id', $user->id))
            ->when(!$user, fn($q) => $q->where('guest_token', $guestToken))
            ->first();

        if (!$existingParticipation) {
            // Règle : Non inscrit = 'viewer' (Read-only), Inscrit = 'editor'
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
        // S'assurer que le voyage a bien un share_token
        if (!$trip->share_token) {
            $trip->share_token = Str::random(32);
            $trip->save();
        }

        return response()->json([
            'share_url' => route('trips.join', $trip->share_token)
        ]);
    }
}