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
        $this->authorize('update', $trip);
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
