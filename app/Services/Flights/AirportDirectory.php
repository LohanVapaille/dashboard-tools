<?php

namespace App\Services\Flights;

use Illuminate\Support\Str;

/**
 * Annuaire local des aéroports ayant des vols commerciaux réguliers
 * (OurAirports, domaine public), généré dans database/data/airports.json.
 */
class AirportDirectory
{
    private ?array $airports = null;

    public function all(): array
    {
        if ($this->airports !== null) {
            return $this->airports;
        }

        $raw = json_decode(file_get_contents(database_path('data/airports.json')), true);
        $fields = $raw['fields'];

        return $this->airports = array_map(
            fn (array $row) => array_combine($fields, $row),
            $raw['airports'],
        );
    }

    public function find(?string $code): ?array
    {
        if (!$code) {
            return null;
        }

        foreach ($this->all() as $airport) {
            if ($airport['code'] === strtoupper($code)) {
                return $airport;
            }
        }

        return null;
    }

    public function search(string $query, int $limit = 20): array
    {
        $needle = Str::lower(Str::ascii(trim($query)));
        if ($needle === '') {
            return array_slice($this->sortBySize($this->all()), 0, $limit);
        }

        $scored = [];
        foreach ($this->all() as $airport) {
            $code = Str::lower($airport['code']);
            $city = Str::lower(Str::ascii($airport['city']));
            $name = Str::lower(Str::ascii($airport['name']));

            $score = match (true) {
                $code === $needle => 0,
                str_starts_with($city, $needle) => 1,
                str_starts_with($name, $needle) => 2,
                str_contains($city, $needle) || str_contains($name, $needle) => 3,
                Str::lower($airport['country']) === $needle => 4,
                default => null,
            };

            if ($score !== null) {
                $scored[] = [$score, $this->sizeRank($airport), $airport];
            }
        }

        usort($scored, fn ($a, $b) => [$a[0], $a[1]] <=> [$b[0], $b[1]]);

        return array_map(fn ($item) => $item[2], array_slice($scored, 0, $limit));
    }

    /**
     * Aéroports proches d'un point, triés par pertinence : un grand aéroport
     * un peu plus loin passe devant un petit aéroport régional tout proche.
     */
    public function nearest(float $lat, float $lng, int $limit = 4, int $radiusKm = 250): array
    {
        $candidates = [];
        foreach ($this->all() as $airport) {
            $distance = self::distanceKm($lat, $lng, $airport['lat'], $airport['lng']);
            if ($distance <= $radiusKm) {
                $candidates[] = $airport + ['distance_km' => (int) round($distance)];
            }
        }

        if (!$candidates) {
            // Aucun aéroport dans le rayon (île isolée…) : on prend les plus proches.
            foreach ($this->all() as $airport) {
                $candidates[] = $airport + ['distance_km' => (int) round(self::distanceKm($lat, $lng, $airport['lat'], $airport['lng']))];
            }
        }

        // Équivalent en km d'un aéroport plus important (plus de destinations).
        $bonus = ['L' => 70, 'M' => 15, 'S' => 0];
        usort($candidates, fn ($a, $b) => ($a['distance_km'] - $bonus[$a['size']]) <=> ($b['distance_km'] - $bonus[$b['size']]));

        return array_slice($candidates, 0, $limit);
    }

    public static function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 6371 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function sortBySize(array $airports): array
    {
        usort($airports, fn ($a, $b) => $this->sizeRank($a) <=> $this->sizeRank($b));

        return $airports;
    }

    private function sizeRank(array $airport): int
    {
        return ['L' => 0, 'M' => 1, 'S' => 2][$airport['size']] ?? 3;
    }
}
