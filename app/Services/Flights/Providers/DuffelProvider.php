<?php

namespace App\Services\Flights\Providers;

use App\Services\Flights\Contracts\FlightProvider;
use App\Services\Flights\DuffelClient;
use App\Services\Flights\FlightPricing;
use App\Services\Flights\FlightSearchQuery;

class DuffelProvider implements FlightProvider
{
    public function __construct(private readonly DuffelClient $client)
    {
    }

    public function key(): string
    {
        return 'duffel';
    }

    public function label(): string
    {
        return 'Duffel';
    }

    public function enabled(): bool
    {
        return config('flights.providers.duffel.enabled') && $this->client->configured()
            && (config('commerce.direct_booking') || config('flights.providers.duffel.partner_search'));
    }

    public function bookable(): bool
    {
        // Modèle partenaires : les offres servent de comparaison, l'achat se fait chez Aviasales.
        return (bool) config('commerce.direct_booking');
    }

    public function search(FlightSearchQuery $query): array
    {
        $offers = $this->client->searchOffers(
            [[
                'origin' => $query->origin,
                'destination' => $query->destination,
                'departure_date' => $query->date,
            ]],
            $query->passengers,
            $query->cabin,
            $query->maxStops,
        );

        return array_values(array_filter(array_map(fn (array $offer) => $this->normalize($offer), $offers)));
    }

    /**
     * Recharge une offre pour obtenir son prix à jour juste avant l'achat.
     *
     * @return array{0: ?array, 1: array} [offre normalisée, offre brute Duffel]
     */
    public function refresh(string $offerId, bool $withServices = false): array
    {
        $raw = $this->client->getOffer($offerId, $withServices);

        return [$this->normalize($raw), $raw];
    }

    /**
     * Bagages payants proposés par la compagnie, par passager.
     * Les prix renvoyés incluent déjà les taxes et frais de l'application.
     */
    public static function baggageOptions(array $rawOffer): array
    {
        $passengerIds = self::passengerIds($rawOffer);
        $segments = collect($rawOffer['slices'][0]['segments'] ?? [])->keyBy('id');

        return collect($rawOffer['available_services'] ?? [])
            ->where('type', 'baggage')
            ->map(function (array $service) use ($passengerIds, $segments) {
                $amount = (float) $service['total_amount'];
                $covered = collect($service['segment_ids'] ?? []);

                return [
                    'id' => $service['id'],
                    'kind' => $service['metadata']['type'] ?? 'checked',
                    'max_weight_kg' => $service['metadata']['maximum_weight_kg'] ?? null,
                    'max_quantity' => (int) ($service['maximum_quantity'] ?? 1),
                    'passenger_index' => array_search($service['passenger_ids'][0] ?? null, $passengerIds, true),
                    'whole_journey' => $covered->count() >= $segments->count(),
                    'segments' => $covered->map(fn ($id) => trim(($segments[$id]['origin']['iata_code'] ?? '') . '→' . ($segments[$id]['destination']['iata_code'] ?? ''), '→'))->filter()->values(),
                    'currency' => strtoupper($service['total_currency']),
                    'airline_amount' => $amount,
                    'total_amount' => FlightPricing::total($amount),
                ];
            })
            ->filter(fn (array $option) => $option['passenger_index'] !== false)
            ->sortBy([['passenger_index', 'asc'], ['total_amount', 'asc']])
            ->values()
            ->all();
    }

    /**
     * Vérifie les bagages choisis contre l'offre à jour.
     *
     * @return array{0: array, 1: float} [services retenus, montant compagnie des bagages]
     */
    public static function resolveServices(array $rawOffer, array $selected): array
    {
        $options = collect(self::baggageOptions($rawOffer))->keyBy('id');
        $services = [];
        $amount = 0.0;

        foreach ($selected as $choice) {
            $option = $options->get($choice['id'] ?? null);
            $quantity = (int) ($choice['quantity'] ?? 0);
            if (!$option || $quantity < 1 || $quantity > $option['max_quantity']) {
                throw new \App\Services\Flights\FlightProviderException('Un bagage choisi n’est plus proposé par la compagnie. Vérifiez vos bagages.');
            }
            $services[] = [
                'id' => $option['id'],
                'quantity' => $quantity,
                'kind' => $option['kind'],
                'max_weight_kg' => $option['max_weight_kg'],
                'passenger_index' => $option['passenger_index'],
                'airline_amount' => round($option['airline_amount'] * $quantity, 2),
            ];
            $amount += $option['airline_amount'] * $quantity;
        }

        return [$services, round($amount, 2)];
    }

