<?php

namespace App\Services\Flights\Providers;

use App\Services\Flights\AirportDirectory;
use App\Services\Flights\Contracts\FlightProvider;
use App\Services\Flights\FlightPricing;
use App\Services\Flights\FlightProviderException;
use App\Services\Flights\FlightSearchQuery;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Comparateur Aviasales / Travelpayouts : prix indicatifs issus du cache des
 * recherches récentes. Non réservable ici, le client est redirigé.
 */
class TravelpayoutsProvider implements FlightProvider
{
    public function __construct(private readonly AirportDirectory $airports)
    {
    }

    public function key(): string
    {
        return 'travelpayouts';
    }

    public function label(): string
    {
        return 'Aviasales';
    }

    public function enabled(): bool
    {
        return (bool) config('flights.providers.travelpayouts.enabled');
    }

    public function bookable(): bool
    {
        return false;
    }

    public function search(FlightSearchQuery $query): array
    {
        try {
            $response = Http::acceptJson()->timeout(15)->get(
                rtrim(config('flights.providers.travelpayouts.base_url'), '/') . '/aviasales/v3/prices_for_dates',
                array_filter([
                    'origin' => $query->origin,
                    'destination' => $query->destination,
                    'departure_at' => $query->date,
                    'one_way' => 'true',
                    'direct' => $query->maxStops === 0 ? 'true' : null,
                    'currency' => 'eur',
                    'sorting' => 'price',
                    'limit' => 30,
                    'token' => config('flights.providers.travelpayouts.token'),
                ]),
            );
        } catch (ConnectionException) {
            throw new FlightProviderException('Le comparateur partenaire ne répond pas.');
        }

        if ($response->failed() || !$response->json('success', true)) {
            throw new FlightProviderException('Le comparateur partenaire a refusé la recherche.');
        }

        $currency = strtoupper($response->json('currency', 'eur'));

        return collect($response->json('data', []))
            ->filter(fn ($item) => is_array($item) && isset($item['price'], $item['departure_at']))
            ->map(fn (array $item) => $this->normalize($item, $query, $currency))
            ->values()
            ->all();
    }

    private function normalize(array $item, FlightSearchQuery $query, string $currency): array
    {
        $airlineAmount = round((float) $item['price'] * $query->passengers, 2);
        $pricing = FlightPricing::breakdown($airlineAmount);
        $origin = $this->airports->find($item['origin_airport'] ?? $item['origin'] ?? $query->origin);
        $destination = $this->airports->find($item['destination_airport'] ?? $item['destination'] ?? $query->destination);
        $duration = isset($item['duration_to']) ? (int) $item['duration_to'] : (isset($item['duration']) ? (int) $item['duration'] : null);
        $departure = CarbonImmutable::parse($item['departure_at']);
        $flightNumber = ($item['airline'] ?? '') . ($item['flight_number'] ?? '');
        $marker = config('flights.providers.travelpayouts.marker');
        $link = 'https://www.aviasales.com' . ($item['link'] ?? '') . ($marker ? (str_contains($item['link'] ?? '', '?') ? '&' : '?') . 'marker=' . urlencode($marker) : '');

        return [
            'id' => 'tp_' . md5(json_encode($item)),
            'provider' => $this->key(),
            'provider_label' => $this->label(),
            'bookable' => false,
            'external_url' => $link,
            'airline' => ['name' => $item['airline'] ?? 'Compagnie', 'code' => $item['airline'] ?? null, 'logo' => null],
            'passengers_count' => $query->passengers,
            'currency' => $currency,
            'base_amount' => null,
            'airline_tax_amount' => null,
            ...$pricing,
            'per_passenger_total' => round($pricing['total_amount'] / max(1, $query->passengers), 2),
            'expires_at' => null,
            'cabin' => null,
            'fare_brand' => null,
            'origin' => ['code' => $origin['code'] ?? $query->origin, 'name' => $origin['name'] ?? null, 'city' => $origin['city'] ?? null],
            'destination' => ['code' => $destination['code'] ?? $query->destination, 'name' => $destination['name'] ?? null, 'city' => $destination['city'] ?? null],
            'departure' => $departure->toIso8601String(),
            'arrival' => $duration ? $departure->addMinutes($duration)->toIso8601String() : null,
            'duration_minutes' => $duration,
            'stops' => (int) ($item['transfers'] ?? 0),
            'segments' => [],
            'baggage' => ['carry_on' => null, 'checked' => null],
            'conditions' => ['refundable' => null, 'refund_penalty' => null, 'changeable' => null, 'change_penalty' => null],
            'signature' => $flightNumber . '@' . $departure->format('Y-m-d\TH:i'),
        ];
    }
}
