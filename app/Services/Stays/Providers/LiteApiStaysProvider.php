<?php

namespace App\Services\Stays\Providers;

use App\Models\StayBooking;
use App\Models\StayOrder;
use App\Services\Flights\AirportDirectory;
use App\Services\Flights\FlightProviderException;
use App\Services\Stays\Contracts\BookableStayProvider;
use App\Services\Stays\LiteApiClient;
use App\Services\Stays\PartnerLinks;
use App\Services\Stays\StayPricing;
use App\Services\Stays\StaySearchQuery;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/** Hôtels réservables instantanément via LiteAPI (Nuitée). */
class LiteApiStaysProvider implements BookableStayProvider
{
    private const PREFIX = 'lite_';

    private const BOARDS = [
        'RO' => 'Chambre seule',
        'BB' => 'Petit-déjeuner inclus',
        'HB' => 'Demi-pension',
        'FB' => 'Pension complète',
        'AI' => 'Tout compris',
    ];

    // Mots-clés des équipements LiteAPI → filtres de l'application.
    private const AMENITIES = [
        'wifi' => ['wifi', 'wi-fi', 'internet'],
        'parking' => ['parking'],
        'pool' => ['pool', 'piscine'],
        'breakfast' => ['breakfast', 'petit-déjeuner'],
        'air_conditioning' => ['air condition', 'climatisation'],
        'kitchen' => ['kitchen', 'cuisine'],
        'pets' => ['pets allowed', 'pet friendly', 'animaux'],
        'accessible' => ['wheelchair', 'accessible', 'mobilité'],
        'restaurant' => ['restaurant'],
        'bar' => ['bar'],
        'spa' => ['spa', 'sauna', 'hammam'],
        'gym' => ['fitness', 'gym'],
        'reception_24h' => ['24-hour front desk', '24 hour front desk', 'réception 24'],
        'laundry' => ['laundry', 'blanchisserie'],
        'family' => ['family', 'babysitting', 'kids club'],
        'room_service' => ['room service'],
    ];

    public function __construct(private readonly LiteApiClient $client)
    {
    }

    public function key(): string
    {
        return 'liteapi';
    }

    public function enabled(): bool
    {
        return $this->client->enabled();
    }

    public function owns(string $propertyId): bool
    {
        return str_starts_with($propertyId, self::PREFIX);
    }

    public function search(StaySearchQuery $query): array
    {
        $response = $this->client->rates($query);
        $hotels = collect($response['hotels'] ?? [])->keyBy('id');

        return collect($response['data'] ?? [])
            ->map(function (array $result) use ($hotels, $query) {
                $hotel = $hotels->get($result['hotelId']);
                $offers = collect($result['roomTypes'] ?? []);
                if (!$hotel || $offers->isEmpty()) {
                    return null;
                }

                $cheapest = $offers->sortBy(fn ($offer) => self::offerAmount($offer))->first();
                $boards = $offers->flatMap(fn ($offer) => collect($offer['rates'] ?? [])->pluck('boardType'));

                return $this->property($hotel, $query, [
                    'price' => [
                        'currency' => self::offerCurrency($cheapest),
                        ...StayPricing::breakdown(self::offerAmount($cheapest), $query->nights()),
                        'due_at_property' => self::taxes($cheapest, false) ?: null,
                    ],
                    'free_cancellation' => $offers->contains(fn ($offer) => self::refundable($offer)),
                    'amenities' => $boards->contains(fn ($board) => $board && $board !== 'RO') ? ['breakfast'] : [],
                ]);
            })
            ->filter()
            ->values()
            ->all();
    }

