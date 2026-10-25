<?php

namespace App\Services\AI;

use App\Models\Stay;
use App\Models\Trip;
use Carbon\CarbonPeriod;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;

/**
 * Programme proposé par l'IA : séjours existants complétés d'activités, et nouveaux
 * séjours créés sur les nuits encore libres (un séjour par lieu où l'on dort).
 * Utilisé pour nettoyer la réponse du modèle puis la prévisualisation renvoyée par le client.
 */
class ItineraryPlan
{
    public const PERIODS = ['matin', 'midi', 'apres_midi', 'soir', 'nuit'];
    public const CATEGORIES = ['transport', 'hebergement', 'camping', 'repas', 'visite', 'loisir', 'autre'];
    public const TRANSPORT_MODES = ['car', 'train', 'flight', 'bus', 'ferry'];
    public const MAX_ACTIVITIES_PER_DAY = 3;
    public const MAX_NEW_STAYS = 15;

    private ActivityDeduplicator $dedupe;

    public function __construct(private Trip $trip)
    {
        $this->trip->loadMissing(['stays.days.activities', 'stays.days.blocks']);
    }

    /** Un séjour encore vide (ni activité ni bloc) peut être redécoupé en plusieurs étapes par l'IA. */
    public function isReplaceable(Stay $stay): bool
    {
        return $stay->days->every(fn ($day) => $day->activities->isEmpty() && $day->blocks->isEmpty());
    }

    /** Ce que le modèle doit savoir pour adapter sa proposition au voyage. */
    public function context(string $interests): array
    {
        $stays = $this->trip->stays;

        return [
            'mode' => $stays->every(fn (Stay $stay) => $this->isReplaceable($stay))
                ? 'voyage_complet'
                : ($this->freePeriods() ? 'completer' : 'activites_seulement'),
            'title' => $this->trip->title,
            'description' => $this->trip->description,
            'start_date' => $this->date($this->trip->start_date),
            'end_date' => $this->date($this->trip->end_date),
            'travelers' => $this->trip->travelers ?: 1,
            'origin' => $this->trip->origin_name,
            'interests' => $interests,
            'existing_stays' => $stays->map(fn (Stay $stay) => [
                'id' => $stay->id,
                'location_name' => $stay->location_name,
                'arrival_date' => $this->date($stay->arrival_date),
                'departure_date' => $this->date($stay->departure_date),
                'accommodation_cost_known' => $stay->accommodation_cost !== null,
                'replaceable' => $this->isReplaceable($stay),
                'days' => $stay->days->map(fn ($day) => [
                    'date' => $this->date($day->date),
                    'existing_activities' => $day->activities->map(fn ($activity) => trim($activity->title . ' (' . $activity->period . ($activity->location_name ? ', ' . $activity->location_name : '') . ')'))->all(),
                ])->all(),
            ])->values()->all(),
            'free_periods' => $this->freePeriods(),
        ];
    }

    /** Périodes du voyage sans aucun séjour pour la nuit, ex. [{from: 2026-05-01, to: 2026-05-04}]. */
    public function freePeriods(): array
    {
        $taken = $this->trip->stays->flatMap(fn (Stay $stay) => $this->occupied($stay->arrival_date, $stay->departure_date))->flip();
        $periods = [];
        $current = null;

        foreach ($this->occupied($this->trip->start_date, $this->trip->end_date) as $night) {
            if (isset($taken[$night])) {
                $current = null;
                continue;
            }
            $next = Carbon::parse($night)->addDay()->toDateString();
            if ($current !== null) {
                $periods[$current]['to'] = $next;
            } else {
                $current = count($periods);
                $periods[] = ['from' => $night, 'to' => $next];
            }
        }

        // Voyage d'une journée : la « nuit » occupée est le jour même, on ne déborde pas après la fin.
        $end = $this->date($this->trip->end_date);

        return array_map(fn ($period) => ['from' => $period['from'], 'to' => min($period['to'], $end)], $periods);
    }

