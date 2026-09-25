<?php
// app/Http/Controllers/TripMemberController.php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\TripMember;
use App\Models\User;
use Illuminate\Http\Request;

class TripMemberController extends Controller
{
    public function index(Trip $trip)
    {
        $this->authorizeOwner($trip);

        $members = $trip->members()
            ->with('user:id,name,email')
            ->get()
            ->map(fn(TripMember $member) => [
                'id' => $member->id,
                'name' => $member->user->name ?? null,
                'email' => $member->user->email ?? $member->email,
                'role' => $member->role,
                'status' => $member->status,
            ]);

        return response()->json([
            'members' => $members,
            'share_url' => route('trips.invite.show', $trip->share_token),
        ]);
    }

    public function store(Request $request, Trip $trip)
    {
        $this->authorizeOwner($trip);

        $data = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', 'in:editor,viewer'],
        ]);

        $user = User::where('email', $data['email'])->first();

        TripMember::updateOrCreate(
            [
                'trip_id' => $trip->id,
                'user_id' => $user?->id,
                'email' => $user ? null : $data['email'],
            ],
            [
                'role' => $data['role'],
                'status' => $user ? 'accepted' : 'pending',
            ],
        );

        return response()->json(['ok' => true]);
    }

    public function update(Request $request, Trip $trip, TripMember $member)
    {
        $this->authorizeOwner($trip);

        $data = $request->validate([
            'role' => ['required', 'in:editor,viewer'],
        ]);

        $member->update(['role' => $data['role']]);

        return response()->json(['ok' => true]);
    }

    public function destroy(Trip $trip, TripMember $member)
    {
        $this->authorizeOwner($trip);

        $member->delete();

        return response()->json(['ok' => true]);
    }

    private function authorizeOwner(Trip $trip): void
    {
        abort_unless($trip->user_id === auth()->id(), 403);
    }
}