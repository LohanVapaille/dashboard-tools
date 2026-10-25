<?php

namespace Tests\Feature;

use App\Services\Flights\FlightSearchQuery;
use App\Services\Flights\FlightSearchService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AviasalesPricesTest extends TestCase
{
    public function test_partner_mode_shows_aviasales_prices_and_calendar_without_duffel(): void
    {
        config([
            'commerce.direct_booking' => false,
            'services.duffel.api_key' => 'duffel_test_x',
            'flights.providers.duffel.enabled' => true,
            'flights.providers.travelpayouts.enabled' => true,
            'flights.providers.travelpayouts.token' => 'tp',
            'flights.providers.travelpayouts.marker' => '793581',
        ]);
        $date = now()->addMonth()->startOfMonth()->addDays(9)->toDateString();
        $other = now()->addMonth()->startOfMonth()->addDays(12)->toDateString();

        Http::fake([
            'api.travelpayouts.com/aviasales/*' => Http::response(['success' => true, 'currency' => 'eur', 'data' => [
                ['origin_airport' => 'MRS', 'destination_airport' => 'ORY', 'airline' => 'TO', 'flight_number' => '7085', 'departure_at' => "{$date}T14:55:00+01:00", 'price' => 79, 'duration_to' => 80, 'transfers' => 0, 'link' => '/search/MRS1012ORY1?t=abc'],
                ['origin_airport' => 'MRS', 'destination_airport' => 'ORY', 'airline' => 'AF', 'flight_number' => '7661', 'departure_at' => "{$other}T08:00:00+01:00", 'price' => 58, 'duration_to' => 80, 'transfers' => 0, 'link' => '/search/x'],
            ]]),
            'api.travelpayouts.com/data/fr/airlines.json' => Http::response([['code' => 'TO', 'name' => null, 'name_translations' => ['en' => 'Transavia France']]]),
        ]);

        $result = app(FlightSearchService::class)->search(new FlightSearchQuery('MRS', 'ORY', $date, 2));

        $this->assertSame(['Aviasales'], array_column($result['providers'], 'label'));
        $this->assertCount(1, $result['offers']);
        $this->assertSame('Transavia France', $result['offers'][0]['airline']['name']);
        $this->assertSame(158.0, (float) $result['offers'][0]['total_amount']);
        $this->assertStringContainsString('marker=793581', $result['offers'][0]['external_url']);
        $this->assertSame([[$date, 79.0], [$other, 58.0]], array_map(fn ($day) => [$day['date'], $day['price']], $result['calendar']));
        $this->assertStringContainsString('/search/MRS' . substr($date, 8, 2) . substr($date, 5, 2) . 'ORY2?marker=793581', $result['aviasales_url']);
        Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'duffel'));
    }
}
