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

        $listed = $this->osm->search($query);
        $bookable = Cache::get($this->bookableKey($query), []);

        // Un hôtel réservable ici masque sa fiche « annuaire » en double.
        return array_values(array_filter($listed, fn (array $property) => !collect($bookable)->contains(
            fn (array $candidate) => self::sameProperty($candidate, $property),
        )));
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
