<?php

namespace Tests\Feature;

use App\Http\Controllers\StaySearchController;
use App\Models\StayOrder;
use App\Models\Trip;
use App\Models\TripParticipant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Mode partenaires : carnet de réservations et hôtels payés dans le module Nuitée intégré. */
class PartnerReservationsTest extends TestCase
{
    use RefreshDatabase;

    private function trip(User $owner): Trip
    {
        return Trip::create(['title' => 'Islande', 'start_date' => now()->addMonth()->toDateString(), 'end_date' => now()->addMonth()->addDays(6)->toDateString(), 'user_id' => $owner->id]);
    }

    public function test_reservations_made_with_partners_are_kept_in_the_trip(): void
    {
        $owner = User::factory()->create();
        $trip = $this->trip($owner);

        $id = $this->actingAs($owner)->postJson(route('trips.reservations.store', $trip), [
            'kind' => 'flight',
            'title' => 'Icelandair · Paris → Reykjavík',
            'provider' => 'Aviasales',
            'reference' => 'XK42P',
            'starts_at' => now()->addMonth()->format('Y-m-d') . 'T10:30',
            'ends_at' => now()->addMonth()->format('Y-m-d') . 'T12:05',
            'price' => 412.5,
            'currency' => 'eur',
        ])->assertCreated()->assertJsonPath('reservation.currency', 'EUR')->json('reservation.id');

        $this->actingAs($owner)->get(route('trips.show', $trip))
            ->assertInertia(fn ($page) => $page->where('trip.reservations.0.reference', 'XK42P'));

        $this->actingAs($owner)->putJson(route('trips.reservations.update', [$trip, $id]), ['kind' => 'flight', 'title' => 'Vol aller', 'reference' => 'XK42Q'])
            ->assertOk()->assertJsonPath('reservation.reference', 'XK42Q');

        // Un lecteur ne modifie rien ; une réservation d'un autre voyage est introuvable.
        $viewer = User::factory()->create();
        TripParticipant::create(['trip_id' => $trip->id, 'user_id' => $viewer->id, 'role' => 'viewer', 'status' => 'accepted']);
        $this->actingAs($viewer)->deleteJson(route('trips.reservations.destroy', [$trip, $id]))->assertForbidden();

        $other = $this->trip($owner);
        $this->actingAs($owner)->deleteJson(route('trips.reservations.destroy', [$other, $id]))->assertNotFound();

        $this->actingAs($owner)->deleteJson(route('trips.reservations.destroy', [$trip, $id]))->assertOk();
        $this->assertDatabaseCount('trip_reservations', 0);
    }