    public function rates(string $propertyId, ?StaySearchQuery $query = null): array
    {
        if (!$query) {
            throw new FlightProviderException('Dates du séjour manquantes : relancez la recherche.');
        }

        $hotelId = Str::after($propertyId, self::PREFIX);
        $response = $this->client->rates($query, [$hotelId]);
        $summary = collect($response['hotels'] ?? [])->firstWhere('id', $hotelId) ?? ['id' => $hotelId];
        $details = rescue(fn () => $this->client->hotel($hotelId), [], false);
        $offers = collect($response['data'][0]['roomTypes'] ?? []);

        $rates = $offers->map(fn (array $offer) => $this->normalizeOffer($offer, $query))->sortBy('total_amount');
        $photos = collect($details['hotelImages'] ?? [])->sortBy('order')->map(fn ($image) => $image['urlHd'] ?? $image['url'] ?? null)->filter()->values();

        return [
            'property' => $this->property($summary + ['_details' => $details], $query, [
                'photos' => $photos->take(12)->all() ?: array_values(array_filter([$summary['main_photo'] ?? null])),
                'description' => isset($details['hotelDescription']) ? trim(html_entity_decode(strip_tags($details['hotelDescription']))) : null,
                'amenities' => $this->amenities($details['hotelFacilities'] ?? collect($details['facilities'] ?? [])->pluck('name')->all()),
                'check_in' => $details['checkinCheckoutTimes']['checkin_start'] ?? null,
                'check_out' => $details['checkinCheckoutTimes']['checkout'] ?? null,
                'website' => $details['website'] ?? null,
                'price' => $rates->isNotEmpty() ? [
                    'currency' => $rates->first()['currency'],
                    ...StayPricing::breakdown($rates->first()['provider_amount'], $query->nights()),
                ] : null,
                'free_cancellation' => $rates->contains('refundable', true),
            ]),
            'rooms' => $rates->groupBy('room_name')->map(fn ($roomRates, $name) => [
                'name' => $name,
                'photos' => [],
                'beds' => [],
                'rates' => $roomRates->values(),
            ])->values(),
        ];
    }

    public function quote(array $rate): array
    {
        $prebook = $this->client->prebook($rate['offer_id']);
        $roomRates = collect($prebook['roomTypes'] ?? [])->flatMap(fn ($roomType) => $roomType['rates'] ?? []);

        return [
            'id' => $prebook['prebookId'] ?? null,
            'amount' => round((float) ($prebook['price'] ?? $rate['provider_amount']), 2),
            'currency' => strtoupper($prebook['currency'] ?? $rate['currency']),
            'guests' => max(1, (int) $roomRates->sum('adultCount') + (int) $roomRates->sum('childCount')),
            'rooms' => max(1, $roomRates->count()),
        ];
    }

    public function book(StayBooking $booking, StayOrder $order): array
    {
        $guests = collect($order->guests)->values();
        $holder = $guests->first();
        // Payé dans le module Nuitée : la réservation est rattachée à cette transaction, pas à la carte du compte.
        $paidWithSdk = $order->payment_method === 'liteapi_sdk';
        $payload = fn (string $prebookId) => [
            'prebookId' => $prebookId,
            // Référence unique : LiteAPI refuse un second envoi identique (pas de double réservation).
            'clientReference' => $order->reference . '-' . $booking->id,
            'holder' => array_filter([
                'firstName' => $holder['given_name'],
                'lastName' => $holder['family_name'],
                'email' => $order->contact_email,
                'phone' => $order->contact_phone,
            ]),
            'guests' => collect(range(1, max(1, $booking->rooms)))->map(fn (int $room) => [
                'occupancyNumber' => $room,
                'firstName' => $guests[($room - 1) % $guests->count()]['given_name'],
                'lastName' => $guests[($room - 1) % $guests->count()]['family_name'],
                'email' => $order->contact_email,
                'remarks' => $room === 1 ? (string) $order->special_requests : '',
            ])->all(),
        ] + ($paidWithSdk ? ['payment' => ['method' => 'TRANSACTION_ID', 'transactionId' => $order->provider_transaction_id]] : []);

        try {
            $result = $this->client->book($payload($booking->quote_id ?: throw new FlightProviderException('Pré-réservation absente.')));
        } catch (FlightProviderException $exception) {
            // La transaction Nuitée est liée à cette pré-réservation : impossible de la renouveler.
            if ($paidWithSdk) {
                throw $exception;
            }
            // Pré-réservation expirée entre le panier et le paiement : on la renouvelle au même prix.
            $quote = $this->quote($booking->rate);
            if (abs($quote['amount'] - (float) $booking->stay_amount) >= 0.01) {
                throw new FlightProviderException('Le tarif de l’hôtel a changé avant la confirmation.');
            }
            $booking->update(['quote_id' => $quote['id']]);
            $result = $this->client->book($payload($quote['id']));
        }

        return [
            'id' => $result['bookingId'] ?? null,
            'reference' => $result['hotelConfirmationCode'] ?? $result['supplierBookingId'] ?? $result['bookingId'] ?? null,
            'confirmed' => in_array(strtoupper((string) ($result['status'] ?? 'CONFIRMED')), ['CONFIRMED', 'PENDING'], true),
        ];
    }

