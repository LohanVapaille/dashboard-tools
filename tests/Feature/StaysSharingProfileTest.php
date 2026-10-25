<?php

namespace Tests\Feature;

use App\Models\StayCartItem;
use App\Models\StayOrder;
use App\Models\Trip;
use App\Models\TripParticipant;
use App\Models\User;
use App\Services\Stays\StayOrderProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StaysSharingProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Parcours de vente directe (désactivé par défaut, modèle partenaires).
        config(['commerce.direct_booking' => true]);

        config([
            'services.duffel.api_key' => 'duffel_test_key',
            'services.stripe.secret' => 'sk_test_123',
            'stays.commission_percent' => 5,
            'stays.providers.duffel_stays.enabled' => true,
            'stays.providers.openstreetmap.enabled' => true,
            'stays.providers.openstreetmap.geoapify_key' => null,
            'stays.providers.openstreetmap.overpass_url' => 'https://overpass.test/api/interpreter',
        ]);
    }

    private function trip(?User $user = null): Trip
    {
        return Trip::create([
            'title' => 'Lisbonne',
            'start_date' => now()->addMonth()->toDateString(),
            'end_date' => now()->addMonth()->addDays(3)->toDateString(),
            'user_id' => $user?->id,
            'guest_token' => $user ? null : 'owner-guest',
        ]);
    }

    private function searchPayload(): array
    {
        return [
            'latitude' => 38.7223,
            'longitude' => -9.1393,
            'place_name' => 'Lisbonne',
            'check_in' => now()->addMonth()->toDateString(),
            'check_out' => now()->addMonth()->addDays(3)->toDateString(),
            'adults' => 2,
            'rooms' => 1,
        ];
    }

    private function duffelResult(): array
    {
        return [
            'id' => 'srr_1',
            'check_in_date' => now()->addMonth()->toDateString(),
            'check_out_date' => now()->addMonth()->addDays(3)->toDateString(),
            'rooms' => 1,
            'guests' => [['type' => 'adult'], ['type' => 'adult']],
            'cheapest_rate_total_amount' => '300.00',
            'cheapest_rate_currency' => 'EUR',
            'accommodation' => [
                'name' => 'Hotel Jorge V',
                'rating' => 3,
                'review_score' => 8.4,
                'photos' => [['url' => 'https://example.com/photo.jpg']],
                'amenities' => [['type' => 'wifi'], ['type' => 'pool']],
                'location' => [
                    'geographic_coordinates' => ['latitude' => 38.7213, 'longitude' => -9.1494],
                    'address' => ['line_one' => 'Rua Mouzinho da Silveira 3', 'city_name' => 'Lisboa', 'postal_code' => '1250-165'],
                ],
                'rooms' => [[
                    'name' => 'Chambre double',
                    'beds' => [['type' => 'double', 'count' => 1]],
                    'rates' => [[
                        'id' => 'rat_1',
                        'total_amount' => '300.00',
                        'total_currency' => 'EUR',
                        'board_type' => 'breakfast',
                        'cancellation_timeline' => [['refund_amount' => '300.00', 'before' => now()->addWeeks(3)->toIso8601String()]],
                    ]],
                ]],
            ],
        ];
    }

    public function test_stay_search_merges_bookable_offers_and_open_listings(): void
    {
        $user = User::factory()->create();
        $trip = $this->trip($user);
        Http::fake([
            'api.duffel.com/stays/search' => Http::response(['data' => ['results' => [$this->duffelResult()]]]),
            'overpass.test/*' => Http::response(['elements' => [
                ['type' => 'node', 'id' => 1, 'lat' => 38.72131, 'lon' => -9.14941, 'tags' => ['tourism' => 'hotel', 'name' => 'Hotel Jorge V', 'stars' => '3']],
                ['type' => 'node', 'id' => 2, 'lat' => 38.7273, 'lon' => -9.1421, 'tags' => ['tourism' => 'guest_house', 'name' => 'Residencial João XXI', 'internet_access' => 'wlan', 'website' => 'https://joao.example']],
            ]]),
        ]);

        $this->actingAs($user)->postJson(route('trips.stays.search', $trip), $this->searchPayload())
            ->assertOk()
            ->assertJsonPath('properties.0.bookable', true)
            ->assertJsonPath('properties.0.price.provider_amount', 300)
            ->assertJsonPath('properties.0.price.total_amount', 315)
            ->assertJsonPath('properties.0.price.per_night', 105)
            ->assertJsonPath('properties.0.amenities', ['wifi', 'pool', 'breakfast'])
            ->assertJsonCount(4, 'partners');

        // Le même hôtel n'apparaît pas une seconde fois dans l'annuaire.
        $this->actingAs($user)->postJson(route('trips.stays.listings', $trip), $this->searchPayload())
            ->assertOk()
            ->assertJsonCount(1, 'properties')
            ->assertJsonPath('properties.0.name', 'Residencial João XXI')
            ->assertJsonPath('properties.0.type', 'guest_house')
            ->assertJsonPath('properties.0.amenities', ['wifi'])
            ->assertJsonPath('properties.0.links.website', 'https://joao.example');
    }

    public function test_stay_is_booked_after_payment_and_refunded_if_the_property_refuses(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $trip = $this->trip($user);

        Http::fake([
            'api.duffel.com/stays/search_results/srr_1/actions/fetch_all_rates' => Http::response(['data' => $this->duffelResult()]),
            'api.duffel.com/stays/quotes' => Http::response(['data' => ['id' => 'quo_1', 'total_amount' => '300.00', 'total_currency' => 'EUR', 'rooms' => 1, 'guests' => [['type' => 'adult'], ['type' => 'adult']]]]),
            'api.stripe.com/v1/checkout/sessions' => Http::response(['id' => 'cs_stay', 'url' => 'https://checkout.stripe.com/pay/cs_stay']),
            'api.stripe.com/v1/payment_intents/*' => Http::response([]),
            'api.stripe.com/v1/refunds' => Http::response(['id' => 're_1']),
            'api.duffel.com/stays/bookings' => Http::response(['errors' => [['message' => 'Sold out']]], 422),
        ]);

        $this->actingAs($user)->postJson(route('stays.cart.store'), ['trip_id' => $trip->id, 'search_result_id' => 'srr_1', 'rate_id' => 'rat_1'])
            ->assertOk()->assertJsonPath('count', 1);

        $this->actingAs($user)->get(route('flights.cart.index'))->assertOk();

        $this->actingAs($user)->postJson(route('stays.checkout.store'), [
            'guests' => [['given_name' => 'Léa', 'family_name' => 'Martin']],
            'contact_email' => 'lea@example.com',
            'contact_phone' => '06 12 34 56 78',
            'accept_terms' => true,
        ])->assertOk();

        $order = StayOrder::firstOrFail();
        $this->assertSame('315.00', (string) $order->total_amount);
        Http::assertSent(fn (Request $request) => str_contains($request->url(), 'checkout/sessions')
            && $request['metadata']['stay_order_id'] === (string) $order->id
            && $request['line_items'][0]['price_data']['unit_amount'] === 30000
            && $request['line_items'][1]['price_data']['unit_amount'] === 1500);

        app(StayOrderProcessor::class)->handlePaidSession($order, ['id' => 'cs_stay', 'payment_status' => 'paid', 'payment_intent' => 'pi_stay']);

        $order->refresh();
        $this->assertSame('failed', $order->status);
        $this->assertSame('315.00', (string) $order->refunded_amount);
        Http::assertSent(fn (Request $request) => str_contains($request->url(), '/refunds') && $request['amount'] === 31500);
        $this->assertSame(0, StayCartItem::count());
    }

    public function test_opening_a_share_link_never_creates_a_member(): void
    {
        $trip = $this->trip(User::factory()->create());
        $trip->forceFill(['share_token' => 'abc123'])->save();

        // Robots d'aperçu, rafraîchissements, ouvertures multiples…
        foreach (range(1, 5) as $ignored) {
            $this->get('/rejoindre/abc123')->assertOk();
            $this->get('/trips/join/abc123')->assertRedirect('/rejoindre/abc123');
        }

        $this->assertSame(0, TripParticipant::count());
    }

    public function test_guest_joins_once_with_a_pseudo(): void
    {
        $trip = $this->trip(User::factory()->create());
        $trip->forceFill(['share_token' => 'abc123'])->save();

        $this->post('/rejoindre/abc123', ['pseudo' => ''])->assertSessionHasErrors('pseudo');

        // Double envoi du formulaire par le même invité : une seule participation.
        $this->withCookie('guest_token', 'guest-42')->post('/rejoindre/abc123', ['pseudo' => 'Tonton Marc'])->assertRedirect(route('trips.show', $trip));
        $this->withCookie('guest_token', 'guest-42')->post('/rejoindre/abc123', ['pseudo' => 'Tonton Marc'])->assertRedirect(route('trips.show', $trip));

        $this->assertSame(1, TripParticipant::count());
        $this->assertSame('Tonton Marc', TripParticipant::first()->guest_name);
    }

    public function test_guest_join_respects_the_three_trip_limit(): void
    {
        foreach (range(1, 3) as $index) {
            Trip::create(['title' => "Voyage {$index}", 'start_date' => '2027-01-01', 'end_date' => '2027-01-02', 'guest_token' => 'limited-guest']);
        }
        $trip = $this->trip(User::factory()->create());
        $trip->forceFill(['share_token' => 'abc123'])->save();

        $this->withCookie('guest_token', 'limited-guest')
            ->post('/rejoindre/abc123', ['pseudo' => 'Léa'])
            ->assertSessionHasErrors('guest_limit');

        $this->assertSame(0, TripParticipant::count());
    }

    public function test_guest_trips_are_attached_on_email_login(): void
    {
        $user = User::factory()->create();
        $owned = Trip::create(['title' => 'Invité', 'start_date' => '2027-01-01', 'end_date' => '2027-01-02', 'guest_token' => 'guest-1']);
        $other = $this->trip(User::factory()->create());
        TripParticipant::create(['trip_id' => $other->id, 'guest_token' => 'guest-1', 'guest_name' => 'Léa', 'role' => 'viewer', 'status' => 'accepted']);

        $this->withCookie('guest_token', 'guest-1')->post('/login', ['email' => $user->email, 'password' => 'password']);

        $this->assertSame($user->id, $owned->fresh()->user_id);
        $this->assertSame($user->id, TripParticipant::first()->user_id);
    }

    public function test_trip_is_created_with_origin_and_several_destinations(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('trips.store'), [
            'start_date' => '2027-05-01',
            'end_date' => '2027-05-08',
            'travelers' => 3,
            'origin' => ['name' => 'Lyon, France', 'latitude' => 45.76, 'longitude' => 4.83],
            'destinations' => [
                ['name' => 'Lisbonne, Portugal', 'latitude' => 38.72, 'longitude' => -9.14],
                ['name' => 'Porto, Portugal', 'latitude' => 41.15, 'longitude' => -8.61, 'nights' => 2],
            ],
        ])->assertRedirect();

        $trip = Trip::with('stays.days')->firstOrFail();
        $this->assertSame('Lisbonne & Porto', $trip->title);
        $this->assertSame(3, $trip->travelers);
        $this->assertSame('Lyon, France', $trip->origin_name);
        $this->assertSame(['2027-05-01', '2027-05-06'], $trip->stays->pluck('arrival_date')->map(fn ($date) => substr($date, 0, 10))->all());
        $this->assertSame('2027-05-08', substr($trip->stays->last()->departure_date, 0, 10));
        $this->assertCount(6, $trip->stays->first()->days);
    }

    public function test_main_pages_render(): void
    {
        $user = User::factory()->create();

        $this->get(route('legal.terms'))->assertOk()->assertInertia(fn ($page) => $page->component('Legal/Terms'));
        $this->get('/conditions-de-vente-vols')->assertRedirect('/conditions-generales');
        $this->get(route('legal.notice'))->assertOk()->assertInertia(fn ($page) => $page->component('Legal/Notice')->has('legal.host'));
        $this->get(route('legal.privacy'))->assertOk()->assertInertia(fn ($page) => $page->component('Legal/Privacy')->where('sessionCookie', config('session.cookie')));
        $this->actingAs($user)->get(route('trips.index'))->assertOk()->assertInertia(fn ($page) => $page->component('Trips/Index'));
        $this->actingAs($user)->get(route('flights.orders.index'))->assertOk()->assertInertia(fn ($page) => $page->component('Reservations/Index'));
        $this->actingAs($user)->get(route('flights.cart.index'))->assertOk()->assertInertia(fn ($page) => $page->component('Cart/Index'));
        $this->actingAs($user)->get(route('profile.edit'))->assertOk()->assertInertia(fn ($page) => $page->component('Profile/Edit')->has('stats'));
    }

    public function test_profile_photo_is_uploaded_as_a_square_webp(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('profile.avatar.update'), ['avatar' => UploadedFile::fake()->image('moi.jpg', 800, 600)])
            ->assertSessionHasNoErrors();

        $avatar = $user->fresh()->avatar;
        $this->assertStringContainsString('/storage/avatars/', $avatar);
        $path = 'avatars/' . basename($avatar);
        Storage::disk('public')->assertExists($path);
        $this->assertSame([400, 400], array_slice(getimagesizefromstring(Storage::disk('public')->get($path)), 0, 2));

        $this->actingAs($user)->delete(route('profile.avatar.destroy'));
        Storage::disk('public')->assertMissing($path);
        $this->assertNull($user->fresh()->avatar);
    }
}
