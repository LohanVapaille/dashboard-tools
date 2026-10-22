<?php

namespace App\Services\Stays\Providers;

use App\Services\Flights\AirportDirectory;
use App\Services\Flights\FlightProviderException;
use App\Services\Stays\PartnerLinks;
use App\Services\Stays\StaySearchQuery;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Tous les hébergements référencés dans OpenStreetMap autour d'un point
 * (hôtels, auberges, chambres d'hôtes, appartements, chalets, campings…).
 * Données ouvertes (ODbL) sans prix : réservation chez les partenaires.
 */
class OpenStreetMapStaysProvider
{
    public const TYPES = [
        'hotel' => 'Hôtel',
        'apartment' => 'Appartement',
        'guest_house' => 'Chambre d’hôtes',
        'hostel' => 'Auberge de jeunesse',
        'motel' => 'Motel',
        'chalet' => 'Chalet / gîte',
        'camp_site' => 'Camping',
        'alpine_hut' => 'Refuge',
        'caravan_site' => 'Aire de camping-car',
    ];

    public function enabled(): bool
    {
        return (bool) config('stays.providers.openstreetmap.enabled');
    }

    public function search(StaySearchQuery $query): array
    {
        $radius = min(25, max(1, $query->radiusKm)) * 1000;

        // Les données OSM changent peu : cache d'une journée par zone.
        $key = sprintf('stays.osm.v2.%.3f.%.3f.%d', $query->latitude, $query->longitude, $radius);
        $elements = Cache::get($key);
        if ($elements === null) {
            @set_time_limit(120);
            $elements = $this->fromGeoapify($query, $radius)
                ?? $this->fromOverpass($query, $radius)
                ?? $this->fromNominatim($query, $radius)
                ?? throw new FlightProviderException('La liste complète des hébergements est momentanément indisponible. Les liens partenaires restent disponibles.');
            Cache::put($key, $elements, now()->addDay());
        }

        return collect($elements)
            ->map(fn (array $element) => $this->normalize($element, $query))
            ->filter()
            ->unique(fn ($property) => Str::lower($property['name']) . '|' . round($property['lat'], 3))
            ->sortBy('distance_km')
            ->values()
            ->all();
    }

    /**
     * 1. Geoapify Places (données OSM, rapide et fiable, clé gratuite) — recommandé en production.
     * Les étiquettes OSM d'origine sont dans datasource.raw : même normalisation que les autres sources.
     */
    private function fromGeoapify(StaySearchQuery $query, int $radius): ?array
    {
        $key = config('stays.providers.openstreetmap.geoapify_key');
        if (!$key) {
            return null;
        }

        try {
            $response = Http::acceptJson()->timeout(20)->get('https://api.geoapify.com/v2/places', [
                'categories' => 'accommodation,camping.camp_site,camping.caravan_site',
                'filter' => sprintf('circle:%F,%F,%d', $query->longitude, $query->latitude, $radius),
                'bias' => sprintf('proximity:%F,%F', $query->longitude, $query->latitude),
                'limit' => (int) config('stays.providers.openstreetmap.max_results', 400),
                'apiKey' => $key,
            ]);
        } catch (ConnectionException) {
            return null;
        }

        if ($response->failed()) {
            return null;
        }

        return collect($response->json('features', []))->map(function (array $feature) {
            $props = $feature['properties'] ?? [];
            $raw = $props['datasource']['raw'] ?? [];

            return [
                'type' => $raw['osm_type'] ?? 'n',
                'id' => $raw['osm_id'] ?? ($props['place_id'] ?? md5(json_encode($props))),
                'lat' => $props['lat'] ?? null,
                'lon' => $props['lon'] ?? null,
                'tags' => array_filter([
                    'name' => $props['name'] ?? null,
                    'tourism' => $raw['tourism'] ?? null,
                    'addr:street' => $props['street'] ?? null,
                    'addr:housenumber' => $props['housenumber'] ?? null,
                    'addr:postcode' => $props['postcode'] ?? null,
                    'addr:city' => $props['city'] ?? null,
                ]) + $raw,
            ];
        })->all();
    }

    /** 2. Overpass (gratuit mais régulièrement saturé) : délais courts, serveurs essayés dans l'ordre. */
    private function fromOverpass(StaySearchQuery $query, int $radius): ?array
    {
        $around = sprintf('(around:%d,%F,%F)', $radius, $query->latitude, $query->longitude);
        // Union de tags exacts : bien plus rapide pour Overpass qu'une expression régulière.
        $union = collect(array_keys(self::TYPES))->map(fn ($type) => "nwr[tourism={$type}][name]{$around};")->implode('');
        $overpass = "[out:json][timeout:20];({$union});out center tags " . (int) config('stays.providers.openstreetmap.max_results', 400) . ';';
        $servers = array_slice(array_filter(array_map('trim', explode(',', (string) config('stays.providers.openstreetmap.overpass_url')))), 0, 1);

        foreach ($servers as $server) {
            try {
                $response = Http::asForm()
                    ->withHeaders(['User-Agent' => $this->userAgent()])
                    ->connectTimeout(5)
                    ->timeout(22)
                    ->post($server, ['data' => $overpass]);
            } catch (ConnectionException) {
                continue;
            }

            if ($response->successful() && is_array($response->json('elements'))) {
                return $response->json('elements');
            }
        }

        return null;
    }

    /** 3. Nominatim : une requête par type (40 résultats max chacune), une par seconde. */
    private function fromNominatim(StaySearchQuery $query, int $radius): ?array
    {
        $dLat = $radius / 111_000;
        $dLng = $radius / (111_000 * max(0.2, cos(deg2rad($query->latitude))));
        $viewbox = implode(',', [$query->longitude - $dLng, $query->latitude + $dLat, $query->longitude + $dLng, $query->latitude - $dLat]);
        $elements = [];

        foreach (['hotel' => 'hotel', 'hostel' => 'hostel', 'guest house' => 'guest_house', 'apartment' => 'apartment', 'motel' => 'motel', 'camp site' => 'camp_site'] as $term => $type) {
            try {
                $response = Http::withHeaders(['User-Agent' => $this->userAgent()])->timeout(10)->get('https://nominatim.openstreetmap.org/search', [
                    'q' => $term,
                    'format' => 'jsonv2',
                    'extratags' => 1,
                    'addressdetails' => 1,
                    'limit' => 40,
                    'bounded' => 1,
                    'viewbox' => $viewbox,
                ]);
            } catch (ConnectionException) {
                continue;
            }

            foreach ($response->successful() ? $response->json() : [] as $place) {
                if (($place['category'] ?? null) !== 'tourism' || ($place['type'] ?? null) !== $type || empty($place['name'])) {
                    continue;
                }
                $address = $place['address'] ?? [];
                $elements[] = [
                    'type' => $place['osm_type'] ?? 'node',
                    'id' => $place['osm_id'] ?? $place['place_id'],
                    'lat' => (float) $place['lat'],
                    'lon' => (float) $place['lon'],
                    'tags' => array_filter([
                        'name' => $place['name'],
                        'tourism' => $type,
                        'addr:street' => $address['road'] ?? null,
                        'addr:housenumber' => $address['house_number'] ?? null,
                        'addr:postcode' => $address['postcode'] ?? null,
                        'addr:city' => $address['city'] ?? $address['town'] ?? $address['village'] ?? null,
                    ]) + ($place['extratags'] ?? []),
                ];
            }
            usleep(1_050_000); // politique d'usage Nominatim : 1 requête par seconde
        }

        return $elements ?: null;
    }

    private function userAgent(): string
    {
        return config('app.name', 'TravelPlanner') . '/1.0 (' . config('app.url') . ')';
    }

    private function normalize(array $element, StaySearchQuery $query): ?array
    {
        $tags = $element['tags'] ?? [];
        $lat = $element['lat'] ?? $element['center']['lat'] ?? null;
        $lng = $element['lon'] ?? $element['center']['lon'] ?? null;
        if (empty($tags['name']) || $lat === null || $lng === null) {
            return null;
        }

        $type = $tags['tourism'] ?? 'hotel';
        $city = $tags['addr:city'] ?? $query->placeName;
        $website = $tags['website'] ?? $tags['contact:website'] ?? $tags['url'] ?? null;
        $stars = isset($tags['stars']) && is_numeric(substr($tags['stars'], 0, 1)) ? (int) substr($tags['stars'], 0, 1) : null;

        return [
            'id' => 'osm_' . $element['type'] . '_' . $element['id'],
            'provider' => 'openstreetmap',
            'bookable' => false,
            'name' => $tags['name'],
            'type' => $type,
            'stars' => $stars ?: null,
            'rating' => null,
            'reviews_count' => null,
            'photos' => array_values(array_filter([$this->photo($tags)])),
            'description' => $tags['description'] ?? null,
            'address' => trim(implode(', ', array_filter([
                trim(($tags['addr:housenumber'] ?? '') . ' ' . ($tags['addr:street'] ?? '')),
                $tags['addr:postcode'] ?? null,
                $tags['addr:city'] ?? null,
            ]))),
            'city' => $city,
            'lat' => (float) $lat,
            'lng' => (float) $lng,
            'distance_km' => round(AirportDirectory::distanceKm($query->latitude, $query->longitude, (float) $lat, (float) $lng), 1),
            'amenities' => $this->amenities($tags, $type),
            'rooms_count' => isset($tags['rooms']) && is_numeric($tags['rooms']) ? (int) $tags['rooms'] : null,
            'check_in' => $tags['check_in'] ?? null,
            'check_out' => $tags['check_out'] ?? null,
            'phone' => $tags['phone'] ?? $tags['contact:phone'] ?? null,
            'website' => $website,
            'brand' => $tags['brand'] ?? $tags['operator'] ?? null,
            'price' => null,
            'free_cancellation' => null,
            'links' => PartnerLinks::forProperty($tags['name'], (string) $city, (float) $lat, (float) $lng, $query, $website),
            'check_in_date' => $query->checkIn,
            'check_out_date' => $query->checkOut,
        ];
    }

    private function amenities(array $tags, string $type): array
    {
        $yes = fn (?string $value) => $value !== null && !in_array(strtolower($value), ['no', 'none', 'false'], true);

        return array_keys(array_filter([
            'wifi' => $yes($tags['internet_access'] ?? null) && ($tags['internet_access'] ?? '') !== 'terminal',
            'parking' => $yes($tags['parking'] ?? null),
            'pool' => $yes($tags['swimming_pool'] ?? null) || $yes($tags['leisure:swimming_pool'] ?? null),
            'breakfast' => $yes($tags['breakfast'] ?? null),
            'air_conditioning' => $yes($tags['air_conditioning'] ?? null),
            'kitchen' => $yes($tags['kitchen'] ?? null) || in_array($type, ['apartment', 'chalet'], true),
            'pets' => $yes($tags['pets'] ?? $tags['dog'] ?? null),
            'accessible' => ($tags['wheelchair'] ?? null) === 'yes',
            'restaurant' => $yes($tags['restaurant'] ?? null),
            'bar' => $yes($tags['bar'] ?? null),
            'spa' => $yes($tags['spa'] ?? $tags['sauna'] ?? null),
            'gym' => $yes($tags['fitness_centre'] ?? $tags['gym'] ?? null),
            'reception_24h' => ($tags['reception'] ?? null) === '24/7' || ($tags['opening_hours'] ?? null) === '24/7',
        ]));
    }

    private function photo(array $tags): ?string
    {
        $image = $tags['image'] ?? null;
        if ($image && preg_match('#^https://#', $image) && preg_match('#\.(jpe?g|png|webp)$#i', $image)) {
            return $image;
        }
        $commons = $tags['wikimedia_commons'] ?? null;
        if ($commons && str_starts_with($commons, 'File:')) {
            return 'https://commons.wikimedia.org/wiki/Special:FilePath/' . rawurlencode(substr($commons, 5)) . '?width=800';
        }

        return null;
    }
}
