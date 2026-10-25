<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\DayBlock;
use App\Models\StayTransition;
use App\Models\Trip;
use App\Models\TripBudgetLine;
use App\Models\TripNote;
use App\Models\TripReservation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class TripPublicationTest extends TestCase
{
    use RefreshDatabase;

    /** Voyage de 5 jours (1 → 5 juin) en deux étapes, avec contenu public et privé. */
    private function trip(User $owner): Trip
    {
        $trip = Trip::create([
            'title' => 'Portugal en 5 jours', 'description' => 'Lisbonne puis Porto',
            'start_date' => '2026-06-01', 'end_date' => '2026-06-05', 'user_id' => $owner->id, 'travelers' => 2,
            'origin_name' => 'Rue de la Paix, Lyon', 'origin_latitude' => 45.76, 'origin_longitude' => 4.83,
        ]);
        $lisbon = $trip->stays()->create(['location_name' => 'Lisbonne, Portugal', 'latitude' => 38.72, 'longitude' => -9.14, 'arrival_date' => '2026-06-01', 'departure_date' => '2026-06-03', 'accommodation_cost' => 300, 'notes' => 'Code porte 1234']);
        $porto = $trip->stays()->create(['location_name' => 'Porto, Portugal', 'latitude' => 41.15, 'longitude' => -8.61, 'arrival_date' => '2026-06-03', 'departure_date' => '2026-06-05', 'accommodation_cost' => 200]);
        $lisbon->generateDays();
        $porto->generateDays();

        $day = $lisbon->days()->first();
        $activity = Activity::create(['day_id' => $day->id, 'period' => 'matin', 'title' => 'Tram 28', 'category' => 'visite', 'price' => 3]);
        DayBlock::create(['day_id' => $day->id, 'type' => 'checklist', 'title' => 'À emporter', 'content' => ['items' => []], 'position' => 0]);
        DayBlock::create(['day_id' => $day->id, 'type' => 'memo', 'title' => 'Perso', 'content' => ['text' => 'Appeler maman'], 'position' => 1]);
        StayTransition::create(['trip_id' => $trip->id, 'from_stay_id' => $lisbon->id, 'to_stay_id' => $porto->id, 'transport_mode' => 'train', 'cost' => 50, 'reference' => 'PNR-SECRET', 'seat' => '12A', 'departure_at' => '2026-06-03 09:00:00']);
        TripNote::create(['trip_id' => $trip->id, 'type' => 'memo', 'title' => 'Note privée', 'content' => ['text' => 'secret'], 'position' => 0]);
        TripReservation::create(['trip_id' => $trip->id, 'kind' => 'stay', 'title' => 'Hôtel', 'reference' => 'RESA-42', 'currency' => 'EUR']);
        TripBudgetLine::create(['trip_id' => $trip->id, 'key' => 'activity-' . $activity->id, 'group' => 'activites', 'amount' => 5, 'per_person' => true, 'hidden' => false]);
        TripBudgetLine::create(['trip_id' => $trip->id, 'key' => null, 'group' => 'repas', 'label' => 'Restaurants', 'amount' => 100, 'per_person' => false, 'hidden' => false]);

        return $trip;
    }

    public function test_only_the_owner_can_publish_and_the_snapshot_feeds_the_explore_page(): void
    {
        $owner = User::factory()->create(['name' => 'Lohan Vapaille']);
        $trip = $this->trip($owner);

        $this->actingAs(User::factory()->create())->post(route('trips.publication.store', $trip))->assertForbidden();
        $this->actingAs($owner)->post(route('trips.publication.store', $trip))->assertSessionHasNoErrors();

        $trip->refresh();
        $this->assertTrue($trip->isPublished());
        $this->assertSame(5, $trip->published_days);
        $this->assertSame(['Lisbonne', 'Porto'], array_column($trip->published_summary['stays'], 'name'));
        // Aucun nom de voyageur dans l'aperçu public.
        $this->assertStringNotContainsString('Vapaille', json_encode($trip->published_summary));

        $this->get(route('explore.index'))->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Explore/Index')
            ->where('total', 1)
            ->where('trips.0.author.name', 'Lohan V.')
            ->where('trips.0.days', 5));

        $this->get(route('explore.index', ['days_min' => 6]))->assertInertia(fn (AssertableInertia $page) => $page->where('total', 0));
        $this->get(route('explore.index', ['days_max' => 5, 'q' => 'porto']))->assertInertia(fn (AssertableInertia $page) => $page->where('total', 1));
        $this->get(route('explore.index', ['budget_max' => 1]))->assertInertia(fn (AssertableInertia $page) => $page->where('total', 0));

        $this->actingAs($owner)->delete(route('trips.publication.destroy', $trip));
        $this->assertFalse($trip->fresh()->isPublished());
        $this->get(route('explore.index'))->assertInertia(fn (AssertableInertia $page) => $page->where('total', 0));
    }

    public function test_published_trips_are_read_only_and_private_data_is_hidden(): void
    {
        $owner = User::factory()->create();
        $trip = $this->trip($owner);

        // Non publié : fermé aux inconnus.
        $this->get(route('trips.show', $trip))->assertForbidden();

        $this->actingAs($owner)->post(route('trips.publication.store', $trip));
        $visitor = User::factory()->create();

        $response = $this->actingAs($visitor)->get(route('trips.show', $trip))->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('trip.permissions.isPublicView', true)
            ->where('trip.permissions.canEdit', false)
            ->where('trip.notes', [])
            ->where('trip.photos', [])
            ->where('trip.reservations', [])
            ->where('trip.origin_name', null)
            ->missing('trip.share_token')
            ->missing('trip.guest_token')
            ->where('trip.publication.days', 5));
        $content = $response->getContent();
        foreach (['Code porte 1234', 'PNR-SECRET', '12A', 'Appeler maman', 'RESA-42', $trip->share_token] as $secret) {
            $this->assertStringNotContainsString($secret, $content);
        }

        // Le reste reste réservé aux membres : budget détaillé, modification.
        $this->actingAs($visitor)->getJson(route('trips.budget.show', $trip))->assertForbidden();
        $this->actingAs($visitor)->put(route('trips.update', $trip), ['title' => 'Piraté', 'start_date' => '2026-06-01', 'end_date' => '2026-06-05'])->assertForbidden();
    }

    public function test_published_trips_can_be_favorited_and_found_in_the_account(): void
    {
        $owner = User::factory()->create();
        $trip = $this->trip($owner);
        $fan = User::factory()->create();

        // Non publié : introuvable ; sans compte : message clair.
        $this->actingAs($fan)->postJson(route('explore.favorite', $trip))->assertNotFound();
        $this->actingAs($owner)->post(route('trips.publication.store', $trip));
        auth()->logout();
        $this->postJson(route('explore.favorite', $trip))->assertUnauthorized()
            ->assertJsonPath('message', 'Connectez-vous ou créez un compte gratuit pour enregistrer vos voyages favoris.');

        $this->actingAs($fan)->postJson(route('explore.favorite', $trip))->assertOk()->assertJsonPath('favorited', true);
        $this->actingAs($fan)->get(route('explore.index'))->assertInertia(fn (AssertableInertia $page) => $page->where('trips.0.favorited', true));
        $this->actingAs($fan)->get(route('trips.show', $trip))->assertInertia(fn (AssertableInertia $page) => $page->where('trip.publication.favorited', true));
        $this->actingAs($fan)->get(route('profile.edit', ['onglet' => 'favoris']))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('tab', 'favorites')
            ->has('favorites', 1)
            ->where('favorites.0.id', $trip->id));

        // L'aperçu « Parcourir » de l'accueil montre les voyages des autres.
        $this->actingAs($fan)->get(route('trips.index'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('community.total', 1)
            ->where('community.trips.0.id', $trip->id));

        // Dépublié : il disparaît des favoris sans être perdu s'il revient.
        $this->actingAs($owner)->delete(route('trips.publication.destroy', $trip));
        $this->actingAs($fan)->get(route('profile.edit'))->assertInertia(fn (AssertableInertia $page) => $page->where('tab', 'account')->has('favorites', 0));

        $this->actingAs($owner)->post(route('trips.publication.store', $trip));
        $this->actingAs($fan)->postJson(route('explore.favorite', $trip))->assertJsonPath('favorited', false);
        $this->assertSame(0, $fan->favoriteTrips()->count());
    }

    public function test_the_favicon_is_linked_with_an_absolute_path_on_nested_pages(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->get(route('trips.show', $this->trip($owner)))->assertSee('href="/img/favicon.webp"', false);
    }

    public function test_the_owner_can_set_a_rectangular_cover_once_the_trip_is_published(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $trip = $this->trip($owner);
        $image = fn () => UploadedFile::fake()->image('vue.jpg', 1600, 1600);

        // Pas encore publié : refusé.
        $this->actingAs($owner)->post(route('trips.publication.cover', $trip), ['cover' => $image()])->assertSessionHasErrors('cover');

        $this->actingAs($owner)->post(route('trips.publication.store', $trip));
        $this->actingAs(User::factory()->create())->post(route('trips.publication.cover', $trip), ['cover' => $image()])->assertForbidden();
        $this->actingAs($owner)->post(route('trips.publication.cover', $trip), ['cover' => UploadedFile::fake()->image('mini.jpg', 200, 100)])->assertSessionHasErrors('cover');

        $this->actingAs($owner)->post(route('trips.publication.cover', $trip), ['cover' => $image()])->assertSessionHasNoErrors();
        $path = $trip->fresh()->cover_image;
        Storage::disk('public')->assertExists($path);
        // Recadrée au format rectangle des cartes (16:10), quel que soit le format envoyé.
        [$width, $height] = getimagesizefromstring(Storage::disk('public')->get($path));
        $this->assertSame([1200, 750], [$width, $height]);

        $this->get(route('explore.index'))->assertInertia(fn (AssertableInertia $page) => $page->where('trips.0.cover', '/storage/' . $path));

        // Remplacer supprime l'ancienne image ; la copie d'un autre voyageur ne la reprend pas.
        $this->actingAs($owner)->post(route('trips.publication.cover', $trip), ['cover' => $image()]);
        Storage::disk('public')->assertMissing($path);
        $start = now()->addMonth()->startOfDay();
        $this->actingAs(User::factory()->create())->post(route('explore.duplicate', $trip), ['start_date' => $start->toDateString(), 'end_date' => $start->copy()->addDays(4)->toDateString()]);
        $this->assertNull(Trip::where('copied_from_id', $trip->id)->firstOrFail()->cover_image);

        $this->actingAs($owner)->delete(route('trips.publication.cover.destroy', $trip));
        $this->assertNull($trip->fresh()->cover_image);
    }

    public function test_a_published_trip_is_copied_at_new_dates_with_the_same_duration(): void
    {
        $owner = User::factory()->create();
        $trip = $this->trip($owner);
        $this->actingAs($owner)->post(route('trips.publication.store', $trip));
        $visitor = User::factory()->create();
        $start = now()->addMonths(2)->startOfDay();

        // La durée est imposée : 5 jours.
        $this->actingAs($visitor)->post(route('explore.duplicate', $trip), [
            'start_date' => $start->toDateString(), 'end_date' => $start->copy()->addDays(5)->toDateString(),
        ])->assertSessionHasErrors('end_date');

        $this->actingAs($visitor)->post(route('explore.duplicate', $trip), [
            'start_date' => $start->toDateString(), 'end_date' => $start->copy()->addDays(4)->toDateString(),
        ])->assertSessionHasNoErrors();

        $copy = Trip::where('user_id', $visitor->id)->firstOrFail();
        $this->assertSame($trip->id, $copy->copied_from_id);
        $this->assertFalse($copy->isPublished());
        $this->assertSame($start->toDateString(), $copy->start_date);
        $this->assertSame($start->copy()->addDays(4)->toDateString(), $copy->end_date);
        $this->assertNull($copy->origin_name);

        $stays = $copy->stays()->with('days.activities', 'days.blocks')->get();
        $this->assertSame(['Lisbonne, Portugal', 'Porto, Portugal'], $stays->pluck('location_name')->all());
        $this->assertSame($start->copy()->addDays(2)->toDateString(), $stays[1]->arrival_date);
        $this->assertNull($stays[0]->notes);
        $this->assertSame($start->toDateString(), $stays[0]->days->first()->date);
        $this->assertSame('Tram 28', $stays[0]->days->first()->activities->first()->title);
        $this->assertSame(['checklist'], $stays[0]->days->first()->blocks->pluck('type')->all());

        $transition = $copy->transitions()->firstOrFail();
        $this->assertNull($transition->reference);
        $this->assertNull($transition->seat);
        $this->assertSame($start->copy()->addDays(2)->setTime(9, 0)->toDateTimeString(), (string) $transition->departure_at);

        $this->assertSame(0, $copy->notes()->count());
        $this->assertSame(0, $copy->reservations()->count());
        $this->assertSame(0, $copy->photos()->count());
        $lines = TripBudgetLine::where('trip_id', $copy->id)->get();
        $this->assertEqualsCanonicalizing(['activity-' . $stays[0]->days->first()->activities->first()->id, null], $lines->pluck('key')->all());

        // Dates passées refusées, voyage non publié introuvable.
        $this->actingAs($visitor)->post(route('explore.duplicate', $trip), ['start_date' => '2020-01-01', 'end_date' => '2020-01-05'])->assertSessionHasErrors('start_date');
        $this->actingAs($owner)->delete(route('trips.publication.destroy', $trip));
        $this->actingAs($visitor)->post(route('explore.duplicate', $trip), ['start_date' => $start->toDateString(), 'end_date' => $start->copy()->addDays(4)->toDateString()])->assertNotFound();
    }
}
