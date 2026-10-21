<?php

namespace App\Services\Flights\Contracts;

use App\Services\Flights\FlightSearchQuery;

interface FlightProvider
{
    public function key(): string;

    public function label(): string;

    public function enabled(): bool;

    /** Les offres peuvent-elles être achetées dans l'application ? */
    public function bookable(): bool;

    /**
     * Offres d'un aller simple, au format normalisé (voir DuffelProvider::normalize).
     *
     * @throws \App\Services\Flights\FlightProviderException
     */
    public function search(FlightSearchQuery $query): array;
}
