<?php

namespace App\Services\Trips;

use App\Models\Activity;
use App\Models\Day;
use App\Models\DayBlock;
use App\Models\Stay;
use App\Models\StayTransition;
use App\Models\Trip;
use App\Models\TripBudgetLine;
use App\Models\User;
use App\Services\Budget\TripBudget;
use App\Services\Places\MajorCities;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Voyages publiés sur la page « Parcourir » : instantané public, vue en lecture seule et reprise par
 * un autre voyageur. Rien de personnel ne sort : ni photos, ni participants, ni dépenses nominatives,
 * ni notes libres, ni références de réservation, ni ville de départ de l'auteur.
 */
class TripPublication
{
    /** Blocs de journée repris et montrés : contenu pratique, sans notes ni réservations personnelles. */
    public const PUBLIC_BLOCK_TYPES = ['checklist', 'budget'];

    public function publish(Trip $trip): void
    {
        $summary = $this->snapshot($trip);

        $trip->forceFill([
            'published_at' => $trip->published_at ?? now(),
            'published_days' => $summary['days'],
            'published_budget' => $summary['budget']['per_person'],
            'published_summary' => $summary,
            'is_private' => false,
        ])->save();
    }

    public function unpublish(Trip $trip): void
    {
        $trip->forceFill(['published_at' => null, 'is_private' => true])->save();
    }

    /** Nombre de jours du voyage, départ et retour inclus. */
    public static function days(Trip $trip): int
    {
        return (int) round(Carbon::parse($trip->start_date)->startOfDay()->diffInDays(Carbon::parse($trip->end_date)->startOfDay())) + 1;
    }

    /** « Lohan Vapaille » → « Lohan V. » : l'auteur est reconnaissable sans être identifiable. */
    public static function authorName(Trip $trip): string
    {
        $parts = preg_split('/\s+/', trim((string) $trip->user?->name)) ?: [];
        if (!$trip->user || !$parts || $parts[0] === '') {
            return 'Voyageur anonyme';
        }

        return count($parts) > 1 ? $parts[0] . ' ' . mb_strtoupper(mb_substr(end($parts), 0, 1)) . '.' : $parts[0];
    }

    /** Résumé public : étapes, durée et budget agrégé par poste (aucun nom, aucun « qui doit quoi »). */
    public function snapshot(Trip $trip): array
    {
        $budget = (new TripBudget($trip))->summary();
        $places = app(MajorCities::class);

        $groups = array_fill_keys(TripBudgetLine::GROUPS, 0.0);
        foreach ($budget['planned'] as $line) {
            $groups[$line['group']] = round(($groups[$line['group']] ?? 0) + $line['amount'], 2);
        }
        $spent = $trip->expenses->groupBy('category')->map(fn ($expenses) => round($expenses->sum(fn ($expense) => (float) $expense->amount), 2))->all();
        $travelers = $budget['travelers'];
        // Prévisionnel s'il est renseigné, sinon les dépenses réelles.
        $reference = $budget['planned_total'] > 0 ? $budget['planned_total'] : $budget['spent_total'];

        $stays = $trip->stays->map(fn (Stay $stay) => [
            'name' => trim(Str::before($stay->location_name, ',')),
            'place' => $stay->location_name,
            'country' => $places->countryOfPlace($stay->location_name)['name'] ?? null,
            'nights' => (int) round(Carbon::parse($stay->arrival_date)->diffInDays(Carbon::parse($stay->departure_date))),
            'latitude' => (float) $stay->latitude,
            'longitude' => (float) $stay->longitude,
        ])->values()->all();

        return [
            'days' => self::days($trip),
            'travelers' => $travelers,
            'stays' => $stays,
            'countries' => collect($stays)->pluck('country')->filter()->unique()->values()->all(),
            'activities' => $trip->stays->sum(fn ($stay) => $stay->days->sum(fn ($day) => $day->activities->count())),
            'transports' => $trip->transitions->pluck('transport_mode')->filter()->unique()->values()->all(),
            'budget' => [
                'currency' => 'EUR',
                'total' => round($reference, 2),
                'per_person' => round($reference / max(1, $travelers), 2),
                'planned_total' => $budget['planned_total'],
                'spent_total' => $budget['spent_total'],
                'groups' => $groups,
                'spent_by_category' => $spent,
            ],
        ];
    }

    /** Identifiants des voyages mis en favoris par l'utilisateur, pour marquer les cartes en une requête. */
    public static function favoriteIds(?User $user): array
    {
        return $user ? $user->favoriteTrips()->pluck('trips.id')->map(fn ($id) => (int) $id)->all() : [];
    }

    /** Fiche de la grille « Parcourir ». */
    public function card(Trip $trip, array $favoriteIds = []): array
    {
        $summary = $trip->published_summary ?? [];

        return [
            'id' => $trip->id,
            'title' => $trip->title,
            'description' => Str::limit((string) $trip->description, 220),
            'cover' => $trip->coverUrl(),
            'author' => ['name' => self::authorName($trip), 'avatar' => $trip->user?->avatar],
            'days' => $trip->published_days,
            'travelers' => $summary['travelers'] ?? $trip->travelers,
            'stays' => $summary['stays'] ?? [],
            'countries' => $summary['countries'] ?? [],
            'activities' => $summary['activities'] ?? 0,
            'transports' => $summary['transports'] ?? [],
            'budget' => $summary['budget'] ?? null,
            'copies' => $trip->copies_count ?? 0,
            'favorited' => in_array((int) $trip->id, $favoriteIds, true),
            'published_at' => $trip->published_at?->toIso8601String(),
        ];
    }

