<?php

namespace App\Services\Flights;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class DuffelClient
{
    public function configured(): bool
    {
        return (bool) config('services.duffel.api_key');
    }

    /** Clé de test Duffel : commandes réelles dans le bac à sable, sans débit. */
    public function testMode(): bool
    {
        return str_starts_with((string) config('services.duffel.api_key'), 'duffel_test_');
    }

    /** Les commandes Duffel sont-elles réellement émises après paiement ? */
    public function bookingEnabled(): bool
    {
        return $this->configured() && ($this->testMode() || filter_var(config('services.duffel.booking_enabled'), FILTER_VALIDATE_BOOLEAN));
    }

    public function searchOffers(array $slices, int $passengers, string $cabin, ?int $maxConnections): array
    {
        $body = [
            'slices' => $slices,
            'passengers' => array_fill(0, $passengers, ['type' => 'adult']),
            'cabin_class' => $cabin,
        ];
        if ($maxConnections !== null) {
            $body['max_connections'] = $maxConnections;
        }

        $response = $this->send(fn (PendingRequest $http) => $http->timeout(45)->post(
            $this->url('/air/offer_requests?return_offers=true&supplier_timeout=20000'),
            ['data' => $body],
        ));

        return $response->json('data.offers', []);
    }

    public function getOffer(string $offerId, bool $withServices = false): array
    {
        $response = $this->send(
            fn (PendingRequest $http) => $http->get(
                $this->url('/air/offers/' . rawurlencode($offerId)),
                $withServices ? ['return_available_services' => 'true'] : [],
            ),
            'Cette offre a expiré ou n’est plus disponible. Relancez la recherche.',
        );

        return $response->json('data', []);
    }

    public function createOrder(string $offerId, array $passengers, string $amount, string $currency, array $services = []): array
    {
        $response = $this->send(fn (PendingRequest $http) => $http->timeout(60)->post($this->url('/air/orders'), [
            'data' => [
                'type' => 'instant',
                'selected_offers' => [$offerId],
                'passengers' => $passengers,
                ...($services ? ['services' => $services] : []),
                'payments' => [[
                    'type' => 'balance',
                    'amount' => $amount,
                    'currency' => $currency,
                ]],
            ],
        ]));

        return $response->json('data', []);
    }

    public function cancellationQuote(string $orderId): array
    {
        $response = $this->send(fn (PendingRequest $http) => $http->post(
            $this->url('/air/order_cancellations'),
            ['data' => ['order_id' => $orderId]],
        ), 'La compagnie refuse l’annulation en ligne de ce billet.');

        return $response->json('data', []);
    }

    public function confirmCancellation(string $cancellationId): array
    {
        $response = $this->send(fn (PendingRequest $http) => $http->post(
            $this->url('/air/order_cancellations/' . rawurlencode($cancellationId) . '/actions/confirm'),
        ), 'La confirmation d’annulation a échoué. Le devis a peut-être expiré.');

        return $response->json('data', []);
    }

    private function send(callable $request, ?string $fallbackMessage = null): Response
    {
        if (!$this->configured()) {
            throw new FlightProviderException('La recherche de vols n’est pas configurée (DUFFEL_API_KEY manquante).');
        }

        $http = Http::withToken(config('services.duffel.api_key'))
            ->acceptJson()
            ->asJson()
            ->withHeaders(['Duffel-Version' => config('services.duffel.version', 'v2')])
            ->timeout(20);

        try {
            $response = $request($http);
        } catch (ConnectionException) {
            throw new FlightProviderException('Le service des compagnies aériennes ne répond pas. Réessayez dans un instant.');
        }

        if ($response->failed()) {
            throw new FlightProviderException($fallbackMessage ?? $this->errorMessage($response), $response->status());
        }

        return $response;
    }

    private function errorMessage(Response $response): string
    {
        $message = $response->json('errors.0.message') ?? $response->json('errors.0.title');

        return is_string($message) && $message !== ''
            ? $message
            : 'La recherche a été refusée. Vérifiez les aéroports et les dates.';
    }

    private function url(string $path): string
    {
        return rtrim(config('services.duffel.base_url', 'https://api.duffel.com'), '/') . $path;
    }
}
