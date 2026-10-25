<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Trip;
use App\Models\TripParticipant;
use App\Services\Trips\TripPublication;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TripController extends Controller
{
    use AuthorizesRequests;

    // Nombre maximum de voyages (créés + rejoints) pour un utilisateur sans compte
    public const GUEST_TRIP_LIMIT = 3;

    public function index(Request $request)
    {
        $user = Auth::user();
        $guestToken = $request->cookie('guest_token');

        $owned = $user
            ? Trip::withCount('stays')->where('user_id', $user->id)->orderBy('start_date', 'desc')->get()
            : ($guestToken
                ? Trip::withCount('stays')->where('guest_token', $guestToken)->orderBy('start_date', 'desc')->get()
                : collect());

        $joinedQuery = Trip::withCount('stays')->where('user_id', '!=', $user?->id ?? 0);

        if ($user) {
            $joinedQuery->whereHas('participants', fn($q) => $q->where('user_id', $user->id))
                ->with(['participants' => fn($q) => $q->where('user_id', $user->id)]);
        } elseif ($guestToken) {
            $joinedQuery->where(function ($q) use ($guestToken) {
                $q->where('guest_token', '!=', $guestToken)->orWhereNull('guest_token');
            })
                ->whereHas('participants', fn($q) => $q->where('guest_token', $guestToken))
                ->with(['participants' => fn($q) => $q->where('guest_token', $guestToken)]);
        } else {
            $joinedQuery->whereRaw('1 = 0');
        }

        $joined = $joinedQuery->orderBy('start_date', 'desc')->get()->map(function ($trip) {
            $trip->my_role = $trip->participants->first()?->role;
            unset($trip->participants);
            return $trip;
        });

        // Aperçu de la page « Parcourir » : derniers voyages publiés par d'autres voyageurs.
        $publication = app(TripPublication::class);
        $favorites = TripPublication::favoriteIds($user);
        $community = Trip::published()
            ->with('user:id,name,avatar')->withCount('copies')
            ->when($user, fn ($query) => $query->where(fn ($q) => $q->where('user_id', '!=', $user->id)->orWhereNull('user_id')))
            ->latest('published_at')->limit(3)->get()
            ->map(fn (Trip $trip) => $publication->card($trip, $favorites));

        return Inertia::render('Trips/Index', [
            'ownedTrips' => $owned,
            'joinedTrips' => $joined,
            'guestTripsRemaining' => $user ? null : max(0, self::GUEST_TRIP_LIMIT - self::guestTripCount($guestToken)),
            'community' => ['trips' => $community, 'total' => Trip::published()->count()],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'cover_image' => 'nullable|string',
            'travelers' => 'nullable|integer|min:1|max:16',
            'origin' => 'nullable|array',
            'origin.name' => 'required_with:origin|string|max:191',
            'origin.latitude' => 'required_with:origin|numeric|between:-90,90',
            'origin.longitude' => 'required_with:origin|numeric|between:-180,180',
            'destinations' => 'nullable|array|max:10',
            'destinations.*.name' => 'required|string|max:191',
            'destinations.*.latitude' => 'required|numeric|between:-90,90',
            'destinations.*.longitude' => 'required|numeric|between:-180,180',
            'destinations.*.nights' => 'nullable|integer|min:0|max:90',
        ], [
            'end_date.after_or_equal' => 'La date de retour doit suivre la date de départ.',
            'destinations.*.latitude.required' => 'Choisissez chaque destination dans la liste de suggestions.',
        ]);

        $destinations = collect($validated['destinations'] ?? []);
        $validated['title'] = trim((string) ($validated['title'] ?? '')) ?: $this->defaultTitle($destinations);

        $user = Auth::user();
        $guestToken = $request->cookie('guest_token');

        if (!$user && !$guestToken) {
            $guestToken = (string) Str::uuid();
            cookie()->queue('guest_token', $guestToken, 60 * 24 * 365);
        }

        if (!$user && self::guestTripCount($guestToken) >= self::GUEST_TRIP_LIMIT) {
            return back()->withErrors([
                'guest_limit' => 'Vous avez atteint la limite de ' . self::GUEST_TRIP_LIMIT . ' voyages sans compte. Créez un compte gratuit pour continuer.',
            ]);
        }

        $trip = DB::transaction(function () use ($validated, $destinations, $user, $guestToken) {
            $trip = Trip::create([
                ...Arr::only($validated, ['title', 'description', 'start_date', 'end_date', 'cover_image', 'travelers']),
                'origin_name' => $validated['origin']['name'] ?? null,
                'origin_latitude' => $validated['origin']['latitude'] ?? null,
                'origin_longitude' => $validated['origin']['longitude'] ?? null,
                'user_id' => $user?->id,
                'guest_token' => $user ? null : $guestToken,
                'is_private' => true,
            ]);

            $this->createStays($trip, $destinations);

            return $trip;
        });

        $redirect = redirect()->route('trips.show', $trip->id);

        if (!$user) {
            $redirect->with('guestWarning', [
                'remaining' => max(0, self::GUEST_TRIP_LIMIT - self::guestTripCount($guestToken)),
            ]);
        }

        return $redirect;
    }

    public function show(Trip $trip, TripPublication $publication)
    {
        $user = Auth::user();
        $guestToken = request()->cookie('guest_token');

        // Voyage publié : lisible par tous, mais seulement en lecture seule et sans données personnelles.
        // La policy « view » reste réservée aux membres (budget détaillé, carnet, photos, recherches…).
        $public = !$trip->canView($user, $guestToken) && $trip->isPublished();
        if (!$public) {
            $this->authorize('view', $trip);
        }

        $trip->load(['stays.days.activities', 'stays.days.blocks', 'transitions', 'notes', 'photos', 'reservations', 'participants.user:id,name', 'user:id,name,avatar']);

        $trip->permissions = [
            'isOwner' => $trip->isOwner($user, $guestToken),
            'role' => $trip->roleFor($user, $guestToken),
            'canEdit' => $trip->canEdit($user, $guestToken),
            'canViewShareLink' => $trip->canViewShareLink($user, $guestToken),
            'canManageAccess' => $trip->canManageAccess($user, $guestToken),
            'canManageRoles' => $trip->canManageRoles($user, $guestToken),
            'isPublicView' => $public,
        ];

        $trip->premium = !$public && $trip->hasPremium($user);
        $trip->publication = $trip->isPublished() ? [
            'published_at' => $trip->published_at->toIso8601String(),
            'days' => TripPublication::days($trip),
            'cover' => $trip->coverUrl(),
            'author' => ['name' => TripPublication::authorName($trip), 'avatar' => $trip->user?->avatar],
            'budget' => $trip->published_summary['budget'] ?? null,
            'copies' => $trip->copies()->count(),
            'favorited' => $user ? $user->favoriteTrips()->whereKey($trip->id)->exists() : false,
        ] : null;
        $trip->setRelation('user', null);
        $trip->makeHidden(['published_summary']);

        if ($public) {
            $publication->scrubForPublic($trip);
        }

        // Pays de chaque étape : suggestions eSIM, location de voiture… adaptées à la destination.
        $places = app(\App\Services\Places\MajorCities::class);
        $trip->stays->each(fn ($stay) => $stay->setAttribute('country', $places->countryOfPlace($stay->location_name)));

        $trip->avatars = $trip->participants
            ->where('status', 'accepted')
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->user->name ?? $p->guest_name ?? ($p->email ?? 'Invité'),
                'role' => $p->role,
            ])->values();

        return Inertia::render('Trips/Show', [
            'trip' => $trip,
            'guestWarning' => session('guestWarning'),
        ]);
    }

    /** Carnet de voyage imprimable (ou enregistrable en PDF depuis le navigateur) : fonction Premium. */
    public function printable(Trip $trip)
    {
        $this->authorize('view', $trip);

        if (!$trip->hasPremium(Auth::user())) {
            return redirect()->route('billing.show')->with('status', 'Le carnet de voyage PDF fait partie de l’offre Premium.');
        }

        $trip->load(['stays.days.activities', 'transitions.fromStay:id,location_name', 'transitions.toStay:id,location_name', 'notes']);

        return Inertia::render('Trips/Print', [
            'trip' => $trip,
            'budget' => (new \App\Services\Budget\TripBudget($trip))->summary(),
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
            'travelers' => 'sometimes|integer|min:1|max:16',
            'origin_name' => 'sometimes|nullable|string|max:255',
            'origin_latitude' => 'sometimes|nullable|numeric|between:-90,90|required_with:origin_name',
            'origin_longitude' => 'sometimes|nullable|numeric|between:-180,180|required_with:origin_name',
        ]);

        $trip->update($validated);

        // Durée ou voyageurs changés : l'aperçu public (filtres jours / budget) suit.
        if ($trip->isPublished()) {
            rescue(fn () => app(TripPublication::class)->publish($trip->fresh()), report: true);
        }

        return back();
    }

    public function destroy(Trip $trip)
    {
        $this->authorize('delete', $trip);
        $trip->delete();
        return redirect()->route('trips.index');
    }

    public function leave(Trip $trip, Request $request)
    {
        $user = Auth::user();
        $guestToken = $request->cookie('guest_token');

        abort_if($trip->isOwner($user, $guestToken), 403, 'Le propriétaire ne peut pas quitter son propre voyage.');

        TripParticipant::where('trip_id', $trip->id)
            ->when($user, fn($q) => $q->where('user_id', $user->id))
            ->when(!$user, fn($q) => $q->where('guest_token', $guestToken))
            ->delete();

        return redirect()->route('trips.index');
    }

    // Récupère juste l'URL du lien : owner, admin, editor
    public function shareLink(Trip $trip)
    {
        $this->authorize('viewShareLink', $trip);

        return response()->json([
            'share_url' => route('trips.join', $trip->share_token),
        ]);
    }

    // Régénère le token de partage : l'ancien lien cesse de fonctionner (owner, admin)
    public function generateShareLink(Trip $trip)
    {
        $this->authorize('manageAccess', $trip);

        $trip->forceFill(['share_token' => Str::random(32)])->save();

        return response()->json(['share_url' => route('trips.join', $trip->share_token)]);
    }

    // Total de voyages d'un invité : ceux qu'il possède + ceux qu'il a rejoints
    /**
     * Une étape par destination. Les nuits non précisées sont réparties
     * équitablement sur la durée du voyage ; le départ d'une étape est l'arrivée de la suivante.
     */
    private function createStays(Trip $trip, Collection $destinations): void
    {
        if ($destinations->isEmpty()) {
            return;
        }

        $start = Carbon::parse($trip->start_date);
        $totalNights = $start->diffInDays(Carbon::parse($trip->end_date));
        $fixed = $destinations->sum(fn ($destination) => (int) ($destination['nights'] ?? 0));
        $flexible = $destinations->filter(fn ($destination) => !isset($destination['nights']))->count();
        $share = $flexible ? intdiv(max(0, $totalNights - $fixed), $flexible) : 0;
        $remainder = $flexible ? max(0, $totalNights - $fixed) % $flexible : 0;

        $arrival = $start->copy();
        foreach ($destinations->values() as $index => $destination) {
            $nights = isset($destination['nights']) ? (int) $destination['nights'] : $share + ($remainder-- > 0 ? 1 : 0);
            // La dernière étape se termine toujours à la date de fin du voyage.
            $departure = $index === $destinations->count() - 1
                ? Carbon::parse($trip->end_date)->max($arrival)
                : $arrival->copy()->addDays($nights);

            $stay = $trip->stays()->create([
                'location_name' => $destination['name'],
                'latitude' => $destination['latitude'],
                'longitude' => $destination['longitude'],
                'arrival_date' => $arrival->toDateString(),
                'departure_date' => $departure->toDateString(),
            ]);
            $stay->generateDays();
            $arrival = $departure->copy();
        }
    }

    private function defaultTitle(Collection $destinations): string
    {
        $names = $destinations->map(fn ($destination) => trim(Str::before($destination['name'], ',')))->unique()->values();

        return match ($names->count()) {
            0 => 'Mon prochain voyage',
            1 => 'Voyage à ' . $names[0],
            default => $names->slice(0, -1)->implode(', ') . ' & ' . $names->last(),
        };
    }

    public static function guestTripCount(?string $guestToken): int
    {
        if (!$guestToken) {
            return 0;
        }

        $owned = Trip::where('guest_token', $guestToken)->count();
        $joined = TripParticipant::where('guest_token', $guestToken)->distinct('trip_id')->count('trip_id');

        return $owned + $joined;
    }
}