    /**
     * Garde uniquement ce qui est cohérent avec le voyage : séjours existants retrouvés par id,
     * nouveaux séjours dans les dates du voyage sans chevaucher une nuit déjà prise.
     * Les nuits d'un séjour vide non repris par l'IA restent disponibles : il pourra être remplacé.
     */
    public function normalize(array $stays): array
    {
        // Tout ce qui est déjà prévu dans le voyage, quel que soit le jour : l'IA ne doit pas le reproposer.
        $this->dedupe = new ActivityDeduplicator();
        foreach ($this->trip->stays as $stay) {
            foreach ($stay->days as $day) {
                foreach ($day->activities as $activity) {
                    $this->dedupe->remember($activity->title, $activity->location_name, $activity->category, $this->date($day->date));
                }
            }
        }
        $existing = $this->trip->stays->keyBy('id');
        $kept = collect($stays)->map(fn ($entry) => is_array($entry) && is_numeric($entry['id'] ?? null) ? (int) $entry['id'] : null)->filter()->all();
        $taken = $this->trip->stays
            ->filter(fn (Stay $stay) => !$this->isReplaceable($stay) || in_array($stay->id, $kept, true))
            ->flatMap(fn (Stay $stay) => $this->occupied($stay->arrival_date, $stay->departure_date))
            ->flip()
            ->all();
        $tripStart = $this->date($this->trip->start_date);
        $tripEnd = $this->date($this->trip->end_date);
        $plan = [];
        $newCount = 0;

        foreach ($stays as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $id = isset($entry['id']) && is_numeric($entry['id']) ? (int) $entry['id'] : null;

            if ($id !== null) {
                $stay = $existing->get($id);
                if (!$stay) {
                    continue;
                }
                $plan[] = [
                    'id' => $stay->id,
                    'is_new' => false,
                    'location_name' => $stay->location_name,
                    'latitude' => (float) $stay->latitude,
                    'longitude' => (float) $stay->longitude,
                    'arrival_date' => $this->date($stay->arrival_date),
                    'departure_date' => $this->date($stay->departure_date),
                    // Une estimation ne remplace jamais un coût déjà saisi.
                    'accommodation_cost' => $stay->accommodation_cost === null ? $this->amount($entry['accommodation_cost'] ?? null) : null,
                    'accommodation_type' => $this->text($entry['accommodation_type'] ?? null, 191),
                    'transport_from_previous' => null,
                    'days' => $this->days($entry['days'] ?? [], $stay->days->mapWithKeys(fn ($day) => [$this->date($day->date) => $day->id])->all()),
                ];
                continue;
            }

            if ($newCount >= self::MAX_NEW_STAYS) {
                continue;
            }

            $validator = Validator::make($entry, [
                'location_name' => ['required', 'string', 'max:191'],
                'latitude' => ['required', 'numeric', 'between:-90,90'],
                'longitude' => ['required', 'numeric', 'between:-180,180'],
                'arrival_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:' . $tripStart, 'before_or_equal:' . $tripEnd],
                'departure_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:arrival_date', 'before_or_equal:' . $tripEnd],
            ]);
            if ($validator->fails()) {
                continue;
            }

            $nights = $this->occupied($entry['arrival_date'], $entry['departure_date']);
            if (collect($nights)->contains(fn ($night) => isset($taken[$night]))) {
                continue;
            }
            foreach ($nights as $night) {
                $taken[$night] = true;
            }
            $newCount++;

            $dates = collect(CarbonPeriod::create($entry['arrival_date'], $entry['departure_date']))
                ->mapWithKeys(fn ($date) => [$date->toDateString() => null])->all();

