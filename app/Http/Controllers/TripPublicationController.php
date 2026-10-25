<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Services\AvatarProcessor;
use App\Services\Trips\TripPublication;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Publication d'un voyage sur la page « Parcourir » : réservée à son propriétaire. */
class TripPublicationController extends Controller
{
    public function store(Request $request, Trip $trip, TripPublication $publication)
    {
        $this->authorizeOwner($request, $trip);
        if ($trip->stays()->doesntExist()) {
            throw ValidationException::withMessages(['publication' => 'Ajoutez au moins une étape avant de publier ce voyage.']);
        }

        $firstTime = !$trip->isPublished();
        // Republier met à jour l'aperçu (étapes, budget) sans changer la date de publication.
        $publication->publish($trip);

        return back()->with('status', $firstTime ? 'Votre voyage est publié sur la page Parcourir.' : 'La publication est à jour.');
    }

    public function destroy(Request $request, Trip $trip, TripPublication $publication)
    {
        $this->authorizeOwner($request, $trip);
        $publication->unpublish($trip);

        return back()->with('status', 'Votre voyage n’est plus publié.');
    }

    /** Image d'aperçu (format rectangle) : seulement pour un voyage publié. */
    public function storeCover(Request $request, Trip $trip, AvatarProcessor $images)
    {
        $this->authorizeOwner($request, $trip);
        if (!$trip->isPublished()) {
            throw ValidationException::withMessages(['cover' => 'Publiez le voyage avant d’ajouter une image d’aperçu.']);
        }
        $request->validate([
            'cover' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240', 'dimensions:min_width=600,min_height=300'],
        ], [
            'cover.max' => 'L’image ne doit pas dépasser 10 Mo.',
            'cover.dimensions' => 'L’image est trop petite (600 × 300 pixels minimum).',
        ]);

        $old = $trip->cover_image;
        $trip->forceFill(['cover_image' => $images->storeTripCover($request->file('cover'), $trip->id)])->save();
        $this->deleteCoverFile($old);

        return back()->with('status', 'Image d’aperçu enregistrée.');
    }

    public function destroyCover(Request $request, Trip $trip)
    {
        $this->authorizeOwner($request, $trip);
        $this->deleteCoverFile($trip->cover_image);
        $trip->forceFill(['cover_image' => null])->save();

        return back()->with('status', 'Image d’aperçu retirée.');
    }

    /** Seuls les fichiers envoyés via l'aperçu sont supprimés (pas une URL saisie ailleurs). */
    private function deleteCoverFile(?string $path): void
    {
        if ($path && str_starts_with($path, 'trips/')) {
            Storage::disk('public')->delete($path);
        }
    }

    private function authorizeOwner(Request $request, Trip $trip): void
    {
        abort_unless($trip->isOwner($request->user(), $request->cookie('guest_token')), 403, 'Seul le propriétaire peut publier ce voyage.');
    }
}