    public function normalize(array $offer): ?array
    {
        $slice = $offer['slices'][0] ?? null;
        $segments = $slice['segments'] ?? [];
        if (!$slice || !$segments || !isset($offer['total_amount'], $offer['total_currency'])) {
            return null;
        }

        $first = $segments[0];
        $last = $segments[count($segments) - 1];
        $airlineAmount = (float) $offer['total_amount'];
        $passengersCount = max(1, count($offer['passengers'] ?? []));
        $pricing = FlightPricing::breakdown($airlineAmount);
        $baggages = collect($first['passengers'][0]['baggages'] ?? []);
        $refund = $offer['conditions']['refund_before_departure'] ?? null;
        $change = $offer['conditions']['change_before_departure'] ?? null;

        return [
            'id' => $offer['id'],
            'provider' => $this->key(),
            'provider_label' => $this->label(),
            'bookable' => $this->bookable(),
            'external_url' => $this->bookable() ? null : self::partnerUrl($slice, $first, $passengersCount),
            'partner_label' => $this->bookable() ? null : 'Aviasales',
            'airline' => [
                'name' => $offer['owner']['name'] ?? 'Compagnie aérienne',
                'code' => $offer['owner']['iata_code'] ?? null,
                'logo' => $offer['owner']['logo_symbol_url'] ?? null,
            ],
            'passengers_count' => $passengersCount,
            'currency' => strtoupper($offer['total_currency']),
            'base_amount' => isset($offer['base_amount']) ? (float) $offer['base_amount'] : null,
            'airline_tax_amount' => isset($offer['tax_amount']) ? (float) $offer['tax_amount'] : null,
            ...$pricing,
            'per_passenger_total' => round($pricing['total_amount'] / $passengersCount, 2),
            'expires_at' => $offer['expires_at'] ?? null,
            'cabin' => $first['passengers'][0]['cabin_class_marketing_name'] ?? null,
            'fare_brand' => $slice['fare_brand_name'] ?? null,
            'origin' => $this->place($slice['origin'] ?? $first['origin'] ?? []),
            'destination' => $this->place($slice['destination'] ?? $last['destination'] ?? []),
            'departure' => $first['departing_at'] ?? null,
            'arrival' => $last['arriving_at'] ?? null,
            'duration_minutes' => self::minutes($slice['duration'] ?? null),
            'stops' => count($segments) - 1,
            'segments' => array_map(fn (array $segment) => [
                'flight_number' => trim(($segment['marketing_carrier']['iata_code'] ?? '') . ' ' . ($segment['marketing_carrier_flight_number'] ?? '')),
                'carrier' => $segment['marketing_carrier']['name'] ?? null,
                'operated_by' => ($segment['operating_carrier']['name'] ?? null) !== ($segment['marketing_carrier']['name'] ?? null)
                    ? ($segment['operating_carrier']['name'] ?? null)
                    : null,
                'aircraft' => $segment['aircraft']['name'] ?? null,
                'origin' => $this->place($segment['origin'] ?? []),
                'destination' => $this->place($segment['destination'] ?? []),
                'departure' => $segment['departing_at'] ?? null,
                'arrival' => $segment['arriving_at'] ?? null,
                'duration_minutes' => self::minutes($segment['duration'] ?? null),
            ], $segments),
            'baggage' => [
                'carry_on' => (int) $baggages->where('type', 'carry_on')->sum('quantity'),
                'checked' => (int) $baggages->where('type', 'checked')->sum('quantity'),
            ],
            'conditions' => [
                'refundable' => $refund ? (bool) ($refund['allowed'] ?? false) : null,
                'refund_penalty' => isset($refund['penalty_amount']) ? (float) $refund['penalty_amount'] : null,
                'changeable' => $change ? (bool) ($change['allowed'] ?? false) : null,
                'change_penalty' => isset($change['penalty_amount']) ? (float) $change['penalty_amount'] : null,
            ],
            // Premier vol + heure de départ : sert à repérer le même vol chez plusieurs fournisseurs.
            'signature' => ($first['marketing_carrier']['iata_code'] ?? '') . ($first['marketing_carrier_flight_number'] ?? '') . '@' . substr($first['departing_at'] ?? '', 0, 16),
        ];
    }

    /** Identifiants passagers propres à l'offre, exigés par Duffel à la commande. */
    public static function passengerIds(array $rawOffer): array
    {
        return array_column($rawOffer['passengers'] ?? [], 'id');
    }

    public static function minutes(?string $duration): ?int
    {
        if (!$duration || !preg_match('/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/', $duration, $m)) {
            return null;
        }

        return ((int) ($m[1] ?? 0)) * 1440 + ((int) ($m[2] ?? 0)) * 60 + (int) ($m[3] ?? 0);
    }

    private function place(array $place): array
    {
        return [
            'code' => $place['iata_code'] ?? null,
            'name' => $place['name'] ?? null,
            'city' => $place['city_name'] ?? ($place['city']['name'] ?? null),
        ];
    }

    /** Recherche Aviasales préremplie (trajet, date, voyageurs) avec l'identifiant d'affiliation. */
    public static function partnerUrl(array $slice, array $firstSegment, int $passengers): ?string
    {
        $origin = $slice['origin']['iata_code'] ?? $firstSegment['origin']['iata_code'] ?? null;
        $destination = $slice['destination']['iata_code'] ?? null;
        $date = $firstSegment['departing_at'] ?? null;
        if (!$origin || !$destination || !$date) {
            return null;
        }

        $marker = config('flights.providers.travelpayouts.marker');

        return 'https://www.aviasales.com/search/' . strtoupper($origin) . date('dm', strtotime($date)) . strtoupper($destination) . max(1, min(9, $passengers))
            . ($marker ? '?marker=' . rawurlencode((string) $marker) : '');
    }
}
