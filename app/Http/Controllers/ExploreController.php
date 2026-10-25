<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Services\Trips\TripPublication;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/** Page « Parcourir » : voyages publiés par la communauté, à reprendre à ses propres dates. */
class ExploreController extends Controller
{
    public const SORTS = ['recent', 'popular', 'budget', 'days'];

    public function index(Request $request, TripPublication $publication)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'days_min' => ['nullable', 'integer', 'min:1', 'max:365'],
            'days_max' => ['nullable', 'integer', 'min:1', 'max:365'],
            'budget_max' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'sort' => ['nullable', 'in:' . implode(',', self::SORTS)],
        ]);

        $query = Trip::published()->with('user:id,name,avatar')->withCount('copies');

        if ($search = trim((string) ($filters['q'] ?? ''))) {
            $query->where(fn ($where) => $where
                ->where('title', 'like', "%{$search}%")
                ->orWhereHas('stays', fn ($stays) => $stays->where('location_name', 'like', "%{$search}%")));
        }
        if (isset($filters['days_min'])) {
            $query->where('published_days', '>=', $filters['days_min']);
        }
        if (isset($filters['days_max'])) {
            $query->where('published_days', '<=', $filters['days_max']);
        }
        if (isset($filters['budget_max'])) {
            $query->where('published_budget', '<=', $filters['budget_max']);
        }

        match ($filters['sort'] ?? 'recent') {
            'popular' => $query->orderByDesc('copies_count')->latest('published_at'),
            'budget' => $query->orderBy('published_budget')->latest('published_at'),
            'days' => $query->orderBy('published_days')->latest('published_at'),
            default => $query->latest('published_at'),
        };

        $page = $query->paginate(12)->withQueryString();
        $favorites = TripPublication::favoriteIds($request->user());
        $data = [
            'trips' => collect($page->items())->map(fn (Trip $trip) => $publication->card($trip, $favorites))->all(),
            'next' => $page->nextPageUrl(),
            'total' => $page->total(),
        ];

        // « Voir plus de voyages » : page suivante en JSON, ajoutée à la grille.
        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json($data);
        }

        return Inertia::render('Explore/Index', [
            ...$data,
            'filters' => $filters + ['sort' => 'recent'],
        ]);
    }

    /** Reprend un voyage publié : la durée est imposée, seules les dates changent. */
    public function duplicate(Request $request, Trip $trip, TripPublication $publication)
    {
        abort_unless($trip->isPublished(), 404);

        $validated = $request->validate([
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ], [
            'start_date.after_or_equal' => 'Choisissez une date de départ à partir d’aujourd’hui.',
        ]);

        $days = TripPublication::days($trip);
        $start = Carbon::parse($validated['start_date'])->startOfDay();
        $expectedEnd = $start->copy()->addDays($days - 1);
        if (!Carbon::parse($validated['end_date'])->isSameDay($expectedEnd)) {
            throw ValidationException::withMessages([
                'end_date' => "Ce voyage dure {$days} jour" . ($days > 1 ? 's' : '') . " : la date de retour doit être le {$expectedEnd->format('d/m/Y')}.",
            ]);
        }

        $user = $request->user();
        $guestToken = $request->cookie('guest_token');
        if (!$user) {
            if (!$guestToken) {
                $guestToken = (string) Str::uuid();
                cookie()->queue('guest_token', $guestToken, 60 * 24 * 365);
            }
            if (TripController::guestTripCount($guestToken) >= TripController::GUEST_TRIP_LIMIT) {
                throw ValidationException::withMessages([
                    'start_date' => 'Vous avez atteint la limite de ' . TripController::GUEST_TRIP_LIMIT . ' voyages sans compte. Créez un compte gratuit pour reprendre ce voyage.',
                ]);
            }
        }

        $copy = $publication->duplicate($trip, $start, $user, $guestToken);

        return redirect()->route('trips.show', $copy)->with('status', 'Le voyage est copié à vos dates : modifiez-le librement, l’original ne change pas.');
    }
}
