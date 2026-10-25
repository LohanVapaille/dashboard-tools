<?php

namespace App\Services\Stays\Providers;

use App\Models\StayBooking;
use App\Models\StayOrder;
use App\Services\Flights\AirportDirectory;
use App\Services\Flights\FlightProviderException;
use App\Services\Stays\Contracts\BookableStayProvider;
use App\Services\Stays\DuffelStaysClient;
use App\Services\Stays\PartnerLinks;
use App\Services\Stays\StayPricing;
use App\Services\Stays\StaySearchQuery;
use Carbon\CarbonImmutable;

/** Hébergements réservables et payables dans l'application (Duffel Stays). */
class DuffelStaysProvider implements BookableStayProvider
{
    // Correspondance des équipements Duffel vers les filtres de l'application.
    private const AMENITIES = [
        'wifi' => 'wifi',
        'parking' => 'parking',
        'pool' => 'pool',
        'gym' => 'gym',
        'spa' => 'spa',
        'restaurant' => 'restaurant',
        'lounge' => 'bar',
        '24_hour_front_desk' => 'reception_24h',
        'laundry' => 'laundry',
        'pets_allowed' => 'pets',
        'accessibility_mobility' => 'accessible',
        'childcare_service' => 'family',
        'room_service' => 'room_service',
        'business_centre' => 'business',
    ];

    public const BOARDS = [
        'room_only' => 'Chambre seule',
        'breakfast' => 'Petit-déjeuner inclus',
        'half_board' => 'Demi-pension',
        'full_board' => 'Pension complète',
        'all_inclusive' => 'Tout compris',
    ];

    public function __construct(private readonly DuffelStaysClient $client)
    {
    }

    public function key(): string
    {
        return 'duffel';
    }

    public function enabled(): bool
    {
        return $this->client->enabled();
    }

    public function owns(string $propertyId): bool
    {
        return str_starts_with($propertyId, 'srr_');
    }

    public function search(StaySearchQuery $query): array
    {
        return collect($this->client->search($query))
            ->map(fn (array $result) => $this->normalizeResult($result, $query))
            ->filter()
            ->values()
            ->all();
    }

    /** Toutes les chambres et tarifs d'un hébergement trouvé. */
    public function rates(string $searchResultId, ?StaySearchQuery $context = null): array
    {
        $data = $this->client->fetchAllRates($searchResultId);
        $query = new StaySearchQuery(
            (float) ($data['accommodation']['location']['geographic_coordinates']['latitude'] ?? 0),
            (float) ($data['accommodation']['location']['geographic_coordinates']['longitude'] ?? 0),
            $data['check_in_date'],
            $data['check_out_date'],
            max(1, count($data['guests'] ?? [])),
            (int) ($data['rooms'] ?? 1),
        );

        return [
            'property' => $this->normalizeResult($data, $query),
            'rooms' => collect($data['accommodation']['rooms'] ?? [])->map(fn (array $room) => [
                'name' => $room['name'] ?? 'Chambre',
                'photos' => collect($room['photos'] ?? [])->pluck('url')->filter()->values(),
                'beds' => collect($room['beds'] ?? [])->map(fn ($bed) => ['type' => $bed['type'] ?? 'bed', 'count' => (int) ($bed['count'] ?? 1)])->values(),
                'rates' => collect($room['rates'] ?? [])->map(fn (array $rate) => self::normalizeRate($rate, $query->nights()))->sortBy('total_amount')->values(),
            ])->filter(fn ($room) => $room['rates']->isNotEmpty())->values(),
        ];
    }

    public function quote(array $rate): array
    {
        $quote = $this->client->createQuote($rate['id']);

        return [
            'id' => $quote['id'] ?? null,
            'amount' => (float) ($quote['total_amount'] ?? 0),
            'currency' => strtoupper($quote['total_currency'] ?? $rate['currency'] ?? 'EUR'),
            'guests' => count($quote['guests'] ?? []) ?: 1,
            'rooms' => (int) ($quote['rooms'] ?? 1),
        ];
    }

    public function book(StayBooking $booking, StayOrder $order): array
    {
        $quoteId = $booking->quote_id;
        if (!$quoteId) {
            $quote = $this->quote($booking->rate);
            if (abs($quote['amount'] - (float) $booking->stay_amount) >= 0.01) {
                throw new FlightProviderException('Le tarif de l’hébergement a changé avant la confirmation.');
            }
            $quoteId = $quote['id'];
        }

        $result = $this->client->createBooking(
            $quoteId,
            collect($order->guests)->map(fn (array $guest) => ['given_name' => $guest['given_name'], 'family_name' => $guest['family_name']])->values()->all(),
            $order->contact_email,
            $order->contact_phone,
            $order->special_requests,
        );

        return [
            'id' => $result['id'] ?? null,
            'reference' => $result['reference'] ?? null,
            'confirmed' => ($result['status'] ?? 'confirmed') === 'confirmed',
        ];
    }

    public function cancel(StayBooking $booking): float
    {
        // Duffel n'indique pas le montant remboursé : on applique l'échéancier du tarif.
        $refund = \App\Http\Controllers\StayOrderController::currentRefund($booking);
        $this->client->cancelBooking($booking->provider_booking_id);

        return $refund;
    }

