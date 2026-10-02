<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\TripParticipant;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class TripMemberController extends Controller
{
    use AuthorizesRequests;

    public function index(Trip $trip)
    {
        $this->authorize('manageAccess', $trip);

        $members = $trip->participants()->with('user:id,name,email')->get()->map(fn($p) => [
            'id' => $p->id,
            'name' => $p->user->name ?? 'Invité par e-mail',
            'email' => $p->user->email ?? $p->email,
            'role' => $p->role,
            'status' => $p->status,
            'type' => $p->user_id ? 'user' : 'guest',
        ]);

        return response()->json([
            'members' => $members,
            'share_url' => route('trips.join', $trip->share_token),
        ]);
    }

    public function store(Request $request, Trip $trip)
    {
        $this->authorize('manageAccess', $trip);

        $validated = $request->validate([
            'email' => 'required|email',
            'role' => 'required|in:editor,viewer', // pas d'admin direct par invitation
        ]);

        $user = User::where('email', $validated['email'])->first();

        if ($trip->isOwner($user)) {
            return response()->json(['message' => 'Cette personne est déjà propriétaire du voyage.'], 422);
        }

        $participant = TripParticipant::firstOrNew([
            'trip_id' => $trip->id,
            'user_id' => $user?->id,
            'email' => $user ? null : $validated['email'],
        ]);

        $participant->role = $validated['role'];
        $participant->status = $user ? 'accepted' : 'pending';
        $participant->save();

        return response()->json(['message' => 'Invitation envoyée.']);
    }

    public function update(Request $request, Trip $trip, TripParticipant $member)
    {
        $this->authorize('manageRoles', $trip);

        // Empêche de modifier un membre appartenant à un autre voyage
        abort_if($member->trip_id !== $trip->id, 404);

        $request->validate([
            'role' => 'required|in:admin,editor,viewer', // <-- 'admin' était manquant, c'était le bug
        ]);

        $member->update(['role' => $request->role]);

        return back();
    }

    public function destroy(Trip $trip, TripParticipant $member)
    {
        $this->authorize('manageRoles', $trip);

        abort_if($member->trip_id !== $trip->id, 404);

        $member->delete();

        return back();
    }
}