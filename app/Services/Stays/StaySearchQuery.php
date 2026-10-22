<?php

namespace App\Services\Stays;

use Carbon\CarbonImmutable;

final class StaySearchQuery
{
    public function __construct(
        public readonly float $latitude,
        public readonly float $longitude,
        public readonly string $checkIn,
        public readonly string $checkOut,
        public readonly int $adults = 2,
        public readonly int $rooms = 1,
        public readonly int $radiusKm = 5,
        public readonly string $placeName = '',
    ) {
    }

    public function nights(): int
    {
        return max(1, CarbonImmutable::parse($this->checkIn)->diffInDays(CarbonImmutable::parse($this->checkOut)));
    }

    public function cacheKey(): string
    {
        return md5(implode('|', [round($this->latitude, 3), round($this->longitude, 3), $this->checkIn, $this->checkOut, $this->adults, $this->rooms, $this->radiusKm]));
    }
}
