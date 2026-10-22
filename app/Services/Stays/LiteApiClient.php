<?php

namespace App\Services\Stays;

use App\Services\Flights\FlightProviderException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * LiteAPI (Nuitée) : recherche, pré-réservation, réservation et annulation d'hôtels.
 * Parcours gratuit (Rates → Prebook → Book) ; clé sandbox gratuite sur liteapi.travel.
 */
class LiteApiClient
{
    public function enabled(): bool
    {
        return (bool) config('stays.providers.liteapi.key') && (bool) config('stays.providers.liteapi.enabled');
    }

    public function sandbox(): bool
    {
        return str_starts_with((string) config('stays.providers.liteapi.key'), 'sand_');
    }

    /** Tarifs autour d'un point (recherche) ou pour une liste d'hôtels (détail). */
    public function rates(StaySearchQuery $query, array $hotelIds = [], bool $withHotelData = true): array
    {
        $body = [
            'occupancies' => self::occupancies($query->adults, $query->rooms),
            'currency' => config('stays.providers.liteapi.currency', 'EUR'),
            'guestNationality' => config('stays.providers.liteapi.guest_nationality', 'FR'),
            'checkin' => $query->checkIn,
            'checkout' => $query->checkOut,
            'timeout' => (int) config('stays.providers.liteapi.timeout', 8),
            'includeHotelData' => $withHotelData,
        ];

        $body += $hotelIds
            ? ['hotelIds' => array_values($hotelIds)]
            : [
                'latitude' => $query->latitude,
                'longitude' => $query->longitude,
                'radius' => min(25, max(1, $query->radiusKm)) * 1000,
                'limit' => (int) config('stays.providers.liteapi.max_hotels', 60),
                // La liste n'affiche que le prix le moins cher : sans limite, la réponse dépasse des centaines de Mo.
                'maxRatesPerHotel' => 1,
            ];

        return $this->send(fn (PendingRequest $http) => $http->timeout(30)->post($this->api('/hotels/rates'), $body))->json();
    }

    /** Fiche de l'hôtel (photos, équipements, description) : change peu, cache d'un jour. */
    public function hotel(string $hotelId): array
    {
        return Cache::remember('liteapi.hotel.' . $hotelId, now()->addDay(), fn () => $this->send(
            fn (PendingRequest $http) => $http->get($this->api('/data/hotel'), ['hotelId' => $hotelId, 'language' => 'fr']),
        )->json('data', []));
    }

    public function prebook(string $offerId): array
    {
        return $this->send(
            fn (PendingRequest $http) => $http->timeout(30)->post($this->bookingUrl('/rates/prebook'), ['offerId' => $offerId, 'usePaymentSdk' => false]),
            'Cette chambre n’est plus disponible à ce tarif. Choisissez une autre offre.',
        )->json('data', []);
    }

    public function book(array $payload): array
    {
        return $this->send(
            fn (PendingRequest $http) => $http->timeout(60)->post($this->bookingUrl('/rates/book'), $payload + ['payment' => ['method' => 'ACC_CREDIT_CARD']]),
        )->json('data', []);
    }

    public function cancel(string $bookingId): array
    {
        return $this->send(
            fn (PendingRequest $http) => $http->put($this->bookingUrl('/bookings/' . rawurlencode($bookingId))),
            'L’hôtel refuse l’annulation en ligne de cette réservation.',
        )->json('data', []);
    }

    /** Répartit les adultes sur les chambres demandées (au moins un par chambre). */
    public static function occupancies(int $adults, int $rooms): array
    {
        $rooms = max(1, min($rooms, $adults));
        $base = intdiv($adults, $rooms);
        $extra = $adults % $rooms;

        return array_map(fn (int $index) => ['adults' => $base + ($index < $extra ? 1 : 0)], range(0, $rooms - 1));
    }

    private function send(callable $request, ?string $fallback = null): Response
    {
        if (!$this->enabled()) {
            throw new FlightProviderException('La réservation instantanée d’hôtels n’est pas configurée (LITEAPI_KEY).');
        }

        $http = Http::withHeaders(['X-API-Key' => config('stays.providers.liteapi.key')])->acceptJson()->asJson()->timeout(20);

        try {
            $response = $request($http);
        } catch (ConnectionException) {
            throw new FlightProviderException('Le service de réservation d’hôtels ne répond pas. Réessayez dans un instant.');
        }

        if ($response->failed()) {
            $message = $response->json('error.description') ?? $response->json('error.message') ?? $response->json('message');
            throw new FlightProviderException($fallback ?? (is_string($message) && $message !== '' ? $message : 'La réservation d’hôtel a échoué.'), $response->status());
        }

        return $response;
    }

    private function api(string $path): string
    {
        return rtrim(config('stays.providers.liteapi.api_url'), '/') . $path;
    }

    private function bookingUrl(string $path): string
    {
        return rtrim(config('stays.providers.liteapi.book_url'), '/') . $path;
    }
}