    public function cancel(StayBooking $booking): float
    {
        $result = $this->client->cancel($booking->provider_booking_id);

        return round((float) ($result['refund_amount'] ?? 0), 2);
    }

    private function property(array $hotel, StaySearchQuery $query, array $overrides): array
    {
        $lat = (float) ($hotel['latitude'] ?? $hotel['_details']['location']['latitude'] ?? $query->latitude);
        $lng = (float) ($hotel['longitude'] ?? $hotel['_details']['location']['longitude'] ?? $query->longitude);
        $name = $hotel['name'] ?? $hotel['_details']['name'] ?? 'Hôtel';
        $city = $hotel['city_name'] ?? $hotel['_details']['city'] ?? $query->placeName;

        return array_merge([
            'id' => self::PREFIX . $hotel['id'],
            'provider' => $this->key(),
            'bookable' => true,
            'name' => $name,
            'type' => 'hotel',
            'stars' => isset($hotel['stars']) ? (int) $hotel['stars'] : ($hotel['_details']['starRating'] ?? null),
            'rating' => isset($hotel['rating']) && $hotel['rating'] > 0 ? round((float) $hotel['rating'], 1) : null,
            'reviews_count' => $hotel['review_count'] ?? null,
            'photos' => array_values(array_filter([$hotel['main_photo'] ?? null])),
            'description' => null,
            'address' => trim(implode(', ', array_filter([$hotel['address'] ?? $hotel['_details']['address'] ?? null, $city]))),
            'city' => $city,
            'lat' => $lat,
            'lng' => $lng,
            'distance_km' => round(AirportDirectory::distanceKm($query->latitude, $query->longitude, $lat, $lng), 1),
            'amenities' => [],
            'check_in' => null,
            'check_out' => null,
            'phone' => null,
            'website' => null,
            'brand' => $hotel['_details']['chain'] ?? null,
            'free_cancellation' => null,
            'links' => PartnerLinks::forProperty($name, (string) $city, $lat, $lng, $query),
            'check_in_date' => $query->checkIn,
            'check_out_date' => $query->checkOut,
            // Contexte nécessaire pour recharger les tarifs de cet hôtel.
            'search' => ['adults' => $query->adults, 'rooms' => $query->rooms],
        ], $overrides);
    }

