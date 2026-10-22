<?php

namespace App\Services\Stays\Contracts;

use App\Models\StayBooking;
use App\Models\StayOrder;
use App\Services\Stays\StaySearchQuery;

/**
 * Fournisseur d'hébergements réservables et payables dans l'application.
 * Les erreurs destinées au client sont levées en FlightProviderException.
 */
interface BookableStayProvider
{
    public function key(): string;

    public function enabled(): bool;

    /** L'identifiant d'hébergement renvoyé par search() appartient-il à ce fournisseur ? */
    public function owns(string $propertyId): bool;

    /** Hébergements disponibles avec leur prix le plus bas (format normalisé). */
    public function search(StaySearchQuery $query): array;

    /**
     * Chambres et tarifs d'un hébergement.
     *
     * @return array{property: array, rooms: array}
     */
    public function rates(string $propertyId, ?StaySearchQuery $query = null): array;

    /**
     * Bloque le tarif et renvoie le prix définitif.
     *
     * @return array{id: string, amount: float, currency: string, guests: int, rooms: int}
     */
    public function quote(array $rate): array;

    /**
     * Confirme la réservation auprès de l'hébergement (après paiement).
     *
     * @return array{id: ?string, reference: ?string, confirmed: bool}
     */
    public function book(StayBooking $booking, StayOrder $order): array;

    /** Annule et renvoie le montant remboursé par l'hébergement. */
    public function cancel(StayBooking $booking): float;
}