    public function test_hotel_is_booked_and_paid_inside_the_site_through_nuitee(): void
    {
        Mail::fake();
        config([
            'commerce.direct_booking' => false,
            'stays.providers.liteapi.key' => 'sand_test',
            'stays.providers.liteapi.enabled' => true,
            'stays.providers.liteapi.embedded_checkout' => true,
        ]);
        $owner = User::factory()->create();
        $trip = $this->trip($owner);
        $checkIn = now()->addMonth()->toDateString();
        $checkOut = now()->addMonth()->addDays(2)->toDateString();

        Cache::put(StaySearchController::rateCacheKey('lite_lp1', 'lite_rate1'), [
            'property' => ['id' => 'lite_lp1', 'name' => 'Hôtel Borg', 'address' => 'Pósthússtræti 11, Reykjavík', 'check_in' => '15:00', 'check_out' => '11:00', 'check_in_date' => $checkIn, 'check_out_date' => $checkOut],
            'room' => ['name' => 'Chambre double', 'rates' => []],
            'rate' => ['id' => 'lite_rate1', 'offer_id' => 'offer-xyz', 'total_amount' => 300.0, 'currency' => 'EUR', 'board_label' => 'Petit-déjeuner inclus', 'refundable' => true],
        ], now()->addMinutes(10));

        Http::fake([
            'book.liteapi.travel/v3.0/rates/prebook' => Http::response(['data' => [
                'prebookId' => 'pb_1', 'price' => 300, 'currency' => 'EUR', 'transactionId' => 'tr_1', 'secretKey' => 'pi_secret_1',
            ]]),
            'book.liteapi.travel/v3.0/rates/book' => Http::response(['data' => ['bookingId' => 'bk_1', 'status' => 'CONFIRMED', 'hotelConfirmationCode' => 'BORG-7']]),
        ]);

        $this->get(route('legal.terms'))->assertInertia(fn ($page) => $page->component('Legal/PartnerTerms')->where('embeddedHotels', true));

        // Tarifs Nuitée (souvent sous le prix conseillé) : visibles uniquement par les membres connectés.
        $this->getJson(route('stays.rates', 'lite_lp1') . '?latitude=64.1&longitude=-21.9&check_in=' . $checkIn . '&check_out=' . $checkOut . '&adults=2&rooms=1')
            ->assertOk()->assertJsonPath('members_only', true)->assertJsonCount(0, 'rooms');

        $start = $this->actingAs($owner)->postJson(route('stays.embedded.start'), [
            'trip_id' => $trip->id,
            'search_result_id' => 'lite_lp1',
            'rate_id' => 'lite_rate1',
            'context' => ['latitude' => 64.14, 'longitude' => -21.94, 'check_in' => $checkIn, 'check_out' => $checkOut, 'adults' => 2, 'rooms' => 1],
            'holder' => ['first_name' => 'Ada', 'last_name' => 'Lovelace', 'email' => 'ada@example.com'],
            'accept_terms' => true,
        ])->assertOk()
            ->assertJsonPath('payment.public_key', 'sandbox')
            ->assertJsonPath('payment.secret_key', 'pi_secret_1')
            ->assertJsonPath('amount', 300);

        Http::assertSent(fn (Request $request) => str_contains($request->url(), '/rates/prebook') && $request['usePaymentSdk'] === true);

        $order = StayOrder::where('reference', $start->json('reference'))->firstOrFail();
        $this->assertSame('liteapi_sdk', $order->payment_method);
        $this->assertSame(0.0, (float) $order->fee_amount);

        // Retour du module de paiement (rechargé deux fois : une seule réservation).
        $this->actingAs($owner)->get(route('stays.embedded.complete', $order))->assertRedirect(route('stays.orders.show', $order));
        $this->actingAs($owner)->get(route('stays.embedded.complete', $order))->assertRedirect();

        Http::assertSentCount(2);
        Http::assertSent(fn (Request $request) => str_contains($request->url(), '/rates/book')
            && $request['payment'] === ['method' => 'TRANSACTION_ID', 'transactionId' => 'tr_1']);
        $this->assertSame('confirmed', $order->fresh()->status);
        $this->assertDatabaseHas('trip_reservations', ['trip_id' => $trip->id, 'kind' => 'stay', 'reference' => 'BORG-7', 'title' => 'Hôtel Borg']);
        Mail::assertSent(\App\Mail\StayOrderConfirmation::class);

        // Un autre utilisateur ne peut pas déclencher la confirmation.
        $this->actingAs(User::factory()->create())->get(route('stays.embedded.complete', $order))->assertNotFound();
    }

    public function test_partner_reservations_appear_in_my_reservations_and_cart_is_closed(): void
    {
        $owner = User::factory()->create();
        $trip = $this->trip($owner);
        $trip->reservations()->create(['user_id' => $owner->id, 'kind' => 'flight', 'title' => 'Iberia · Paris → Almaty', 'provider' => 'Aviasales', 'price' => 453.76]);
        // Hôtel payé chez Nuitée : déjà listé dans les commandes, pas en double.
        $trip->reservations()->create(['user_id' => $owner->id, 'kind' => 'stay', 'title' => 'Hôtel Borg', 'details' => ['stay_order' => 'TS-ABC123']]);

        $this->actingAs($owner)->get(route('flights.orders.index'))->assertOk()->assertInertia(fn ($page) => $page
            ->component('Reservations/Index')
            ->has('partnerReservations', 1)
            ->where('partnerReservations.0.title', 'Iberia · Paris → Almaty')
            ->where('partnerReservations.0.trip.title', 'Islande'));

        config(['commerce.direct_booking' => false]);
        $this->actingAs($owner)->get(route('flights.cart.index'))->assertRedirect(route('trips.index'));
    }

    public function test_embedded_checkout_is_closed_unless_enabled(): void
    {
        config(['commerce.direct_booking' => false, 'stays.providers.liteapi.key' => 'sand_test', 'stays.providers.liteapi.embedded_checkout' => false]);

        $this->actingAs(User::factory()->create())->postJson(route('stays.embedded.start'), [])->assertForbidden();
    }
}
