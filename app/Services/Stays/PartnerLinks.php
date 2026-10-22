<?php

namespace App\Services\Stays;

/**
 * Liens préremplis (dates, voyageurs) vers les plateformes qui n'offrent pas
 * d'API publique de réservation (Booking.com, Airbnb, Expedia, Google).
 */
class PartnerLinks
{
    public static function forProperty(string $name, string $city, float $lat, float $lng, StaySearchQuery $query, ?string $website = null): array
    {
        $label = trim($name . ($city ? ', ' . $city : ''));

        return array_filter([
            'booking' => self::booking($label, $query),
            'airbnb' => self::airbnb($lat, $lng, $query, 0.008),
            'expedia' => self::expedia($label, $query),
            'google' => self::google($label, $query),
            'website' => $website && preg_match('#^https?://#i', $website) ? $website : null,
        ]);
    }

    public static function forArea(StaySearchQuery $query): array
    {
        $place = $query->placeName ?: sprintf('%.4f,%.4f', $query->latitude, $query->longitude);

        return [
            ['key' => 'booking', 'name' => 'Booking.com', 'url' => self::booking($place, $query)],
            ['key' => 'airbnb', 'name' => 'Airbnb', 'url' => self::airbnb($query->latitude, $query->longitude, $query, 0.04)],
            ['key' => 'expedia', 'name' => 'Expedia', 'url' => self::expedia($place, $query)],
            ['key' => 'google', 'name' => 'Google Hotels', 'url' => self::google($place, $query)],
        ];
    }

    private static function booking(string $search, StaySearchQuery $query): string
    {
        return 'https://www.booking.com/searchresults.fr.html?' . http_build_query(array_filter([
            'ss' => $search,
            'checkin' => $query->checkIn,
            'checkout' => $query->checkOut,
            'group_adults' => $query->adults,
            'no_rooms' => $query->rooms,
            'aid' => config('stays.partners.booking_aid'),
        ]));
    }

    private static function airbnb(float $lat, float $lng, StaySearchQuery $query, float $delta): string
    {
        return 'https://www.airbnb.fr/s/homes?' . http_build_query([
            'checkin' => $query->checkIn,
            'checkout' => $query->checkOut,
            'adults' => $query->adults,
            'search_by_map' => 'true',
            'ne_lat' => round($lat + $delta, 5),
            'ne_lng' => round($lng + $delta, 5),
            'sw_lat' => round($lat - $delta, 5),
            'sw_lng' => round($lng - $delta, 5),
        ]);
    }

    private static function expedia(string $search, StaySearchQuery $query): string
    {
        return 'https://www.expedia.fr/Hotel-Search?' . http_build_query([
            'destination' => $search,
            'startDate' => $query->checkIn,
            'endDate' => $query->checkOut,
            'adults' => $query->adults,
            'rooms' => $query->rooms,
        ]);
    }

    private static function google(string $search, StaySearchQuery $query): string
    {
        return 'https://www.google.com/travel/search?' . http_build_query([
            'q' => $search,
            'checkin' => $query->checkIn,
            'checkout' => $query->checkOut,
            'adults' => $query->adults,
            'hl' => 'fr',
        ]);
    }
}
