<?php

namespace App\Services\Flights\Providers;

use App\Services\Flights\AirportDirectory;
use App\Services\Flights\Contracts\FlightProvider;
use App\Services\Flights\FlightPricing;
use App\Services\Flights\FlightProviderException;
use App\Services\Flights\FlightSearchQuery;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Prix Aviasales (API de données Travelpayouts) : meilleurs prix constatés récemment par les
 * voyageurs d'Aviasales, jour par jour. Non réservable ici : achat sur Aviasales (lien affilié).
 * Le prix exact en temps réel n'est connu que sur Aviasales.
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

    /** Vols du jour demandé, au prix constaté sur Aviasales. */
    public function search(FlightSearchQuery $query): array
    {
        return collect($this->month($query))
            ->filter(fn (array $item) => substr($item['departure_at'], 0, 10) === $query->date)
            ->map(fn (array $item) => $this->normalize($item, $query))
            ->values()
            ->all();
    }

    /** Meilleur prix par jour du mois (par personne), pour choisir une date moins chère. */
    public function calendar(FlightSearchQuery $query): array
    {
        return collect($this->month($query))
            ->groupBy(fn (array $item) => substr($item['departure_at'], 0, 10))
            ->map(fn ($items, $date) => [
                'date' => $date,
                'price' => (float) $items->min('price'),
                'currency' => 'EUR',
                'direct' => $items->contains(fn ($item) => (int) ($item['transfers'] ?? 0) === 0),
            ])
            ->filter(fn ($day) => $day['date'] >= now()->toDateString())
            ->sortKeys()
            ->values()
            ->all();
    }

    /** Estimation pour le budget : prix par personne ce jour-là, à défaut le meilleur prix du mois. */
    public function estimate(FlightSearchQuery $query): ?array
    {
        $items = collect($this->month($query));
        if ($items->isEmpty()) {
            return null;
        }
        $sameDay = $items->filter(fn (array $item) => substr($item['departure_at'], 0, 10) === $query->date);

        return [
            'price' => (float) ($sameDay->isNotEmpty() ? $sameDay : $items)->min('price'),
            'exact_date' => $sameDay->isNotEmpty(),
        ];
    }

    /** Recherche complète du jour sur Aviasales (prix en temps réel), avec l'identifiant partenaire. */
    public function searchUrl(FlightSearchQuery $query): string
    {
        $date = CarbonImmutable::parse($query->date);
        $marker = config('flights.providers.travelpayouts.marker');

        return 'https://www.aviasales.com/search/' . $query->origin . $date->format('dm') . $query->destination . $query->passengers
            . ($marker ? '?marker=' . urlencode($marker) : '');
    }

    /** Données du mois pour la ligne, mises en cache 30 min (elles évoluent peu). */
    private function month(FlightSearchQuery $query): array
    {
        $month = substr($query->date, 0, 7);
        $key = "flights.aviasales.{$query->origin}.{$query->destination}.{$month}." . ($query->maxStops === 0 ? 'direct' : 'all');

        return Cache::remember($key, now()->addMinutes(30), function () use ($query, $month) {
            try {
                $response = Http::acceptJson()->timeout(15)->get(
                    rtrim(config('flights.providers.travelpayouts.base_url'), '/') . '/aviasales/v3/prices_for_dates',
                    array_filter([
                        'origin' => $query->origin,
                        'destination' => $query->destination,
                        'departure_at' => $month,
                        'one_way' => 'true',
                        'direct' => $query->maxStops === 0 ? 'true' : null,
                        'currency' => 'eur',
                        'sorting' => 'price',
                        'limit' => 1000,
                        'token' => config('flights.providers.travelpayouts.token'),
                    ]),
                );
            } catch (ConnectionException) {
                throw new FlightProviderException('Aviasales ne répond pas. Réessayez dans un instant.');
            }

            if ($response->failed() || !$response->json('success', true)) {
                throw new FlightProviderException('Aviasales a refusé la recherche.');
            }

            return collect($response->json('data', []))
                ->filter(fn ($item) => is_array($item) && isset($item['price'], $item['departure_at']))
                ->values()
                ->all();
        });
    }

    /** Noms des compagnies (codes IATA → nom), fournis par Travelpayouts, mis en cache une semaine. */
    private function airlineName(?string $code): string
    {
        $names = Cache::remember('flights.aviasales.airlines', now()->addWeek(), fn () => rescue(
            fn () => Http::timeout(15)->get('https://api.travelpayouts.com/data/fr/airlines.json')->collect()
                ->mapWithKeys(fn ($airline) => [$airline['code'] => $airline['name'] ?: ($airline['name_translations']['en'] ?? $airline['code'])])
                ->all(),
            [],
            false,
        ));

        return $names[$code] ?? ($code ?: 'Compagnie');
    }

    private function normalize(array $item, FlightSearchQuery $query): array
    {
        $airlineAmount = round((float) $item['price'] * $query->passengers, 2);
        $pricing = FlightPricing::breakdown($airlineAmount);
        $origin = $this->airports->find($item['origin_airport'] ?? $item['origin'] ?? $query->origin);
        $destination = $this->airports->find($item['destination_airport'] ?? $item['destination'] ?? $query->destination);
        $duration = isset($item['duration_to']) ? (int) $item['duration_to'] : (isset($item['duration']) ? (int) $item['duration'] : null);
        $departure = CarbonImmutable::parse($item['departure_at']);
        $code = $item['airline'] ?? null;
        $flightNumber = $code . ($item['flight_number'] ?? '');
        $marker = config('flights.providers.travelpayouts.marker');
        $link = 'https://www.aviasales.com' . ($item['link'] ?? '') . ($marker ? (str_contains($item['link'] ?? '', '?') ? '&' : '?') . 'marker=' . urlencode($marker) : '');

        return [
            'id' => 'tp_' . md5(json_encode($item)),
            'provider' => $this->key(),
            'provider_label' => $this->label(),
            'partner_label' => 'Aviasales',
            'price_source' => 'aviasales',
            'bookable' => false,
            'external_url' => $link,
            'airline' => ['name' => $this->airlineName($code), 'code' => $code, 'logo' => $code ? "https://pics.avs.io/120/120/{$code}.png" : null],
            'flight_number' => $flightNumber ?: null,
            'passengers_count' => $query->passengers,
            'currency' => 'EUR',
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
