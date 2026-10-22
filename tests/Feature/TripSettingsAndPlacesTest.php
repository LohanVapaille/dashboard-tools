<?php

namespace Tests\Feature;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TripSettingsAndPlacesTest extends TestCase
{
    use RefreshDatabase;

    private function trip(User $user): Trip
    {
        return Trip::create([
            'title' => 'Islande',
            'start_date' => now()->addMonth()->toDateString(),
            'end_date' => now()->addMonth()->addDays(7)->toDateString(),
            'user_id' => $user->id,
        ]);
    }

    public function test_a_country_is_turned_into_its_biggest_cities(): void
    {
        foreach (['Islande', 'Ísland', 'iceland'] as $name) {
            $this->getJson(route('places.cities', ['name' => $name]))
                ->assertOk()
                ->assertJsonPath('mode', 'country')
                ->assertJsonPath('country.code', 'IS')
                ->assertJsonPath('cities.0.name', 'Reykjavík');
        }

        // Le code pays d'une ville ne suffit pas à la traiter comme un pays.
        $this->getJson(route('places.cities', ['name' => 'Reykjavík, Islande', 'country_code' => 'is', 'kind' => 'city']))
            ->assertOk()
            ->assertJsonPath('mode', null);

        $this->getJson(route('places.cities', ['name' => 'Ísland', 'country_code' => 'is', 'kind' => 'country']))
            ->assertJsonPath('country.code', 'IS');
    }

    public function test_nearby_big_cities_are_suggested_around_a_region(): void
    {
        $this->getJson(route('places.cities', ['latitude' => 43.35, 'longitude' => 11.0, 'nearby' => 1]))
            ->assertOk()
            ->assertJsonPath('mode', 'nearby')
            ->assertJsonPath('cities.0.name', 'Florence');

        $this->getJson(route('places.cities', ['latitude' => -60, 'longitude' => -140, 'nearby' => 1]))
            ->assertJsonPath('mode', null);
    }

    public function test_settings_update_travelers_and_origin(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);

        $this->actingAs($user)->put(route('trips.update', $trip), [
            'title' => 'Islande en van',
            'description' => 'Route 1',
            'start_date' => $trip->start_date,
            'end_date' => $trip->end_date,
            'travelers' => 4,
            'origin_name' => 'Lyon, France',
            'origin_latitude' => 45.76,
            'origin_longitude' => 4.83,
        ])->assertRedirect();

        $trip->refresh();
        $this->assertSame('Islande en van', $trip->title);
        $this->assertSame(4, $trip->travelers);
        $this->assertSame('Lyon, France', $trip->origin_name);

        $this->actingAs($user)->put(route('trips.update', $trip), [
            'title' => 'X', 'start_date' => $trip->start_date, 'end_date' => $trip->end_date, 'travelers' => 40,
        ])->assertSessionHasErrors('travelers');
    }

    public function test_share_link_can_be_reset(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);
        $old = $trip->share_token;

        $url = $this->actingAs($user)->postJson(route('trips.share', $trip))->assertOk()->json('share_url');

        $this->assertNotSame($old, $trip->refresh()->share_token);
        $this->assertSame(route('trips.join', $trip->share_token), $url);
        $this->get(route('trips.join', $old))->assertNotFound();
    }

    public function test_deleting_a_trip_keeps_paid_flight_bookings(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);
        $bookingId = DB::table('flight_bookings')->insertGetId([
            'user_id' => $user->id,
            'trip_id' => $trip->id,
            'duffel_offer_id' => 'off_1',
            'status' => 'confirmed',
            'currency' => 'EUR',
            'flight_amount' => 100,
            'service_fee' => 5,
            'total_amount' => 105,
            'passengers' => '[]',
        ]);

        $this->actingAs($user)->delete(route('trips.destroy', $trip))->assertRedirect(route('trips.index'));

        $this->assertDatabaseHas('flight_bookings', ['id' => $bookingId, 'trip_id' => null]);
    }
}
