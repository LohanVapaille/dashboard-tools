<?php

namespace App\Services\Flights;

use App\Services\Flights\Contracts\FlightProvider;
use App\Services\Flights\Providers\DuffelProvider;
use App\Services\Flights\Providers\TravelpayoutsProvider;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Interroge tous les fournisseurs actifs et fusionne leurs offres.
 * Un même vol trouvé chez plusieurs fournisseurs n'apparaît qu'une fois :
 * l'offre réservable dans l'application est privilégiée, puis la moins chère.
 */
class FlightSearchService
{
    /** @var FlightProvider[] */
    private array $providers;

    public function __construct(DuffelProvider $duffel, private readonly TravelpayoutsProvider $travelpayouts)
    {
        $this->providers = [$duffel, $travelpayouts];
    }

    public function activeProviders(): array
    {
        return array_values(array_filter($this->providers, fn (FlightProvider $provider) => $provider->enabled()));
    }

    /**
     * @return array{offers: array, providers: array, warnings: array}
     */
    public function search(FlightSearchQuery $query): array
    {
        $providers = $this->activeProviders();
        if (!$providers) {
            throw new FlightProviderException('Aucun fournisseur de vols n’est configuré. Ajoutez DUFFEL_API_KEY dans le fichier .env.');
        }

        $offers = [];
        $warnings = [];
        $succeeded = [];

        foreach ($providers as $provider) {
            try {
                // Cache court : évite de relancer une recherche identique en revenant sur une étape.
                $found = Cache::remember(
                    'flights.search.' . $provider->key() . '.' . md5(serialize($query)) . '.' . FlightPricing::percent(),
                    now()->addMinutes(5),
                    fn () => $provider->search($query),
                );
                $offers = array_merge($offers, $found);
                $succeeded[] = ['key' => $provider->key(), 'label' => $provider->label(), 'bookable' => $provider->bookable(), 'count' => count($found)];
            } catch (FlightProviderException $exception) {
                $warnings[] = $provider->label() . ' : ' . $exception->getMessage();
            } catch (\Throwable $exception) {
                Log::warning('Flight provider failed', ['provider' => $provider->key(), 'exception' => $exception]);
                $warnings[] = $provider->label() . ' est momentanément indisponible.';
            }
        }

        if (!$succeeded) {
            throw new FlightProviderException($warnings[0] ?? 'La recherche de vols a échoué.');
        }

        $aviasales = $this->travelpayouts->enabled();

        return [
            'offers' => $this->merge($offers, $query),
            'providers' => $succeeded,
            'warnings' => $warnings,
            // Meilleurs prix Aviasales du mois et recherche en temps réel chez eux.
            'calendar' => $aviasales ? rescue(fn () => $this->travelpayouts->calendar($query), [], false) : [],
            'aviasales_url' => $aviasales ? $this->travelpayouts->searchUrl($query) : null,
        ];
    }

    private function merge(array $offers, FlightSearchQuery $query): array
    {
        $bySignature = [];
        foreach ($offers as $offer) {
            if ($query->maxStops !== null && $offer['stops'] > $query->maxStops) {
                continue;
            }

            $key = $offer['signature'] ?: $offer['id'];
            $current = $bySignature[$key] ?? null;
            $better = !$current
                || ($offer['bookable'] && !$current['bookable'])
                || ($offer['bookable'] === $current['bookable'] && $offer['total_amount'] < $current['total_amount']);

            if ($better) {
                $bySignature[$key] = $offer;
            }
        }

        $merged = array_values($bySignature);
        usort($merged, fn ($a, $b) => $a['total_amount'] <=> $b['total_amount']);

        return array_slice($merged, 0, 80);
    }
}
