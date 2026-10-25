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
        // Modèle partenaires : pas de vente par le site. Seul LiteAPI reste réservable, avec le module
        // de paiement Nuitée intégré à la page (Nuitée encaisse), si LITEAPI_EMBEDDED_CHECKOUT est activé.
        if (!config('commerce.direct_booking')) {
            return LiteApiClient::embeddedCheckout() ? [$this->forKey('liteapi')] : [];
        }

        return array_values(array_filter($this->providers, fn (BookableStayProvider $provider) => $provider->enabled()));
    }

    /** cart : panier + Stripe (vente directe) · embedded : paiement Nuitée dans la page · null : liens partenaires. */
    public function checkoutMode(): ?string
    {
        if (!$this->anyEnabled()) {
            return null;
        }

        return config('commerce.direct_booking') ? 'cart' : 'embedded';
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
