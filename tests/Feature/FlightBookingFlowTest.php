<?php

namespace Tests\Feature;

use App\Mail\FlightOrderConfirmation;
use App\Models\FlightCartItem;
use App\Models\FlightOrder;
use App\Models\Trip;
use App\Models\User;
use App\Services\Flights\AirportDirectory;
use App\Services\Flights\FlightPricing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class FlightBookingFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.duffel.api_key' => 'duffel_test_key',
            'flights.providers.duffel.enabled' => true,
            'flights.providers.travelpayouts.enabled' => false,
            'flights.tax_percent' => 5,
            'services.stripe.secret' => 'sk_test_123',
            'services.stripe.webhook_secret' => 'whsec_test',
        ]);
    }

    private function offer(string $id, string $amount = '100.00', string $from = 'CDG', string $to = 'LIS', string $departure = '2027-05-10T08:35:00'): array
    {
        return [
            'id' => $id,
            'total_amount' => $amount,
            'total_currency' => 'EUR',
            'base_amount' => '80.00',
            'tax_amount' => '20.00',
            'expires_at' => now()->addHour()->toIso8601String(),
            'owner' => ['name' => 'Duffel Airways', 'iata_code' => 'ZZ', 'logo_symbol_url' => null],
            'passengers' => [['id' => 'pas_' . $id . '_1', 'type' => 'adult']],
            'conditions' => [
                'refund_before_departure' => ['allowed' => true, 'penalty_amount' => '20.00'],
                'change_before_departure' => ['allowed' => false],
            ],
            'slices' => [[
                'origin' => ['iata_code' => $from, 'name' => 'Origin', 'city_name' => 'Paris'],
                'destination' => ['iata_code' => $to, 'name' => 'Destination', 'city_name' => 'Lisbonne'],
                'duration' => 'PT2H30M',
                'segments' => [[
                    'origin' => ['iata_code' => $from, 'name' => 'Origin', 'city_name' => 'Paris'],
                    'destination' => ['iata_code' => $to, 'name' => 'Destination', 'city_name' => 'Lisbonne'],
                    'departing_at' => $departure,
                    'arriving_at' => substr($departure, 0, 11) . '11:05:00',
                    'duration' => 'PT2H30M',
                    'marketing_carrier' => ['name' => 'Duffel Airways', 'iata_code' => 'ZZ'],
                    'operating_carrier' => ['name' => 'Duffel Airways'],
                    'marketing_carrier_flight_number' => '1234',
                    'passengers' => [['cabin_class_marketing_name' => 'Economy', 'baggages' => [['type' => 'checked', 'quantity' => 1], ['type' => 'carry_on', 'quantity' => 1]]]],
                ]],
            ]],
        ];
    }

    private function tripFor(User $user): Trip
    {
        return Trip::create(['title' => 'Lisbonne', 'start_date' => '2027-05-10', 'end_date' => '2027-05-17', 'user_id' => $user->id]);
    }

    public function test_pricing_uses_the_configurable_tax_percent(): void
    {
        $this->assertSame(5.0, FlightPricing::fee(100));
        $this->assertSame(105.0, FlightPricing::total(100));

        config(['flights.tax_percent' => 7.5]);
        $this->assertSame(107.5, FlightPricing::total(100));
        $this->assertSame(10750, FlightPricing::toMinor(107.5, 'EUR'));
        $this->assertSame(1000, FlightPricing::toMinor(1000, 'JPY'));
    }

    public function test_nearest_airport_prefers_the_main_commercial_airport(): void
    {
        $directory = new AirportDirectory();

        $this->assertSame('LYS', $directory->nearest(45.7640, 4.8357)[0]['code']); // Lyon centre
        $this->assertContains($directory->nearest(48.8566, 2.3522)[0]['code'], ['CDG', 'ORY']); // Paris centre
        $this->assertSame('LIS', $directory->nearest(38.7223, -9.1393)[0]['code']); // Lisbonne
    }

    public function test_search_returns_prices_including_taxes(): void
    {
        $user = User::factory()->create();
        $trip = $this->tripFor($user);
        Http::fake(['api.duffel.com/air/offer_requests*' => Http::response(['data' => ['offers' => [$this->offer('off_1', '200.00')]]])]);

        $response = $this->actingAs($user)->postJson(route('trips.travel-search.flights', $trip), [
            'origin' => 'CDG', 'destination' => 'LIS', 'date' => '2027-05-10', 'passengers' => 1,
        ]);

        $response->assertOk()
            ->assertJsonPath('offers.0.airline_amount', 200)
            ->assertJsonPath('offers.0.fee_amount', 10)
            ->assertJsonPath('offers.0.total_amount', 210)
            ->assertJsonPath('offers.0.baggage.checked', 1)
            ->assertJsonPath('offers.0.conditions.refundable', true)
            ->assertJsonPath('pricing.fee_percent', 5);
    }

    public function test_roundtrip_is_added_to_cart_and_paid_in_one_stripe_session(): void
    {
        $user = User::factory()->create();
        $trip = $this->tripFor($user);

        Http::fake([
            'api.duffel.com/air/offers/off_out' => Http::response(['data' => $this->offer('off_out', '100.00')]),
            'api.duffel.com/air/offers/off_back' => Http::response(['data' => $this->offer('off_back', '150.00', 'LIS', 'CDG', '2027-05-17T18:00:00')]),
            'api.stripe.com/v1/checkout/sessions' => Http::response(['id' => 'cs_test_1', 'url' => 'https://checkout.stripe.com/pay/cs_test_1']),
        ]);

        $this->actingAs($user)->postJson(route('flights.cart.store'), [
            'trip_id' => $trip->id,
            'items' => [
                ['offer_id' => 'off_out', 'direction' => 'outbound'],
                ['offer_id' => 'off_back', 'direction' => 'return'],
            ],
        ])->assertOk()->assertJsonPath('count', 2);

        $this->actingAs($user)->postJson(route('flights.checkout.store'), [
            'passengers' => [['title' => 'ms', 'gender' => 'f', 'given_name' => 'Léa', 'family_name' => 'Martin', 'born_on' => '1990-04-02']],
            'contact_email' => 'lea@example.com',
            'contact_phone' => '06 12 34 56 78',
            'accept_terms' => true,
        ])->assertOk()->assertJsonPath('url', 'https://checkout.stripe.com/pay/cs_test_1');

        $order = FlightOrder::firstOrFail();
        $this->assertSame('262.50', (string) $order->total_amount);
        $this->assertSame('12.50', (string) $order->fee_amount);
        $this->assertSame('+33612345678', $order->contact_phone);
        $this->assertCount(2, $order->bookings);

        Http::assertSent(function (Request $request) {
            if (!str_contains($request->url(), 'checkout/sessions')) {
                return false;
            }
            $data = $request->data();

            return $data['line_items'][0]['price_data']['unit_amount'] === 10000
                && $data['line_items'][1]['price_data']['unit_amount'] === 15000
                && $data['line_items'][2]['price_data']['unit_amount'] === 1250
                && $data['locale'] === 'fr';
        });
    }

    public function test_checkout_requires_terms_and_adult_passengers(): void
    {
        $user = User::factory()->create();
        FlightCartItem::create([
            'user_id' => $user->id, 'offer_id' => 'off_1', 'direction' => 'oneway', 'passengers_count' => 1,
            'currency' => 'EUR', 'flight_amount' => 100, 'offer' => [], 'expires_at' => now()->addMinutes(20),
        ]);

        $this->actingAs($user)->postJson(route('flights.checkout.store'), [
            'passengers' => [['title' => 'mr', 'gender' => 'm', 'given_name' => 'Tom', 'family_name' => 'Petit', 'born_on' => now()->subYears(10)->toDateString()]],
            'contact_email' => 'tom@example.com',
            'contact_phone' => '+33612345678',
        ])->assertStatus(422)->assertJsonValidationErrors(['accept_terms', 'passengers.0.born_on']);
    }

    public function test_price_change_blocks_payment_until_reviewed(): void
    {
        $user = User::factory()->create();
        FlightCartItem::create([
            'user_id' => $user->id, 'offer_id' => 'off_1', 'direction' => 'oneway', 'passengers_count' => 1,
            'currency' => 'EUR', 'flight_amount' => 100, 'offer' => [], 'expires_at' => now()->addMinutes(20),
        ]);
        Http::fake(['api.duffel.com/air/offers/off_1' => Http::response(['data' => $this->offer('off_1', '120.00')])]);

        $this->actingAs($user)->postJson(route('flights.checkout.store'), [
            'passengers' => [['title' => 'mr', 'gender' => 'm', 'given_name' => 'Tom', 'family_name' => 'Petit', 'born_on' => '1985-01-01']],
            'contact_email' => 'tom@example.com',
            'contact_phone' => '+33612345678',
            'accept_terms' => true,
        ])->assertStatus(409)->assertJsonPath('price_changed', true);

        $this->assertSame('120.00', (string) FlightCartItem::first()->flight_amount);
        $this->assertSame(0, FlightOrder::count());
    }

    public function test_paid_webhook_issues_tickets_once_and_refunds_a_failed_leg(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $order = $this->paidOrderFixture($user);

        Http::fake([
            'api.stripe.com/v1/payment_intents/*' => Http::response(['latest_charge' => ['receipt_url' => 'https://pay.stripe.com/receipts/1']]),
            'api.stripe.com/v1/refunds' => Http::response(['id' => 're_1']),
            'api.duffel.com/air/orders' => Http::sequence()
                ->push(['data' => ['id' => 'ord_1', 'booking_reference' => 'ABC123', 'documents' => [['type' => 'electronic_ticket', 'unique_identifier' => '125-000']]]])
                ->push(['errors' => [['message' => 'Offer no longer available']]], 422),
        ]);

        $event = json_encode([
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'id' => 'cs_test_1', 'payment_status' => 'paid', 'payment_intent' => 'pi_1',
                'metadata' => ['flight_order_id' => (string) $order->id],
            ]],
        ]);
        $timestamp = time();
        $signature = 't=' . $timestamp . ',v1=' . hash_hmac('sha256', $timestamp . '.' . $event, 'whsec_test');

        $this->call('POST', route('stripe.flights.webhook'), [], [], [], ['HTTP_STRIPE_SIGNATURE' => $signature, 'CONTENT_TYPE' => 'application/json'], $event)->assertOk();
        // Un second envoi (webhook rejoué ou page de retour) ne doit rien réémettre.
        $this->call('POST', route('stripe.webhook'), [], [], [], ['HTTP_STRIPE_SIGNATURE' => $signature, 'CONTENT_TYPE' => 'application/json'], $event)->assertOk();

        $order->refresh();
        $this->assertSame('partially_confirmed', $order->status);
        $this->assertSame('https://pay.stripe.com/receipts/1', $order->stripe_receipt_url);
        $this->assertSame('157.50', (string) $order->refunded_amount);
        [$outbound, $return] = $order->bookings;
        $this->assertSame('ticketed', $outbound->status);
        $this->assertSame('ABC123', $outbound->booking_reference);
        $this->assertSame('failed', $return->status);
        $this->assertSame(0, FlightCartItem::count());

        Http::assertSentCount(4); // reçu + 2 commandes Duffel + 1 remboursement
        Http::assertSent(fn (Request $request) => str_contains($request->url(), '/refunds') && $request['amount'] === 15750);
        Http::assertSent(fn (Request $request) => str_contains($request->url(), '/air/orders') && $request['data']['passengers'][0]['id'] === 'pas_off_out_1');
        Mail::assertSent(FlightOrderConfirmation::class);
    }

    public function test_paid_baggage_is_priced_with_taxes_and_sent_to_the_airline(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $trip = $this->tripFor($user);
        $offer = $this->offer('off_bag', '100.00') + ['available_services' => [[
            'id' => 'ase_bag1',
            'type' => 'baggage',
            'maximum_quantity' => 2,
            'passenger_ids' => ['pas_off_bag_1'],
            'segment_ids' => [],
            'total_amount' => '30.00',
            'total_currency' => 'EUR',
            'metadata' => ['type' => 'checked', 'maximum_weight_kg' => 23],
        ]]];

        Http::fake([
            'api.duffel.com/air/offers/off_bag*' => Http::response(['data' => $offer]),
            'api.stripe.com/v1/checkout/sessions' => Http::response(['id' => 'cs_bag', 'url' => 'https://checkout.stripe.com/pay/cs_bag']),
            'api.stripe.com/v1/payment_intents/*' => Http::response([]),
            'api.duffel.com/air/orders' => Http::response(['data' => ['id' => 'ord_bag', 'booking_reference' => 'BAG123']]),
        ]);

        $this->getJson(route('flights.offers.baggage', 'off_bag'))
            ->assertOk()
            ->assertJsonPath('options.0.total_amount', 31.5)
            ->assertJsonPath('options.0.max_weight_kg', 23);

        $this->actingAs($user)->postJson(route('flights.cart.store'), [
            'trip_id' => $trip->id,
            'items' => [['offer_id' => 'off_bag', 'direction' => 'oneway', 'services' => [['id' => 'ase_bag1', 'quantity' => 2]]]],
        ])->assertOk();

        $this->assertSame('160.00', (string) FlightCartItem::first()->flight_amount);

        $this->actingAs($user)->postJson(route('flights.checkout.store'), [
            'passengers' => [['title' => 'mr', 'gender' => 'm', 'given_name' => 'Tom', 'family_name' => 'Petit', 'born_on' => '1985-01-01']],
            'contact_email' => 'tom@example.com',
            'contact_phone' => '+33612345678',
            'accept_terms' => true,
        ])->assertOk();

        $order = FlightOrder::firstOrFail();
        $this->assertSame('168.00', (string) $order->total_amount);

        app(\App\Services\Flights\FlightOrderProcessor::class)->handlePaidSession($order, [
            'id' => 'cs_bag', 'payment_status' => 'paid', 'payment_intent' => 'pi_bag',
        ]);

        Http::assertSent(fn (Request $request) => str_contains($request->url(), '/air/orders')
            && $request['data']['services'] === [['id' => 'ase_bag1', 'quantity' => 2]]
            && $request['data']['payments'][0]['amount'] === '160.00');
        $this->assertSame('ticketed', $order->bookings()->first()->status);
    }

    public function test_unknown_baggage_is_rejected(): void
    {
        $user = User::factory()->create();
        $trip = $this->tripFor($user);
        Http::fake(['api.duffel.com/air/offers/*' => Http::response(['data' => $this->offer('off_x')])]);

        $this->actingAs($user)->postJson(route('flights.cart.store'), [
            'trip_id' => $trip->id,
            'items' => [['offer_id' => 'off_x', 'direction' => 'oneway', 'services' => [['id' => 'ase_fake', 'quantity' => 1]]]],
        ])->assertStatus(422)->assertJsonValidationErrors('cart');
    }

    public function test_orders_are_private_to_their_owner(): void
    {
        $owner = User::factory()->create();
        $order = $this->paidOrderFixture($owner);

        $this->actingAs(User::factory()->create())->get(route('flights.orders.show', $order))->assertNotFound();
        $this->actingAs($owner)->get(route('flights.orders.show', $order))->assertOk();
    }

    public function test_invalid_webhook_signature_is_rejected(): void
    {
        $this->postJson(route('stripe.flights.webhook'), ['type' => 'checkout.session.completed'], ['Stripe-Signature' => 't=1,v1=bad'])
            ->assertStatus(400);
    }

    private function paidOrderFixture(User $user): FlightOrder
    {
        $trip = $this->tripFor($user);
        $order = FlightOrder::create([
            'user_id' => $user->id, 'status' => 'payment_pending', 'currency' => 'EUR',
            'flights_amount' => 250, 'fee_percent' => 5, 'fee_amount' => 12.5, 'total_amount' => 262.5,
            'passengers' => [['title' => 'ms', 'gender' => 'f', 'given_name' => 'Léa', 'family_name' => 'Martin', 'born_on' => '1990-04-02']],
            'contact_email' => 'lea@example.com', 'contact_phone' => '+33612345678',
            'stripe_checkout_session_id' => 'cs_test_1',
        ]);

        foreach ([['off_out', 'outbound', 100], ['off_back', 'return', 150]] as [$offerId, $direction, $amount]) {
            $raw = $this->offer($offerId, number_format($amount, 2, '.', ''));
            $order->bookings()->create([
                'user_id' => $user->id, 'trip_id' => $trip->id, 'direction' => $direction, 'duffel_offer_id' => $offerId,
                'status' => 'pending', 'currency' => 'EUR', 'flight_amount' => $amount, 'service_fee' => $amount * 0.05,
                'total_amount' => $amount * 1.05, 'passengers' => $order->passengers, 'offer_snapshot' => $raw,
                'offer' => app(\App\Services\Flights\Providers\DuffelProvider::class)->normalize($raw),
            ]);
            FlightCartItem::create([
                'user_id' => $user->id, 'trip_id' => $trip->id, 'offer_id' => $offerId, 'direction' => $direction,
                'passengers_count' => 1, 'currency' => 'EUR', 'flight_amount' => $amount, 'offer' => [], 'expires_at' => now()->addMinutes(20),
            ]);
        }

        return $order;
    }
}