    private function normalizeOffer(array $offer, StaySearchQuery $query): array
    {
        $rates = collect($offer['rates'] ?? []);
        $first = $rates->first() ?? [];
        $amount = self::offerAmount($offer);
        $refundable = self::refundable($offer);
        $board = strtoupper((string) ($first['boardType'] ?? 'RO'));
        $penalties = $rates->flatMap(fn ($rate) => $rate['cancellationPolicies']['cancelPolicyInfos'] ?? [])
            ->filter(fn ($policy) => !empty($policy['cancelTime']))
            ->groupBy(fn ($policy) => CarbonImmutable::parse($policy['cancelTime'])->toIso8601String())
            ->map(fn ($group, $time) => ['time' => $time, 'fee' => (float) collect($group)->sum('amount')])
            ->sortKeys()
            ->values();

        // Échéancier exprimé en « remboursement si annulation avant telle date ».
        $timeline = [];
        if ($refundable) {
            $previousFee = 0.0;
            foreach ($penalties as $penalty) {
                $timeline[] = ['before' => $penalty['time'], 'refund_amount' => round(max(0, $amount - $previousFee), 2)];
                $previousFee = $penalty['fee'];
            }
            $timeline[] = ['before' => CarbonImmutable::parse($query->checkIn)->setTime(12, 0)->toIso8601String(), 'refund_amount' => round(max(0, $amount - $previousFee), 2)];
        }

        return [
            'id' => self::PREFIX . substr(sha1((string) $offer['offerId']), 0, 24),
            'offer_id' => $offer['offerId'],
            'room_name' => $first['name'] ?? ($offer['name'] ?? 'Chambre'),
            'name' => null,
            'board_type' => $board,
            'board_label' => self::BOARDS[$board] ?? ($first['boardName'] ?? 'Chambre seule'),
            'payment_type' => 'pay_now',
            'currency' => self::offerCurrency($offer),
            ...StayPricing::breakdown($amount, $query->nights()),
            'tax_amount' => self::taxes($offer, true) ?: null,
            'due_at_property' => ($due = self::taxes($offer, false)) > 0 ? ['amount' => $due, 'currency' => self::offerCurrency($offer)] : null,
            'refundable' => $refundable,
            'free_cancellation_until' => $refundable ? ($penalties->first()['time'] ?? $timeline[0]['before'] ?? null) : null,
            'cancellation_timeline' => $timeline,
            'conditions' => $rates->flatMap(fn ($rate) => $rate['cancellationPolicies']['hotelRemarks'] ?? [])
                ->merge($rates->pluck('remarks'))
                ->filter(fn ($remark) => is_string($remark) && trim($remark) !== '')
                ->unique()
                ->map(fn ($remark) => ['title' => 'Information de l’hôtel', 'description' => trim(strip_tags($remark))])
                ->values()
                ->all(),
            'max_occupancy' => $first['maxOccupancy'] ?? null,
            'quantity_available' => null,
            'expires_at' => null,
        ];
    }

    private function amenities(array $facilities): array
    {
        $text = Str::lower(implode(' | ', array_filter($facilities, 'is_string')));

        return array_keys(array_filter(self::AMENITIES, fn (array $words) => collect($words)->contains(fn ($word) => str_contains($text, $word))));
    }

    private static function offerAmount(array $offer): float
    {
        $total = collect($offer['offerRetailRate'] ?? [])->sum('amount')
            ?: collect($offer['rates'] ?? [])->sum(fn ($rate) => collect($rate['retailRate']['total'] ?? [])->sum('amount'));

        return round((float) $total, 2);
    }

    private static function offerCurrency(array $offer): string
    {
        return strtoupper($offer['offerRetailRate'][0]['currency'] ?? $offer['rates'][0]['retailRate']['total'][0]['currency'] ?? config('stays.providers.liteapi.currency', 'EUR'));
    }

    /** Taxes incluses dans le prix (true) ou payables sur place (false). */
    private static function taxes(array $offer, bool $included): float
    {
        return round((float) collect($offer['rates'] ?? [])
            ->flatMap(fn ($rate) => $rate['retailRate']['taxesAndFees'] ?? [])
            ->filter(fn ($tax) => (bool) ($tax['included'] ?? false) === $included)
            ->sum('amount'), 2);
    }

    private static function refundable(array $offer): bool
    {
        $rates = collect($offer['rates'] ?? []);

        return $rates->isNotEmpty() && $rates->every(fn ($rate) => ($rate['cancellationPolicies']['refundableTag'] ?? 'NRFN') === 'RFN');
    }
}
