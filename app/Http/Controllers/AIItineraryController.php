<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Trip;
use App\Models\Activity;
use App\Services\AI\GeminiItineraryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Throwable;

class AIItineraryController extends Controller
{
    use AuthorizesRequests;

    private const PERIODS = ['matin', 'midi', 'apres_midi', 'soir', 'nuit'];
    private const CATEGORIES = ['transport', 'hebergement', 'camping', 'repas', 'visite', 'loisir', 'autre'];

    public function generate(Request $request, Trip $trip, GeminiItineraryService $gemini)
    {
        $this->authorize('update', $trip);

        $validated = $request->validate([
            'interests' => ['nullable', 'string', 'max:3000'],
        ]);

        $trip->load('stays.days');
        $days = $trip->stays->flatMap(function ($stay) {
            return $stay->days->map(fn ($day) => [
                'date' => $day->date,
                'day_id' => $day->id,
                'location' => $stay->location_name,
            ]);
        })->values()->all();

        if (!$days) {
            return response()->json(['message' => 'Ajoutez au moins un séjour avant de générer un itinéraire.'], 422);
        }

        try {
            $suggestions = $gemini->suggest([
                'title' => $trip->title,
                'description' => $trip->description,
                'interests' => $validated['interests'] ?? '',
                'days' => $days,
            ]);
        } catch (Throwable $exception) {
            report($exception);
            return response()->json(['message' => $exception->getMessage()], 502);
        }

        return response()->json(['days' => $this->sanitizeSuggestions($suggestions['days'], $days)]);
    }

    public function store(Request $request, Trip $trip)
    {
        $this->authorize('update', $trip);

        $validated = $request->validate([
            'days' => ['required', 'array', 'max:100'],
            'days.*.day_id' => ['required', 'integer'],
            'days.*.activities' => ['required', 'array', 'max:3'],
            'days.*.activities.*.title' => ['required', 'string', 'max:191'],
            'days.*.activities.*.description' => ['nullable', 'string', 'max:2000'],
            'days.*.activities.*.period' => ['required', 'in:' . implode(',', self::PERIODS)],
            'days.*.activities.*.category' => ['required', 'in:' . implode(',', self::CATEGORIES)],
            'days.*.activities.*.price' => ['nullable', 'numeric', 'min:0'],
            'days.*.activities.*.location_name' => ['nullable', 'string', 'max:191'],
            'days.*.activities.*.source_url' => ['nullable', 'url:http,https', 'max:2048'],
        ]);

        $dayIds = $trip->stays()->with('days')->get()->flatMap->days->pluck('id')->map(fn ($id) => (int) $id)->all();
        $created = 0;

        DB::transaction(function () use ($validated, $dayIds, &$created) {
            foreach ($validated['days'] as $day) {
                abort_unless(in_array((int) $day['day_id'], $dayIds, true), 422, 'Un jour ne correspond pas à ce voyage.');
                foreach ($day['activities'] as $activity) {
                    Activity::create([
                        'day_id' => (int) $day['day_id'],
                        'period' => $activity['period'],
                        'category' => $activity['category'],
                        'title' => $activity['title'],
                        'description' => $activity['description'] ?? null,
                        'price' => $activity['price'] ?? null,
                        'location_name' => $activity['location_name'] ?? null,
                        'source_url' => $activity['source_url'] ?? null,
                    ]);
                    $created++;
                }
            }
        });

        return response()->json(['created' => $created]);
    }

    private function sanitizeSuggestions(array $suggestions, array $days): array
    {
        $allowedDates = collect($days)->keyBy('date');

        return collect($suggestions)->map(function ($day) use ($allowedDates) {
            if (!is_array($day) || !isset($allowedDates[$day['date']])) {
                return null;
            }

            $activities = collect($day['activities'] ?? [])->take(3)->map(function ($activity) {
                $validator = Validator::make($activity, [
                    'title' => ['required', 'string', 'max:191'],
                    'description' => ['nullable', 'string', 'max:2000'],
                    'period' => ['required', 'in:' . implode(',', self::PERIODS)],
                    'category' => ['required', 'in:' . implode(',', self::CATEGORIES)],
                    'price' => ['nullable', 'numeric', 'min:0'],
                    'location_name' => ['nullable', 'string', 'max:191'],
                    'source_url' => ['nullable', 'url:http,https', 'max:2048'],
                ]);

                return $validator->passes() ? $validator->validated() : null;
            })->filter()->values()->all();

            return [
                'date' => $day['date'],
                'day_id' => $allowedDates[$day['date']]['day_id'],
                'location' => $allowedDates[$day['date']]['location'],
                'activities' => $activities,
            ];
        })->filter()->values()->all();
    }
}
