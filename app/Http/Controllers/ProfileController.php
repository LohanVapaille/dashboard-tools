<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\FlightOrder;
use App\Models\StayOrder;
use App\Models\TripParticipant;
use App\Services\AvatarProcessor;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'stats' => [
                'trips' => $user->trips()->count(),
                'joined' => TripParticipant::where('user_id', $user->id)->count(),
                'bookings' => FlightOrder::where('user_id', $user->id)->whereNotNull('paid_at')->count()
                    + StayOrder::where('user_id', $user->id)->whereNotNull('paid_at')->count(),
                'member_since' => $user->created_at?->toDateString(),
                'premium' => $user->hasPremiumAccess(),
            ],
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit')->with('status', 'Profil mis à jour.');
    }

    /** Photo de profil envoyée depuis l'appareil. */
    public function updateAvatar(Request $request, AvatarProcessor $avatars): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:8192', 'dimensions:min_width=64,min_height=64'],
        ], [
            'avatar.image' => 'Le fichier doit être une image.',
            'avatar.max' => 'L’image ne doit pas dépasser 8 Mo.',
            'avatar.dimensions' => 'L’image est trop petite (64 × 64 pixels minimum).',
        ]);

        $user = $request->user();

        try {
            $path = $avatars->store($request->file('avatar'));
        } catch (\RuntimeException) {
            throw ValidationException::withMessages(['avatar' => 'Cette image n’a pas pu être lue. Essayez un fichier JPG ou PNG.']);
        }

        $avatars->deleteIfLocal($user->avatar);
        // Chemin relatif : l'image s'affiche quel que soit l'hôte (artisan serve, WAMP, production).
        $user->update(['avatar' => '/storage/' . $path]);

        return back()->with('status', 'Photo de profil mise à jour.');
    }

    public function destroyAvatar(Request $request, AvatarProcessor $avatars): RedirectResponse
    {
        $avatars->deleteIfLocal($request->user()->avatar);
        $request->user()->update(['avatar' => null]);

        return back()->with('status', 'Photo de profil supprimée.');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        app(AvatarProcessor::class)->deleteIfLocal($user->avatar);
        $user->trips()->delete();
        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
