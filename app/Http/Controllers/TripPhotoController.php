<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\TripPhoto;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TripPhotoController extends Controller
{
    use AuthorizesRequests;

    public function store(Request $request, Trip $trip)
    {
        // Route hors du middleware auth : sinon l'invité ne reçoit qu'un « Unauthenticated. » peu parlant.
        abort_unless($request->user(), 401, 'Connectez-vous ou créez un compte gratuit pour ajouter des photos à l’album du voyage.');
        $this->authorize('update', $trip);
        abort_if(
            !$trip->hasPremium($request->user()) && $trip->photos()->count() >= Trip::FREE_PHOTO_LIMIT,
            403,
            'La version gratuite permet ' . Trip::FREE_PHOTO_LIMIT . ' photos par voyage. Passez à Premium pour un album illimité.'
        );
        $validated = $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:10240'],
            'caption' => ['nullable', 'string', 'max:191'],
        ]);

        $photo = $trip->photos()->create([
            'user_id' => $request->user()?->id,
            'path' => $validated['photo']->store('trips/' . $trip->id, 'public'),
            'caption' => $validated['caption'] ?? null,
        ]);

        return response()->json(['photo' => $photo->fresh()]);
    }

    public function destroy(TripPhoto $photo)
    {
        $this->authorize('update', $photo->trip);
        Storage::disk('public')->delete($photo->path);
        $photo->delete();
        return back();
    }
}