    public static function normalizeRate(array $rate, int $nights): array
    {
        $amount = (float) ($rate['total_amount'] ?? 0);
        $timeline = collect($rate['cancellation_timeline'] ?? [])->sortBy('before')->values();
        $fullRefund = $timeline->first(fn ($step) => (float) ($step['refund_amount'] ?? 0) >= $amount - 0.01);

        return [
            'id' => $rate['id'],
            'name' => $rate['name'] ?? null,
            'board_type' => $rate['board_type'] ?? 'room_only',
            'board_label' => self::BOARDS[$rate['board_type'] ?? 'room_only'] ?? 'Chambre seule',
            'payment_type' => $rate['payment_type'] ?? 'pay_now',
            'currency' => strtoupper($rate['total_currency'] ?? 'EUR'),
            ...StayPricing::breakdown($amount, $nights),
            'tax_amount' => isset($rate['tax_amount']) ? (float) $rate['tax_amount'] : null,
            'due_at_property' => (float) ($rate['due_at_accommodation_amount'] ?? 0) > 0
                ? ['amount' => (float) $rate['due_at_accommodation_amount'], 'currency' => strtoupper($rate['due_at_accommodation_currency'] ?? $rate['total_currency'] ?? 'EUR')]
                : null,
            'refundable' => $timeline->isNotEmpty(),
            'free_cancellation_until' => $fullRefund['before'] ?? null,
            'cancellation_timeline' => $timeline->map(fn ($step) => [
                'before' => $step['before'] ?? null,
                'refund_amount' => (float) ($step['refund_amount'] ?? 0),
            ])->all(),
            'conditions' => collect($rate['conditions'] ?? [])->map(fn ($condition) => [
                'title' => $condition['title'] ?? '',
                'description' => $condition['description'] ?? '',
            ])->all(),
            'quantity_available' => $rate['quantity_available'] ?? null,
            'expires_at' => $rate['expires_at'] ?? null,
        ];
    }

    private function normalizeResult(array $result, StaySearchQuery $query): ?array
    {
        $accommodation = $result['accommodation'] ?? null;
        $amount = (float) ($result['cheapest_rate_total_amount'] ?? 0);
        if (!$accommodation || $amount <= 0) {
            return null;
        }

        $lat = (float) ($accommodation['location']['geographic_coordinates']['latitude'] ?? 0);
        $lng = (float) ($accommodation['location']['geographic_coordinates']['longitude'] ?? 0);
        $address = $accommodation['location']['address'] ?? [];
        $rates = collect($accommodation['rooms'] ?? [])->flatMap(fn ($room) => $room['rates'] ?? []);
        $amenities = collect($accommodation['amenities'] ?? [])->pluck('type')->map(fn ($type) => self::AMENITIES[$type] ?? null)->filter();
        if ($rates->contains(fn ($rate) => in_array($rate['board_type'] ?? '', ['breakfast', 'half_board', 'full_board', 'all_inclusive'], true))) {
            $amenities->push('breakfast');
        }
        $nights = $query->nights();

        return [
            'id' => $result['id'],
            'provider' => 'duffel',
            'bookable' => true,
            'name' => $accommodation['name'] ?? 'Hébergement',
            'type' => 'hotel',
            'stars' => isset($accommodation['rating']) ? (int) $accommodation['rating'] : null,
            'rating' => isset($accommodation['review_score']) ? round((float) $accommodation['review_score'], 1) : null,
            'reviews_count' => $accommodation['review_count'] ?? null,
            'photos' => collect($accommodation['photos'] ?? [])->pluck('url')->filter()->take(12)->values()->all(),
            'description' => $accommodation['description'] ?? null,
            'address' => trim(implode(', ', array_filter([$address['line_one'] ?? null, $address['postal_code'] ?? null, $address['city_name'] ?? null]))),
            'city' => $address['city_name'] ?? null,
            'lat' => $lat,
            'lng' => $lng,
            'distance_km' => round(AirportDirectory::distanceKm($query->latitude, $query->longitude, $lat, $lng), 1),
            'amenities' => $amenities->unique()->values()->all(),
            'check_in' => $accommodation['check_in_information']['check_in_after_time'] ?? null,
            'check_out' => $accommodation['check_in_information']['check_out_before_time'] ?? null,
            'phone' => $accommodation['phone_number'] ?? null,
            'website' => null,
            'brand' => $accommodation['brand']['name'] ?? $accommodation['chain']['name'] ?? null,
            'price' => [
                'currency' => strtoupper($result['cheapest_rate_currency'] ?? 'EUR'),
                ...StayPricing::breakdown($amount, $nights),
                'due_at_property' => (float) ($result['cheapest_rate_due_at_accommodation_amount'] ?? 0) ?: null,
            ],
            'free_cancellation' => $rates->isEmpty() ? null : $rates->contains(fn ($rate) => !empty($rate['cancellation_timeline'])),
            'links' => PartnerLinks::forProperty($accommodation['name'] ?? '', $address['city_name'] ?? '', $lat, $lng, $query),
            'check_in_date' => $query->checkIn,
            'check_out_date' => $query->checkOut,
            'expires_at' => $result['expires_at'] ?? CarbonImmutable::now()->addMinutes(20)->toIso8601String(),
        ];
    }
}
