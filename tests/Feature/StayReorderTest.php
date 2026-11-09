<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\StayTransition;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class StayReorderTest extends TestCase
{
    use RefreshDatabase;

    public function test_stays_are_chained_in_the_new_order_with_their_days(): void
    {
        $user = User::factory()->create();
        $trip = Trip::create([
            'title' => 'Portugal',
            'start_date' => '2027-05-01',
            'end_date' => '2027-05-06',
            'user_id' => $user->id,
        ]);

        $lisbon = $trip->stays()->create(['location_name' => 'Lisbonne', 'latitude' => 38.72, 'longitude' => -9.14, 'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-04']);
        $porto = $trip->stays()->create(['location_name' => 'Porto', 'latitude' => 41.15, 'longitude' => -8.61, 'arrival_date' => '2027-05-04', 'departure_date' => '2027-05-06']);
        $lisbon->generateDays();
        $porto->generateDays();

        $portoFirstDay = $porto->days()->first();
        Activity::create(['day_id' => $portoFirstDay->id, 'title' => 'Livraria Lello', 'period' => 'morning']);
        StayTransition::create(['trip_id' => $trip->id, 'from_stay_id' => $lisbon->id, 'to_stay_id' => $porto->id, 'transport_mode' => 'train']);

        $this->actingAs($user)
            ->patch(route('stays.reorder', $trip), ['stays' => [$porto->id, $lisbon->id]])
            ->assertRedirect();

        $porto->refresh();
        $lisbon->refresh();
        $this->assertSame('2027-05-01', Carbon::parse($porto->arrival_date)->toDateString());
        $this->assertSame('2027-05-03', Carbon::parse($porto->departure_date)->toDateString());
        $this->assertSame('2027-05-03', Carbon::parse($lisbon->arrival_date)->toDateString());
        $this->assertSame('2027-05-06', Carbon::parse($lisbon->departure_date)->toDateString());

        // L'activité suit sa journée, qui a été décalée avec l'étape.
        $this->assertSame('2027-05-01', Carbon::parse($portoFirstDay->fresh()->date)->toDateString());
        $this->assertSame(1, $portoFirstDay->fresh()->activities()->count());

        // Lisbonne → Porto ne relie plus deux étapes consécutives.
        $this->assertSame(0, $trip->transitions()->count());
    }

    public function test_the_order_must_contain_exactly_the_trip_stays(): void
    {
        $user = User::factory()->create();
        $trip = Trip::create(['title' => 'Test', 'start_date' => '2027-05-01', 'end_date' => '2027-05-03', 'user_id' => $user->id]);
        $stay = $trip->stays()->create(['location_name' => 'Rome', 'latitude' => 41.9, 'longitude' => 12.5, 'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-03']);

        $this->actingAs($user)
            ->patch(route('stays.reorder', $trip), ['stays' => [$stay->id + 999]])
            ->assertStatus(422);
    }
}
