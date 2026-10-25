<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Trip;
use App\Models\Activity;
use App\Models\StayTransition;
use App\Services\AI\GeminiItineraryService;
use App\Services\AI\ItineraryPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

class AIItineraryController extends Controller
{
    use AuthorizesRequests;

    public function generate(Request $request, Trip $trip, GeminiItineraryService $gemini)
    {
        $this->authorize('update', $trip);
        // Plusieurs modèles peuvent être essayés l'un après l'autre.
        set_time_limit(150);

        $validated = $request->validate([
            'interests' => ['nullable', 'string', 'max:3000'],
        ]);

        $plan = new ItineraryPlan($trip);
        $context = $plan->context($validated['interests'] ?? '');

        try {
            $suggestions = $gemini->suggest($context);
        } catch (Throwable $exception) {
            report($exception);
            $status = str_contains($exception->getMessage(), 'temporairement très sollicité') ? 503 : 502;
            return response()->json(['message' => $exception->getMessage()], $status);
        }

        $stays = $plan->normalize($suggestions['stays']);

        return response()->json([
            'mode' => $context['mode'],
            'stays' => $stays,
            'replaced' => $plan->replacedStays($stays),
        ]);
    }

    public function store(Request $request, Trip $trip)
    {
        $this->authorize('update', $trip);

        $request->validate([
            'stays' => ['required', 'array', 'max:60'],
            'stays.*.days' => ['nullable', 'array', 'max:100'],
        ]);

        $itinerary = new ItineraryPlan($trip);
        $plan = $itinerary->normalize($request->input('stays'));
        abort_if($plan === [], 422, 'Aucune proposition valide à enregistrer.');
        $replaced = array_column($itinerary->replacedStays($plan), 'id');

        $counts = ['stays' => 0, 'activities' => 0];

        DB::transaction(function () use ($trip, $plan, $replaced, &$counts) {
            $newStayIds = [];
            // Séjours vides redécoupés en plusieurs étapes : leurs jours et trajets partent avec eux.
            $trip->stays()->whereIn('id', $replaced)->get()->each->delete();

            foreach ($plan as $entry) {
                if ($entry['is_new']) {
                    $stay = $trip->stays()->create([
                        'location_name' => $entry['location_name'],
                        'latitude' => $entry['latitude'],
                        'longitude' => $entry['longitude'],
                        'arrival_date' => $entry['arrival_date'],
                        'departure_date' => $entry['departure_date'],
                        'notes' => $entry['accommodation_type'] ? 'Logement conseillé : ' . $entry['accommodation_type'] : null,
                        'accommodation_cost' => $entry['accommodation_cost'],
                    ]);
                    $stay->generateDays();
                    $newStayIds[$stay->id] = $entry['transport_from_previous'];
                    $counts['stays']++;
                } else {
                    $stay = $trip->stays()->findOrFail($entry['id']);
                    if ($entry['accommodation_cost'] !== null && $stay->accommodation_cost === null) {
                        $stay->update(['accommodation_cost' => $entry['accommodation_cost']]);
                    }
                }

                $dayIds = $stay->days()->get()->mapWithKeys(fn ($day) => [Carbon::parse($day->date)->toDateString() => $day->id]);

                foreach ($entry['days'] as $day) {
                    $dayId = $dayIds[$day['date']] ?? null;
                    if (!$dayId) {
                        continue;
                    }
                    foreach ($day['activities'] as $activity) {
                        Activity::create(['day_id' => $dayId, ...$activity]);
                        $counts['activities']++;
                    }
                }
            }

            $this->linkNewStays($trip, $newStayIds);
        });

        return response()->json(['created' => $counts['activities'], 'stays' => $counts['stays']]);
    }

    /** Crée le trajet entre chaque nouveau séjour et l'étape qui le précède, s'il n'existe pas déjà. */
    private function linkNewStays(Trip $trip, array $newStays): void
    {
        $ordered = $trip->stays()->orderBy('arrival_date')->orderBy('departure_date')->get()->values();

        foreach ($ordered as $index => $stay) {
            $transport = $newStays[$stay->id] ?? null;
            $previous = $ordered[$index - 1] ?? null;

            if (!$transport || !$previous || StayTransition::where('from_stay_id', $previous->id)->exists()) {
                continue;
            }

            StayTransition::create([
                'trip_id' => $trip->id,
                'from_stay_id' => $previous->id,
                'to_stay_id' => $stay->id,
                'transport_mode' => $transport['mode'],
                'duration_minutes' => $transport['duration_minutes'],
                'cost' => $transport['cost'],
            ]);
        }
    }
}
