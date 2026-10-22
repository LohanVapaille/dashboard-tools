<?php

namespace Tests\Feature;

use App\Models\StayBooking;
use App\Models\StayOrder;
use App\Models\Trip;
use App\Models\User;
use App\Services\Stays\StayOrderProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class LiteApiStaysTest extends TestCase
{
    use RefreshDatabase;

    private string $checkIn;
    private string $checkOut;

    protected function setUp(): void
    {
        parent::setUp();

        $this->checkIn = now()->addMonth()->toDateString();
        $this->checkOut = now()->addMonth()->addDays(2)->toDateString();

        config([
            'services.stripe.secret' => 'sk_test_123',
            'stays.commission_percent' => 5,
            'stays.providers.liteapi.key' => 'sand_test',
            'stays.providers.liteapi.enabled' => true,
            'stays.providers.duffel_stays.enabled' => false,
            'stays.providers.openstreetmap.enabled' => false,
        ]);
    }

    private function offer(string $offerId, float $amount, string $board, string $refundable): array
    {
        return [
            'roomTypeId' => 'rt_' . $offerId,
            'offerId' => $offerId . str_repeat('x', 300),
            'offerRetailRate' => [['amount' => $amount, 'currency' => 'EUR']],
            'rates' => [[
                'rateId' => 'r_' . $offerId,
                'occupancyNumber' => 1,
                'name' => 'Chambre Double Supérieure',
                'maxOccupancy' => 2,
                'adultCount' => 2,
                'childCount' => 0,
                'boardType' => $board,
                'boardName' => $board === 'BB' ? 'Breakfast Included' : 'Room Only',
                'remarks' => '<p>Check-in à partir de 15 h.</p>',
                'retailRate' => [
                    'total' => [['amount' => $amount, 'currency' => 'EUR']],
                    'taxesAndFees' => [
                        ['included' => true, 'description' => 'VAT', 'amount' => 10, 'currency' => 'EUR'],
                        ['included' => false, 'description' => 'City tax', 'amount' => 6.5, 'currency' => 'EUR'],
                    ],
                ],
                'cancellationPolicies' => [
                    'refundableTag' => $refundable,
                    'cancelPolicyInfos' => $refundable === 'RFN'
                        ? [['cancelTime' => now()->addWeeks(3)->toDateTimeString(), 'amount' => 50, 'currency' => 'EUR', 'type' => 'amount', 'timezone' => 'GMT']]
                        : [],
                    'hotelRemarks' => [],
                ],
            ]],
        ];
    }

    private function ratesResponse(): array
    {
        return [
            'data' => [[
                'hotelId' => 'lp1897',
                'roomTypes' => [$this->offer('off_cheap', 180, 'RO', 'NRFN'), $this->offer('off_flex', 220, 'BB', 'RFN')],
            ]],
            'hotels' => [[
                'id' => 'lp1897',
                'name' => 'Hôtel du Louvre',
                'main_photo' => 'https://static.example/louvre.jpg',
                'address' => '1 Place André Malraux',
                'city_name' => 'Paris',
                'latitude' => 48.8625,
                'longitude' => 2.3359,
                'rating' => 8.7,
                'stars' => 5,
                'review_count' => 1200,
            ]],
            'sandbox' => true,
        ];
    }

    private function context(): array
    {
        return ['latitude' => 48.8566, 'longitude' => 2.3522, 'check_in' => $this->checkIn, 'check_out' => $this->checkOut, 'adults' => 2, 'rooms' => 1];
    }

    public function test_liteapi_hotels_are_searchable_and_bookable_end_to_end(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $trip = Trip::create(['title' => 'Paris', 'start_date' => $this->checkIn, 'end_date' => $this->checkOut, 'user_id' => $user->id]);

        Http::fake([
            'api.liteapi.travel/v3.0/hotels/rates' => Http::response($this->ratesResponse()),
            'api.liteapi.travel/v3.0/data/hotel*' => Http::response(['data' => [
                'hotelDescription' => '<p>Face au Louvre.</p>',
                'hotelImages' => [['url' => 'https://static.example/1.jpg', 'urlHd' => 'https://static.example/1hd.jpg', 'order' => 1]],
                'hotelFacilities' => ['Free WiFi', 'Fitness center', '24-hour front desk'],
                'checkinCheckoutTimes' => ['checkin_start' => '15:00', 'checkout' => '12:00'],
            ]]),
            'book.liteapi.travel/v3.0/rates/prebook' => Http::response(['data' => [
                'prebookId' => 'pb_123', 'price' => 220, 'currency' => 'EUR',
                'roomTypes' => [['rates' => [['adultCount' => 2, 'childCount' => 0]]]],
            ]]),
            'api.stripe.com/v1/checkout/sessions' => Http::response(['id' => 'cs_lite', 'url' => 'https://checkout.stripe.com/pay/cs_lite']),
            'api.stripe.com/v1/payment_intents/*' => Http::response([]),
            'api.stripe.com/v1/refunds' => Http::response(['id' => 're_1']),
            'book.liteapi.travel/v3.0/rates/book' => Http::response(['data' => ['bookingId' => 'bk_9', 'status' => 'CONFIRMED', 'hotelConfirmationCode' => 'HTL-42']]),
            'book.liteapi.travel/v3.0/bookings/bk_9' => Http::response(['data' => ['bookingId' => 'bk_9', 'status' => 'CANCELLED', 'refund_amount' => 170, 'currency' => 'EUR']]),
        ]);

        $search = $this->actingAs($user)->postJson(route('trips.stays.search', $trip), [
            ...$this->context(), 'place_name' => 'Paris',
        ])->assertOk()
            ->assertJsonPath('instant_booking', true)
            ->assertJsonPath('properties.0.id', 'lite_lp1897')
            ->assertJsonPath('properties.0.bookable', true)
            ->assertJsonPath('properties.0.price.provider_amount', 180)
            ->assertJsonPath('properties.0.price.total_amount', 189)
            ->assertJsonPath('properties.0.free_cancellation', true)
            ->assertJsonPath('properties.0.amenities', ['breakfast']);
        $this->assertSame(5, $search->json('properties.0.stars'));

        $rates = $this->actingAs($user)->getJson(route('stays.rates', 'lite_lp1897') . '?' . http_build_query($this->context()))
            ->assertOk()
            ->assertJsonPath('property.photos.0', 'https://static.example/1hd.jpg')
            ->assertJsonPath('property.check_in', '15:00')
            ->assertJsonPath('property.amenities', ['wifi', 'gym', 'reception_24h'])
            ->assertJsonPath('rooms.0.name', 'Chambre Double Supérieure');
        $flexible = collect($rates->json('rooms.0.rates'))->firstWhere('refundable', true);
        $this->assertSame('Petit-déjeuner inclus', $flexible['board_label']);
        $this->assertSame(6.5, $flexible['due_at_property']['amount']);
        $this->assertSame(220.0, (float) $flexible['cancellation_timeline'][0]['refund_amount']);
        $this->assertSame(170.0, (float) $flexible['cancellation_timeline'][1]['refund_amount']);

        $this->actingAs($user)->postJson(route('stays.cart.store'), [
            'trip_id' => $trip->id, 'search_result_id' => 'lite_lp1897', 'rate_id' => $flexible['id'], 'context' => $this->context(),
        ])->assertOk()->assertJsonPath('count', 1);

        $this->actingAs($user)->postJson(route('stays.checkout.store'), [
            'guests' => [['given_name' => 'Léa', 'family_name' => 'Martin']],
            'contact_email' => 'lea@example.com',
            'contact_phone' => '+33612345678',
            'accept_terms' => true,
        ])->assertOk();

        $order = StayOrder::firstOrFail();
        $this->assertSame('231.00', (string) $order->total_amount);

        app(StayOrderProcessor::class)->handlePaidSession($order, ['id' => 'cs_lite', 'payment_status' => 'paid', 'payment_intent' => 'pi_lite']);

        $booking = StayBooking::firstOrFail();
        $this->assertSame('confirmed', $booking->status);
        $this->assertSame('HTL-42', $booking->reference);
        Http::assertSent(fn (Request $request) => str_contains($request->url(), '/rates/book')
            && $request['prebookId'] === 'pb_123'
            && $request['payment']['method'] === 'ACC_CREDIT_CARD'
            && $request['holder']['lastName'] === 'Martin'
            && $request['clientReference'] === $order->reference . '-' . $booking->id);

        // Annulation : l'hôtel rembourse 170 €, les frais de service ne sont pas remboursés.
        $this->actingAs($user)->post(route('stays.bookings.cancel', [$order->reference, $booking->id]))->assertRedirect();
        $this->assertSame('cancelled', $booking->fresh()->status);
        Http::assertSent(fn (Request $request) => str_contains($request->url(), '/refunds') && $request['amount'] === 17000);
        $this->assertSame('170.00', (string) $order->fresh()->refunded_amount);
    }
}