    /** Retire d'un voyage chargé tout ce qui ne doit pas être vu par un visiteur. */
    public function scrubForPublic(Trip $trip): Trip
    {
        foreach (['photos', 'notes', 'reservations', 'participants'] as $relation) {
            $trip->setRelation($relation, collect());
        }

        $trip->stays->each(function (Stay $stay) {
            $stay->setAttribute('notes', null);
            $stay->days->each(function (Day $day) {
                $day->setAttribute('notes', null);
                $day->setRelation('blocks', $day->blocks->whereIn('type', self::PUBLIC_BLOCK_TYPES)->values());
            });
        });
        $trip->transitions->each(fn (StayTransition $transition) => $transition->forceFill([
            'reference' => null, 'seat' => null, 'booking_url' => null, 'notes' => null,
        ]));

        return $trip->forceFill(['origin_name' => null, 'origin_latitude' => null, 'origin_longitude' => null])
            ->makeHidden(['share_token', 'guest_token', 'user_id', 'budget_target', 'copied_from_id']);
    }

    /**
     * Reprend un voyage publié aux dates choisies : étapes, jours, activités, trajets et budget prévu
     * sont décalés d'autant de jours ; la durée reste identique.
     */
    public function duplicate(Trip $source, Carbon $start, ?User $user, ?string $guestToken): Trip
    {
        $source->loadMissing(['stays.days.activities', 'stays.days.blocks', 'transitions']);
        $offset = (int) round(Carbon::parse($source->start_date)->startOfDay()->diffInDays($start->copy()->startOfDay(), false));
        $shift = fn ($value) => $value ? Carbon::parse($value)->addDays($offset) : null;
        $date = fn ($value) => $value ? $shift($value)->toDateString() : null;

        return DB::transaction(function () use ($source, $user, $guestToken, $shift, $date) {
            $copy = Trip::query()->forceCreate([
                'title' => $source->title,
                'description' => $source->description,
                'start_date' => $date($source->start_date),
                'end_date' => $date($source->end_date),
                'travelers' => $source->travelers,
                'visible_tabs' => $source->visible_tabs,
                'user_id' => $user?->id,
                'guest_token' => $user ? null : $guestToken,
                'is_private' => true,
                'copied_from_id' => $source->id,
            ]);

            $stays = [];
            $keys = [];
            foreach ($source->stays as $stay) {
                $newStay = Stay::query()->forceCreate([
                    'trip_id' => $copy->id,
                    'location_name' => $stay->location_name,
                    'latitude' => $stay->latitude,
                    'longitude' => $stay->longitude,
                    'arrival_date' => $date($stay->arrival_date),
                    'departure_date' => $date($stay->departure_date),
                    'accommodation_cost' => $stay->accommodation_cost,
                    'order_index' => $stay->order_index,
                ]);
                $stays[$stay->id] = $newStay->id;
                $keys['stay-' . $stay->id] = 'stay-' . $newStay->id;

                foreach ($stay->days as $day) {
                    $newDay = Day::query()->forceCreate([
                        'stay_id' => $newStay->id,
                        'date' => $date($day->date),
                        'day_number' => $day->day_number,
                        'hidden_periods' => $day->hidden_periods,
                    ]);

                    foreach ($day->activities as $activity) {
                        $newActivity = Activity::query()->forceCreate([
                            'day_id' => $newDay->id,
                            'user_id' => $user?->id,
                            ...collect($activity->getAttributes())->only([
                                'period', 'title', 'category', 'price', 'order_index', 'description',
                                'start_time', 'location_name', 'source_url', 'latitude', 'longitude',
                            ])->all(),
                        ]);
                        $keys['activity-' . $activity->id] = 'activity-' . $newActivity->id;
                    }

                    foreach ($day->blocks->whereIn('type', self::PUBLIC_BLOCK_TYPES) as $block) {
                        DayBlock::query()->forceCreate([
                            'day_id' => $newDay->id,
                            'type' => $block->type,
                            'title' => $block->title,
                            'content' => $block->content,
                            'position' => $block->position,
                        ]);
                    }
                }
            }

            foreach ($source->transitions as $transition) {
                if (!isset($stays[$transition->from_stay_id], $stays[$transition->to_stay_id])) {
                    continue;
                }
                $newTransition = StayTransition::query()->forceCreate([
                    'trip_id' => $copy->id,
                    'from_stay_id' => $stays[$transition->from_stay_id],
                    'to_stay_id' => $stays[$transition->to_stay_id],
                    'departure_at' => $shift($transition->departure_at),
                    'arrival_at' => $shift($transition->arrival_at),
                    // Pas de référence, siège, lien de réservation ni notes : propres à l'auteur.
                    ...collect($transition->getAttributes())->only([
                        'transport_mode', 'distance_km', 'duration_minutes', 'cost', 'carrier',
                        'service_number', 'departure_place', 'arrival_place', 'baggage',
                    ])->all(),
                ]);
                $keys['transition-' . $transition->id] = 'transition-' . $newTransition->id;
            }

            // Budget prévu : lignes libres et montants ajustés des étapes, activités et trajets repris.
            foreach (TripBudgetLine::where('trip_id', $source->id)->get() as $line) {
                if ($line->key !== null && !isset($keys[$line->key])) {
                    continue;
                }
                TripBudgetLine::query()->forceCreate([
                    'trip_id' => $copy->id,
                    'key' => $line->key === null ? null : $keys[$line->key],
                    ...collect($line->getAttributes())->only(['group', 'label', 'amount', 'per_person', 'hidden'])->all(),
                ]);
            }

            return $copy;
        });
    }
}