            $plan[] = [
                'id' => null,
                'is_new' => true,
                'location_name' => trim($entry['location_name']),
                'latitude' => (float) $entry['latitude'],
                'longitude' => (float) $entry['longitude'],
                'arrival_date' => $entry['arrival_date'],
                'departure_date' => $entry['departure_date'],
                'accommodation_cost' => $this->amount($entry['accommodation_cost'] ?? null),
                'accommodation_type' => $this->text($entry['accommodation_type'] ?? null, 191),
                'transport_from_previous' => $this->transport($entry['transport_from_previous'] ?? null),
                'days' => $this->days($entry['days'] ?? [], $dates),
            ];
        }

        usort($plan, fn ($a, $b) => [$a['arrival_date'], $a['departure_date']] <=> [$b['arrival_date'], $b['departure_date']]);

        return $plan;
    }

    /** Séjours vides que les nouveaux séjours du plan viennent remplacer (ils chevauchent leurs nuits). */
    public function replacedStays(array $plan): array
    {
        $kept = collect($plan)->pluck('id')->filter()->all();
        $newNights = collect($plan)->where('is_new', true)
            ->flatMap(fn ($entry) => $this->occupied($entry['arrival_date'], $entry['departure_date']))
            ->flip();

        return $this->trip->stays
            ->filter(fn (Stay $stay) => $this->isReplaceable($stay) && !in_array($stay->id, $kept, true))
            ->filter(fn (Stay $stay) => collect($this->occupied($stay->arrival_date, $stay->departure_date))->contains(fn ($night) => isset($newNights[$night])))
            ->map(fn (Stay $stay) => [
                'id' => $stay->id,
                'location_name' => $stay->location_name,
                'accommodation_cost' => $stay->accommodation_cost === null ? null : (float) $stay->accommodation_cost,
            ])
            ->values()
            ->all();
    }

    /** Activités valides des jours connus ; $dates associe une date à son day_id (null pour un futur séjour). */
    private function days(mixed $days, array $dates): array
    {
        return collect(is_array($days) ? $days : [])
            ->filter(fn ($day) => is_array($day) && is_string($day['date'] ?? null) && array_key_exists($day['date'], $dates))
            ->unique('date')
            ->map(fn ($day) => [
                'date' => $day['date'],
                'day_id' => $dates[$day['date']],
                'activities' => collect(is_array($day['activities'] ?? null) ? $day['activities'] : [])
                    ->filter(fn ($activity) => is_array($activity))
                    ->map(fn ($activity) => $this->activity($activity))
                    ->filter()
                    // Doublon d'une activité déjà prévue (ou proposée plus tôt dans la réponse) : écartée.
                    ->reject(fn ($activity) => $this->dedupe->isDuplicate($activity['title'], $activity['location_name'], $activity['category'], $day['date']))
                    ->take(self::MAX_ACTIVITIES_PER_DAY)
                    ->values()
                    ->all(),
            ])
            ->filter(fn ($day) => $day['activities'] !== [])
            ->sortBy('date')
            ->values()
            ->all();
    }

    private function activity(array $activity): ?array
    {
        $validator = Validator::make($activity, [
            'title' => ['required', 'string', 'max:191'],
            'description' => ['nullable', 'string', 'max:2000'],
            'period' => ['required', 'in:' . implode(',', self::PERIODS)],
            'category' => ['required', 'in:' . implode(',', self::CATEGORIES)],
            'price' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'location_name' => ['nullable', 'string', 'max:191'],
            'source_url' => ['nullable', 'url:http,https', 'max:2048'],
        ]);

        if ($validator->fails()) {
            return null;
        }

        $data = $validator->validated();

        return [
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'period' => $data['period'],
            'category' => $data['category'],
            'price' => $this->amount($data['price'] ?? null),
            'location_name' => $data['location_name'] ?? null,
            'source_url' => $data['source_url'] ?? null,
        ];
    }

    private function transport(mixed $transport): ?array
    {
        if (!is_array($transport) || !in_array($transport['mode'] ?? null, self::TRANSPORT_MODES, true)) {
            return null;
        }

        $duration = $transport['duration_minutes'] ?? null;

        return [
            'mode' => $transport['mode'],
            'duration_minutes' => is_numeric($duration) && $duration > 0 && $duration < 10000 ? (int) $duration : null,
            'cost' => $this->amount($transport['cost'] ?? null),
        ];
    }

    /** Dates des nuits passées sur place ; un séjour sans nuit occupe sa seule journée. */
    private function occupied($arrival, $departure): array
    {
        $from = $this->date($arrival);
        $to = $this->date($departure);

        if ($from === $to) {
            return [$from];
        }

        return collect(CarbonPeriod::create($from, Carbon::parse($to)->subDay()->toDateString()))
            ->map(fn ($date) => $date->toDateString())
            ->all();
    }

    private function amount(mixed $value): ?float
    {
        return is_numeric($value) && $value >= 0 && $value <= 1000000 ? round((float) $value, 2) : null;
    }

    private function text(mixed $value, int $max): ?string
    {
        return is_string($value) && trim($value) !== '' ? mb_substr(trim($value), 0, $max) : null;
    }

    private function date($value): string
    {
        return Carbon::parse($value)->toDateString();
    }
}
