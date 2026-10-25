<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Trip;
use App\Models\TripParticipant;
use App\Models\User;
use App\Services\AI\ActivityDeduplicator;
use App\Services\AI\ItineraryPlan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityProgramTest extends TestCase
{
    use RefreshDatabase;

    private function tripWithDays(User $owner): Trip
    {
        $trip = Trip::create(['title' => 'Kazakhstan', 'start_date' => '2028-06-19', 'end_date' => '2028-06-23', 'user_id' => $owner->id]);
        $stay = $trip->stays()->create(['location_name' => 'Almaty, Kazakhstan', 'latitude' => 43.24, 'longitude' => 76.89, 'arrival_date' => '2028-06-19', 'departure_date' => '2028-06-23']);
        $stay->generateDays();

        return $trip->fresh('stays.days');
    }

    public function test_similar_activities_are_detected(): void
    {
        $tokens = fn (string $text) => (fn () => self::tokens($text))->call(new ActivityDeduplicator());
        $this->assertTrue(ActivityDeduplicator::similar($tokens('Canyon de Charyn'), $tokens('Randonnée au canyon de Charyn')));
        $this->assertFalse(ActivityDeduplicator::similar($tokens('Musée national'), $tokens('Musée d’art Kasteyev')));
    }

    public function test_ai_never_proposes_an_activity_already_planned_or_twice(): void
    {
        $owner = User::factory()->create();
        $trip = $this->tripWithDays($owner);
        $days = $trip->stays[0]->days->values();
        Activity::create(['day_id' => $days[3]->id, 'title' => 'Canyon de Charyn', 'period' => 'matin', 'category' => 'visite']);

        $plan = (new ItineraryPlan($trip->fresh()))->normalize([[
            'id' => $trip->stays[0]->id,
            'days' => [
                ['date' => '2028-06-20', 'activities' => [
                    ['title' => 'Randonnée au canyon de Charyn', 'period' => 'matin', 'category' => 'visite'],
                    ['title' => 'Bazar vert', 'period' => 'apres_midi', 'category' => 'visite'],
                    ['title' => 'Dîner kazakh', 'period' => 'soir', 'category' => 'repas'],
                ]],
                ['date' => '2028-06-21', 'activities' => [
                    ['title' => 'Le Bazar Vert', 'period' => 'matin', 'category' => 'visite'],
                    ['title' => 'Dîner kazakh', 'period' => 'soir', 'category' => 'repas'],
                ]],
            ],
        ]]);

        $titles = collect($plan[0]['days'])->mapWithKeys(fn ($day) => [$day['date'] => array_column($day['activities'], 'title')])->all();
        // Charyn déjà prévu le 22, Bazar vert déjà proposé le 20 ; un repas peut revenir un autre jour.
        $this->assertSame(['Bazar vert', 'Dîner kazakh'], $titles['2028-06-20']);
        $this->assertSame(['Dîner kazakh'], $titles['2028-06-21']);
    }

    public function test_whole_program_can_be_cleared_by_an_editor_only(): void
    {
        $owner = User::factory()->create();
        $trip = $this->tripWithDays($owner);
        foreach ($trip->stays[0]->days as $day) {
            Activity::create(['day_id' => $day->id, 'title' => 'Visite ' . $day->id, 'period' => 'matin', 'category' => 'visite']);
        }

        $viewer = User::factory()->create();
        TripParticipant::create(['trip_id' => $trip->id, 'user_id' => $viewer->id, 'role' => 'viewer', 'status' => 'accepted']);
        $this->actingAs($viewer)->deleteJson(route('trips.activities.destroy-all', $trip))->assertForbidden();

        $this->actingAs($owner)->deleteJson(route('trips.activities.destroy-all', $trip))->assertOk()->assertJsonPath('deleted', $trip->stays[0]->days->count());
        $this->assertSame(0, Activity::count());
        $this->assertDatabaseCount('days', $trip->stays[0]->days->count());
    }

    public function test_activity_update_returns_json_for_instant_display(): void
    {
        $owner = User::factory()->create();
        $trip = $this->tripWithDays($owner);
        $activity = Activity::create(['day_id' => $trip->stays[0]->days[0]->id, 'title' => 'Musée', 'period' => 'matin', 'category' => 'visite']);

        $this->actingAs($owner)->putJson(route('activities.update', $activity), ['title' => 'Musée central', 'period' => 'soir', 'category' => 'visite', 'start_time' => '18:30'])
            ->assertOk()->assertJsonPath('title', 'Musée central')->assertJsonPath('period', 'soir');
    }
}
