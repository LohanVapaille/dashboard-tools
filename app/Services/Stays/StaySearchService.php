<?php

namespace App\Services\Stays;

use App\Services\Flights\AirportDirectory;
use App\Services\Flights\FlightProviderException;
use App\Services\Stays\Providers\OpenStreetMapStaysProvider;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Deux recherches complémentaires, appelées en parallèle par la page :
 * - offers()   : hébergements réservables ici (rapide) + liens partenaires ;
 * - listings() : annuaire complet OpenStreetMap (peut être lent, mis en cache).
 */
class StaySearchService
{
    public function __construct(
        private readonly StayProviders $providers,
        private readonly OpenStreetMapStaysProvider $osm,
        private readonly LiteApiClient $liteApi,
    ) {
    }

    /**
     * @return array{properties: array, warnings: array, partners: array}
     */
    public function offers(StaySearchQuery $query): array
    {
        $warnings = [];
        $properties = Cache::get($this->bookableKey($query));
        if ($properties === null) {
            $properties = [];
            foreach ($this->providers->enabled() as $provider) {
                try {
                    $properties = array_merge($properties, $provider->search($query));
                } catch (FlightProviderException $exception) {
                    $warnings[] = $exception->getMessage();
                } catch (\Throwable $exception) {
                    Log::warning('Bookable stays search failed', ['provider' => $provider->key(), 'exception' => $exception]);
                    $warnings[] = 'La réservation instantanée est momentanément indisponible.';
                }
            }
            if (!$warnings) {
                Cache::put($this->bookableKey($query), $properties, now()->addMinutes(10));
            }
        }

        return [
            'properties' => $properties,
            'warnings' => $warnings,
            'partners' => PartnerLinks::forArea($query),
        ];
    }

    /** @throws FlightProviderException */
    public function listings(StaySearchQuery $query): array
    {
        if (!$this->osm->enabled()) {
            return [];
        }

        $listed = $this->withDirectoryHotels($this->osm->search($query), $query);
        $bookable = Cache::get($this->bookableKey($query), []);

        // Un hôtel réservable ici masque sa fiche « annuaire » en double.
        return array_values(array_filter($listed, fn (array $property) => !collect($bookable)->contains(
            fn (array $candidate) => self::sameProperty($candidate, $property),
        )));
    }

    /**
     * Photos, notes et étoiles de l'annuaire LiteAPI pour les fiches OpenStreetMap correspondantes,
     * puis les hôtels de l'annuaire absents d'OpenStreetMap (non réservables ici : liens partenaires).
     */
    private function withDirectoryHotels(array $listed, StaySearchQuery $query): array
    {
        $directory = collect($this->liteApi->hotelsNear($query->latitude, $query->longitude, $query->radiusKm))
            ->filter(fn ($hotel) => !empty($hotel['name']) && isset($hotel['latitude'], $hotel['longitude']))
            ->map(fn (array $hotel) => [
                'name' => $hotel['name'],
                'lat' => (float) $hotel['latitude'],
                'lng' => (float) $hotel['longitude'],
                'photo' => $hotel['main_photo'] ?? $hotel['thumbnail'] ?? null,
                'stars' => isset($hotel['stars']) ? (int) round((float) $hotel['stars']) : null,
                'rating' => isset($hotel['rating']) && $hotel['rating'] > 0 ? round((float) $hotel['rating'], 1) : null,
                'reviews_count' => $hotel['reviewCount'] ?? null,
                'address' => $hotel['address'] ?? null,
                'id' => $hotel['id'] ?? null,
            ])
            ->values();

        if ($directory->isEmpty()) {
            return $listed;
        }

        $matched = [];
        $listed = array_map(function (array $property) use ($directory, &$matched) {
            $index = $directory->search(fn (array $hotel) => self::sameProperty($hotel, $property));
            if ($index === false) {
                return $property;
            }
            $matched[$index] = true;
            $hotel = $directory[$index];

            return [
                ...$property,
                'photos' => $property['photos'] ?: array_values(array_filter([$hotel['photo']])),
                'stars' => $property['stars'] ?: $hotel['stars'],
                'rating' => $property['rating'] ?? $hotel['rating'],
                'reviews_count' => $property['reviews_count'] ?? $hotel['reviews_count'],
                // Identifiant de l'annuaire LiteAPI : galerie complète de photos à l'ouverture de la fiche.
                'directory_id' => $hotel['id'],
            ];
        }, $listed);

        $extra = $directory
            ->reject(fn ($hotel, $index) => isset($matched[$index]))
            ->map(function (array $hotel) use ($query) {
                $distance = round(AirportDirectory::distanceKm($query->latitude, $query->longitude, $hotel['lat'], $hotel['lng']), 1);
                $city = $query->placeName ?: '';

                return $distance > $query->radiusKm ? null : [
                    'id' => 'lpd_' . $hotel['id'],
                    'directory_id' => $hotel['id'],
                    'provider' => 'directory',
                    'bookable' => false,
                    'name' => $hotel['name'],
                    'type' => 'hotel',
                    'stars' => $hotel['stars'] ?: null,
                    'rating' => $hotel['rating'],
                    'reviews_count' => $hotel['reviews_count'],
                    'photos' => array_values(array_filter([$hotel['photo']])),
                    'description' => null,
                    'address' => $hotel['address'],
                    'city' => $city,
                    'lat' => $hotel['lat'],
                    'lng' => $hotel['lng'],
                    'distance_km' => $distance,
                    'amenities' => [],
                    'rooms_count' => null,
                    'check_in' => null,
                    'check_out' => null,
                    'phone' => null,
                    'website' => null,
                    'brand' => null,
                    'price' => null,
                    'free_cancellation' => null,
                    'links' => PartnerLinks::forProperty($hotel['name'], $city, $hotel['lat'], $hotel['lng'], $query),
                    'check_in_date' => $query->checkIn,
                    'check_out_date' => $query->checkOut,
                ];
            })
            ->filter()
            ->values()
            ->all();

        return [...$listed, ...$extra];
    }

    private function bookableKey(StaySearchQuery $query): string
    {
        return 'stays.bookable.' . $query->cacheKey() . '.' . StayPricing::percent();
    }

    private static function sameProperty(array $a, array $b): bool
    {
        $nameA = Str::slug($a['name']);
        $nameB = Str::slug($b['name']);

        return AirportDirectory::distanceKm($a['lat'], $a['lng'], $b['lat'], $b['lng']) < 0.3
            && ($nameA === $nameB || str_contains($nameA, $nameB) || str_contains($nameB, $nameA));
    }
}
