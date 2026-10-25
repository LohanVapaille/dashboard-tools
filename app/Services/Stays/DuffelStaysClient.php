<?php

namespace App\Services\Stays;

use App\Services\Flights\FlightProviderException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/** API Duffel Stays : recherche, tarifs, devis, réservation, annulation. */
class DuffelStaysClient
{
    public function enabled(): bool
    {
        return (bool) config('services.duffel.api_key') && (bool) config('stays.providers.duffel_stays.enabled');
    }

    public function search(StaySearchQuery $query): array
    {
        return $this->send(fn (PendingRequest $http) => $http->timeout(45)->post($this->url('/stays/search'), [
            'data' => [
                'rooms' => $query->rooms,
                'guests' => array_fill(0, $query->adults, ['type' => 'adult']),
                'check_in_date' => $query->checkIn,
                'check_out_date' => $query->checkOut,
                'location' => [
                    'radius' => $query->radiusKm,
                    'geographic_coordinates' => ['latitude' => $query->latitude, 'longitude' => $query->longitude],
                ],
            ],
        ]))->json('data.results', []);
    }

    public function fetchAllRates(string $searchResultId): array
    {
        return $this->send(
            fn (PendingRequest $http) => $http->timeout(45)->post($this->url('/stays/search_results/' . rawurlencode($searchResultId) . '/actions/fetch_all_rates')),
            'Les disponibilités de cet hébergement ont expiré. Relancez la recherche.',
        )->json('data', []);
    }

    public function createQuote(string $rateId): array
    {
        return $this->send(
            fn (PendingRequest $http) => $http->post($this->url('/stays/quotes'), ['data' => ['rate_id' => $rateId]]),
            'Cette chambre n’est plus disponible à ce tarif. Choisissez une autre offre.',
        )->json('data', []);
    }

    public function createBooking(string $quoteId, array $guests, string $email, string $phone, ?string $requests): array
    {
        return $this->send(fn (PendingRequest $http) => $http->timeout(60)->post($this->url('/stays/bookings'), [
            'data' => array_filter([
                'quote_id' => $quoteId,
                'guests' => $guests,
                'email' => $email,
                'phone_number' => $phone,
                'accommodation_special_requests' => $requests ?: null,
            ]),
        ]))->json('data', []);
    }

    public function cancelBooking(string $bookingId): array
    {
        return $this->send(
            fn (PendingRequest $http) => $http->post($this->url('/stays/bookings/' . rawurlencode($bookingId) . '/actions/cancel')),
            'L’hébergement refuse l’annulation en ligne de cette réservation.',
        )->json('data', []);
    }

    private function send(callable $request, ?string $fallback = null): Response
    {
        if (!$this->enabled()) {
            throw new FlightProviderException('La réservation d’hébergements n’est pas activée.');
        }

        $http = Http::withToken(config('services.duffel.api_key'))
            ->acceptJson()
            ->asJson()
            ->withHeaders(['Duffel-Version' => config('services.duffel.version', 'v2')])
            ->timeout(20);

        try {
            $response = $request($http);
        } catch (ConnectionException) {
            throw new FlightProviderException('Le service d’hébergement ne répond pas. Réessayez dans un instant.');
        }

        if ($response->failed()) {
            $message = $response->json('errors.0.message');
            throw new FlightProviderException($fallback ?? (is_string($message) && $message !== '' ? $message : 'La recherche d’hébergements a échoué.'), $response->status());
        }

        return $response;
    }

    private function url(string $path): string
    {
        return rtrim(config('services.duffel.base_url', 'https://api.duffel.com'), '/') . $path;
    }
}
