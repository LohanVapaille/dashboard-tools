<?php

namespace App\Services\Flights;

final class FlightSearchQuery
{
    public function __construct(
        public readonly string $origin,
        public readonly string $destination,
        public readonly string $date,
        public readonly int $passengers = 1,
        public readonly string $cabin = 'economy',
        public readonly ?int $maxStops = null,
    ) {
    }
}
