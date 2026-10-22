<?php

namespace App\Services\Stays;

use App\Services\Flights\FlightProviderException;
use App\Services\Stays\Contracts\BookableStayProvider;
use App\Services\Stays\Providers\DuffelStaysProvider;
use App\Services\Stays\Providers\LiteApiStaysProvider;

/** Fournisseurs d'hébergements réservables : retrouve celui d'un hébergement ou d'une réservation. */
class StayProviders
{
    /** @var BookableStayProvider[] */
    private array $providers;

    public function __construct(LiteApiStaysProvider $liteapi, DuffelStaysProvider $duffel)
    {
        $this->providers = [$liteapi, $duffel];
    }

    /** @return BookableStayProvider[] */
    public function enabled(): array
    {
        return array_values(array_filter($this->providers, fn (BookableStayProvider $provider) => $provider->enabled()));
    }

    public function anyEnabled(): bool
    {
        return (bool) $this->enabled();
    }

    public function forProperty(string $propertyId): BookableStayProvider
    {
        foreach ($this->providers as $provider) {
            if ($provider->owns($propertyId)) {
                return $provider;
            }
        }

        throw new FlightProviderException('Cet hébergement ne peut pas être réservé ici.');
    }

    public function forKey(string $key): BookableStayProvider
    {
        foreach ($this->providers as $provider) {
            if ($provider->key() === $key) {
                return $provider;
            }
        }

        throw new FlightProviderException('Fournisseur d’hébergement inconnu.');
    }
}
