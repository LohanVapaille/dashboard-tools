<?php

namespace Tests\Feature;

use App\Models\Trip;
use App\Models\TripParticipant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AIItineraryAndBudgetTest extends TestCase
{
    use RefreshDatabase;

    private function trip(User $user, array $attributes = []): Trip
    {
        return Trip::create([
            'title' => 'Portugal',
            'start_date' => '2027-05-01',
            'end_date' => '2027-05-07',
            'travelers' => 2,
            'user_id' => $user->id,
            ...$attributes,
        ]);
    }

    private function fakeGemini(array $stays): void
    {
        config(['services.gemini.api_key' => 'test', 'services.gemini.fallback_models' => []]);
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => json_encode(['stays' => $stays])]]]]],
        ])]);
    }

    private function activity(string $title, ?float $price = 10): array
    {
        return ['title' => $title, 'period' => 'matin', 'category' => 'visite', 'price' => $price];
    }

    public function test_a_road_trip_creates_one_stay_per_sleeping_place(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);

        $this->fakeGemini([
            ['id' => null, 'location_name' => 'Lisbonne, Portugal', 'latitude' => 38.72, 'longitude' => -9.14,
                'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-04', 'accommodation_cost' => 360,
                'accommodation_type' => 'Hôtel à Baixa', 'transport_from_previous' => null,
                'days' => [['date' => '2027-05-02', 'activities' => [$this->activity('Belém', 12)]]]],
            ['id' => null, 'location_name' => 'Porto, Portugal', 'latitude' => 41.15, 'longitude' => -8.61,
                'arrival_date' => '2027-05-04', 'departure_date' => '2027-05-07', 'accommodation_cost' => 300,
                'transport_from_previous' => ['mode' => 'train', 'duration_minutes' => 170, 'cost' => 60],
                'days' => [['date' => '2027-05-05', 'activities' => [$this->activity('Ribeira', 0)]]]],
            // Hors du voyage : ignoré.
            ['id' => null, 'location_name' => 'Faro, Portugal', 'latitude' => 37.02, 'longitude' => -7.93,
                'arrival_date' => '2027-05-07', 'departure_date' => '2027-05-09', 'days' => []],
        ]);

        $response = $this->actingAs($user)->postJson(route('trips.ai-itinerary.generate', $trip), ['interests' => 'road trip'])
            ->assertOk()
            ->assertJsonPath('mode', 'voyage_complet')
            ->assertJsonCount(2, 'stays');

        $this->actingAs($user)->postJson(route('trips.ai-itinerary.store', $trip), ['stays' => $response->json('stays')])
            ->assertOk()
            ->assertJsonPath('stays', 2)
            ->assertJsonPath('created', 2);

        $trip->refresh()->load('stays.days.activities', 'transitions');
        $this->assertSame(['Lisbonne, Portugal', 'Porto, Portugal'], $trip->stays->pluck('location_name')->all());
        $this->assertEquals(360, $trip->stays[0]->accommodation_cost);
        $this->assertCount(4, $trip->stays[0]->days);
        $this->assertCount(1, $trip->transitions);
        $this->assertSame('train', $trip->transitions[0]->transport_mode);
        $this->assertSame($trip->stays[1]->id, $trip->transitions[0]->to_stay_id);
    }

    public function test_existing_stays_only_receive_activities_and_new_stays_fill_free_nights(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);
        $stay = $trip->stays()->create([
            'location_name' => 'Lisbonne, Portugal', 'latitude' => 38.72, 'longitude' => -9.14,
            'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-04', 'accommodation_cost' => 500,
        ]);
        $stay->generateDays();
        $stay->days()->first()->activities()->create(['title' => 'Fado', 'period' => 'soir', 'category' => 'loisir']);

        $this->fakeGemini([
            // Tentative de déplacer le séjour existant : les dates restent celles de la base.
            ['id' => $stay->id, 'location_name' => 'Ailleurs', 'arrival_date' => '2027-05-02', 'departure_date' => '2027-05-03',
                'accommodation_cost' => 90,
                'days' => [['date' => '2027-05-02', 'activities' => [$this->activity('Alfama')]]]],
            // Chevauche les nuits de Lisbonne : refusé.
            ['id' => null, 'location_name' => 'Sintra, Portugal', 'latitude' => 38.8, 'longitude' => -9.39,
                'arrival_date' => '2027-05-03', 'departure_date' => '2027-05-05', 'days' => []],
            ['id' => null, 'location_name' => 'Porto, Portugal', 'latitude' => 41.15, 'longitude' => -8.61,
                'arrival_date' => '2027-05-04', 'departure_date' => '2027-05-07', 'days' => []],
        ]);

        $response = $this->actingAs($user)->postJson(route('trips.ai-itinerary.generate', $trip))
            ->assertOk()
            ->assertJsonPath('mode', 'completer')
            ->assertJsonCount(2, 'stays')
            ->assertJsonPath('stays.0.id', $stay->id)
            ->assertJsonPath('stays.0.arrival_date', '2027-05-01')
            ->assertJsonPath('stays.0.accommodation_cost', null)
            ->assertJsonPath('stays.1.location_name', 'Porto, Portugal');

        Http::assertSent(fn ($request) => str_contains($request['contents'][0]['parts'][0]['text'], '"from": "2027-05-04"'));

        $this->actingAs($user)->postJson(route('trips.ai-itinerary.store', $trip), ['stays' => $response->json('stays')])->assertOk();

        $this->assertSame(2, $trip->stays()->count());
        $this->assertEquals(500, $stay->fresh()->accommodation_cost);
        $this->assertSame('Alfama', $stay->days()->where('date', '2027-05-02')->first()->activities->first()->title);
    }

    public function test_expenses_are_split_and_settled_between_travelers(): void
    {
        $owner = User::factory()->create(['name' => 'Alice']);
        $friend = User::factory()->create(['name' => 'Bruno']);
        $trip = $this->trip($owner);
        TripParticipant::create(['trip_id' => $trip->id, 'user_id' => $friend->id, 'role' => 'editor', 'status' => 'accepted']);

        $budget = $this->actingAs($friend)->getJson(route('trips.budget.show', $trip))->assertOk()->json();
        $this->assertSame(['Alice', 'Bruno'], array_column($budget['members'], 'name'));
        [$alice, $bruno] = array_column($budget['members'], 'id');

        $budget = $this->actingAs($owner)->postJson(route('trips.budget.members.store', $trip), ['name' => 'Chloé'])->assertOk()->json();
        $chloe = collect($budget['members'])->firstWhere('name', 'Chloé')['id'];

        $this->actingAs($owner)->postJson(route('trips.expenses.store', $trip), [
            'title' => 'Location voiture', 'category' => 'transport', 'amount' => 100, 'paid_by' => $alice,
            'split_mode' => 'equal', 'shares' => [['member_id' => $alice], ['member_id' => $bruno], ['member_id' => $chloe]],
        ])->assertOk()->assertJsonPath('spent_total', 100);

        $budget = $this->actingAs($friend)->postJson(route('trips.expenses.store', $trip), [
            'title' => 'Dîner', 'category' => 'repas', 'amount' => 40, 'paid_by' => $bruno,
            'split_mode' => 'amounts', 'shares' => [['member_id' => $alice, 'amount' => 30], ['member_id' => $bruno, 'amount' => 10]],
        ])->assertOk()->json();

        $balances = collect($budget['members'])->pluck('balance', 'name');
        $this->assertEquals(36.66, $balances['Alice']);
        $this->assertEquals(-3.33, $balances['Bruno']);
        $this->assertEquals(-33.33, $balances['Chloé']);
        $this->assertEqualsCanonicalizing([
            ['from' => $chloe, 'to' => $alice, 'amount' => 33.33],
            ['from' => $bruno, 'to' => $alice, 'amount' => 3.33],
        ], $budget['settlements']);

        // Les parts doivent couvrir le montant exact.
        $this->actingAs($owner)->postJson(route('trips.expenses.store', $trip), [
            'title' => 'Musée', 'category' => 'activite', 'amount' => 20, 'paid_by' => $alice,
            'split_mode' => 'amounts', 'shares' => [['member_id' => $alice, 'amount' => 5]],
        ])->assertJsonValidationErrors('shares');

        // Une personne utilisée dans une dépense ne peut pas être supprimée.
        $this->actingAs($owner)->deleteJson(route('trips.budget.members.destroy', [$trip, $chloe]))->assertStatus(422);
    }

    public function test_planned_budget_counts_activities_per_person(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);
        $stay = $trip->stays()->create([
            'location_name' => 'Lisbonne, Portugal', 'latitude' => 38.72, 'longitude' => -9.14,
            'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-03',
        ]);
        $stay->generateDays();
        $activity = $stay->days()->first()->activities()->create(['title' => 'Tram 28', 'period' => 'matin', 'category' => 'visite', 'price' => 3]);

        $this->actingAs($user)->patchJson(route('trips.budget.planned', $trip), ['type' => 'stay', 'id' => $stay->id, 'amount' => 200])->assertOk();
        $budget = $this->actingAs($user)->patchJson(route('trips.budget.target', $trip), ['budget_target' => 1000])->assertOk()->json();

        $this->assertEquals(206, $budget['planned_total']);
        $this->assertEquals(1000, $budget['target']);
        $this->assertEquals(6, collect($budget['planned'])->firstWhere('key', 'activity-' . $activity->id)['amount']);

        // Un autre voyage ne peut pas être modifié par ce biais.
        $other = $this->trip(User::factory()->create());
        $this->actingAs($user)->patchJson(route('trips.budget.planned', $other), ['type' => 'stay', 'id' => $stay->id, 'amount' => 1])->assertForbidden();
    }
    public function test_an_empty_country_stay_is_split_into_cities(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);
        $country = $trip->stays()->create([
            'location_name' => 'Portugal', 'latitude' => 39.5, 'longitude' => -8,
            'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-07',
        ]);
        $country->generateDays();

        $this->fakeGemini([
            ['id' => null, 'location_name' => 'Lisbonne, Portugal', 'latitude' => 38.72, 'longitude' => -9.14,
                'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-04', 'days' => []],
            ['id' => null, 'location_name' => 'Porto, Portugal', 'latitude' => 41.15, 'longitude' => -8.61,
                'arrival_date' => '2027-05-04', 'departure_date' => '2027-05-07',
                'transport_from_previous' => ['mode' => 'train', 'cost' => 50],
                'days' => [['date' => '2027-05-05', 'activities' => [$this->activity('Livraria Lello')]]]],
        ]);

        $response = $this->actingAs($user)->postJson(route('trips.ai-itinerary.generate', $trip))
            ->assertOk()
            ->assertJsonPath('mode', 'voyage_complet')
            ->assertJsonCount(2, 'stays')
            ->assertJsonPath('replaced.0.id', $country->id);

        $this->actingAs($user)->postJson(route('trips.ai-itinerary.store', $trip), ['stays' => $response->json('stays')])->assertOk();

        $this->assertModelMissing($country);
        $this->assertSame(['Lisbonne, Portugal', 'Porto, Portugal'], $trip->stays()->pluck('location_name')->all());
        $this->assertSame(1, $trip->transitions()->count());
    }

    public function test_a_stay_with_activities_is_never_replaced(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);
        $stay = $trip->stays()->create([
            'location_name' => 'Portugal', 'latitude' => 39.5, 'longitude' => -8,
            'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-07',
        ]);
        $stay->generateDays();
        $stay->days()->first()->activities()->create(['title' => 'Fado', 'period' => 'soir', 'category' => 'loisir']);

        $this->fakeGemini([
            ['id' => null, 'location_name' => 'Lisbonne, Portugal', 'latitude' => 38.72, 'longitude' => -9.14,
                'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-04', 'days' => []],
        ]);

        $this->actingAs($user)->postJson(route('trips.ai-itinerary.generate', $trip))
            ->assertOk()
            ->assertJsonPath('mode', 'activites_seulement')
            ->assertJsonCount(0, 'stays')
            ->assertJsonCount(0, 'replaced');
    }

    public function test_tabs_can_be_hidden_and_a_stay_deleted(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);

        $this->actingAs($user)->patchJson(route('trips.tabs.update', $trip), ['visible_tabs' => ['program', 'budget']])
            ->assertOk()
            ->assertJsonPath('visible_tabs', ['program', 'budget']);

        $stay = $trip->stays()->create([
            'location_name' => 'Lisbonne', 'latitude' => 38.72, 'longitude' => -9.14,
            'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-03',
        ]);
        $this->actingAs($user)->delete(route('stays.destroy', $stay))->assertRedirect();
        $this->assertModelMissing($stay);
    }

    public function test_avatar_url_does_not_depend_on_app_url(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('profile.avatar.update'), [
            'avatar' => UploadedFile::fake()->image('moi.jpg', 200, 200),
        ])->assertSessionHasNoErrors();

        $avatar = $user->fresh()->avatar;
        $this->assertStringStartsWith('/storage/avatars/', $avatar);
        Storage::disk('public')->assertExists(substr($avatar, strlen('/storage/')));
    }

    public function test_an_activity_can_be_dragged_to_another_day_of_the_same_trip(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);
        $stay = $trip->stays()->create([
            'location_name' => 'Lisbonne', 'latitude' => 38.72, 'longitude' => -9.14,
            'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-03',
        ]);
        $stay->generateDays();
        [$first, $second] = $stay->days()->take(2)->get()->all();
        $activity = $first->activities()->create(['title' => 'Tram 28', 'period' => 'matin', 'category' => 'visite']);

        $this->actingAs($user)->patchJson(route('activities.update-period', $activity), ['period' => 'soir', 'day_id' => $second->id])->assertOk();
        $this->assertSame([$second->id, 'soir'], [(int) $activity->fresh()->day_id, $activity->fresh()->period]);

        $other = $this->trip($user, ['title' => 'Autre']);
        $otherStay = $other->stays()->create([
            'location_name' => 'Porto', 'latitude' => 41.15, 'longitude' => -8.61,
            'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-02',
        ]);
        $otherStay->generateDays();

        $this->actingAs($user)->patchJson(route('activities.update-period', $activity), ['period' => 'matin', 'day_id' => $otherStay->days()->first()->id])->assertStatus(422);
        $this->assertSame($second->id, (int) $activity->fresh()->day_id);
    }

    public function test_activity_order_within_a_period_is_saved(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);
        $stay = $trip->stays()->create([
            'location_name' => 'Lisbonne', 'latitude' => 38.72, 'longitude' => -9.14,
            'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-02',
        ]);
        $stay->generateDays();
        [$first, $second] = $stay->days()->get()->all();
        $a = $first->activities()->create(['title' => 'A', 'period' => 'matin', 'category' => 'visite']);
        $b = $first->activities()->create(['title' => 'B', 'period' => 'matin', 'category' => 'visite']);
        $c = $second->activities()->create(['title' => 'C', 'period' => 'matin', 'category' => 'visite']);

        // Réordonner dans la même période.
        $this->actingAs($user)->patchJson(route('activities.update-period', $b), ['period' => 'matin', 'order' => [$b->id, $a->id]])->assertOk();
        $this->assertSame(['B', 'A'], $first->activities()->pluck('title')->all());

        // Déposer A entre rien et C dans l'autre jour : A passe en tête.
        $this->actingAs($user)->patchJson(route('activities.update-period', $a), ['period' => 'matin', 'day_id' => $second->id, 'order' => [$a->id, $c->id]])->assertOk();
        $this->assertSame(['A', 'C'], $second->activities()->pluck('title')->all());

        // Une nouvelle activité arrive en fin de période.
        $this->actingAs($user)->postJson(route('activities.store', $second), ['title' => 'D', 'period' => 'matin', 'category' => 'visite'])->assertCreated();
        $this->assertSame(['A', 'C', 'D'], $second->activities()->pluck('title')->all());
    }
}
