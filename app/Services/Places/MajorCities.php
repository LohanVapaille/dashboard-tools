<?php

namespace App\Services\Places;

/**
 * Grandes villes par pays (GeoNames, CC BY 4.0 — database/data/major_cities.json).
 * Sert à transformer une destination trop large (« Islande ») en villes où chercher un logement.
 */
class MajorCities
{
    private ?array $countries = null;

    /** Pays désigné par un nom de lieu (« Islande », « Ísland », « Iceland »…) ou par son code ISO. */
    public function country(?string $placeName, ?string $countryCode = null): ?array
    {
        $countries = $this->countries();

        if ($countryCode && isset($countries[strtoupper($countryCode)])) {
            return $this->present(strtoupper($countryCode));
        }

        // Seul le premier segment compte : « Reykjavík, Islande » désigne une ville, pas le pays.
        $needle = self::normalize(explode(',', (string) $placeName)[0]);
        if ($needle === '') {
            return null;
        }

        foreach ($countries as $code => $country) {
            if (in_array($needle, $country['aliases'], true)) {
                return $this->present($code);
            }
        }

        return null;
    }

    /** Pays d'un lieu au format « Ville, Région, Pays » (dernier segment), ou désigné directement. */
    public function countryOfPlace(?string $placeName): ?array
    {
        $segments = array_values(array_filter(array_map('trim', explode(',', (string) $placeName))));
        foreach (array_unique([end($segments) ?: '', $segments[0] ?? '']) as $segment) {
            if ($segment !== '' && ($country = $this->country($segment))) {
                return ['code' => $country['code'], 'name' => $country['name'], 'slug' => $country['slug']];
            }
        }

        return null;
    }

    /** Grandes villes autour d'un point (région, massif, parc…), les plus peuplées d'abord. */
    public function nearby(float $latitude, float $longitude, int $limit = 6, float $maxKm = 250): array
    {
        $cities = [];

        foreach ($this->countries() as $country) {
            foreach ($country['cities'] as $row) {
                $distance = self::distanceKm($latitude, $longitude, $row[1], $row[2]);
                if ($distance <= $maxKm) {
                    $cities[] = self::city($row, $country['name']) + ['distance_km' => round($distance)];
                }
            }
        }

        // Une ville proche compte plus qu'une grande ville lointaine.
        usort($cities, fn ($a, $b) => $b['population'] / (1 + $b['distance_km'] / 25) ** 2 <=> $a['population'] / (1 + $a['distance_km'] / 25) ** 2);

        return array_slice($cities, 0, $limit);
    }

    public static function normalize(string $value): string
    {
        if (class_exists(\Normalizer::class)) {
            $value = \Normalizer::normalize($value) ?: $value;
        }
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;

        return trim(preg_replace('/\s+/', ' ', preg_replace('/[^a-z0-9 ]+/', ' ', strtolower($ascii))));
    }

    private function present(string $code): array
    {
        $country = $this->countries()[$code];
        $cities = array_map(fn ($row) => self::city($row, $country['name']), $country['cities']);
        usort($cities, fn ($a, $b) => $b['population'] <=> $a['population']);

        // slug : nom anglais du pays (« iceland »), utilisé par les liens des partenaires eSIM.
        return ['code' => $code, 'name' => $country['name'], 'slug' => str_replace(' ', '-', $country['aliases'][0] ?? strtolower($code)), 'cities' => $cities];
    }

    private static function city(array $row, string $countryName): array
    {
        return [
            'name' => $row[0],
            'label' => $row[0] . ', ' . $countryName,
            'latitude' => $row[1],
            'longitude' => $row[2],
            'population' => $row[3],
            'capital' => (bool) $row[4],
        ];
    }

    private function countries(): array
    {
        return $this->countries ??= json_decode(file_get_contents(database_path('data/major_cities.json')), true)['countries'];
    }

    private static function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 6371 * 2 * asin(min(1, sqrt($a)));
    }
}
