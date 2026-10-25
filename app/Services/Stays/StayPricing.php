<?php

namespace App\Services\Stays;

use App\Services\Flights\FlightPricing;

/** Commission hébergement : même logique que les vols, variable distincte. */
class StayPricing
{
    public static function percent(): float
    {
        // Modèle partenaires : le prix affiché est celui du vendeur, sans frais ajoutés.
        return config('commerce.direct_booking') ? max(0, (float) config('stays.commission_percent', 5)) : 0.0;
    }

    public static function fee(float $amount): float
    {
        return round($amount * self::percent() / 100, 2);
    }

    public static function total(float $amount): float
    {
        return round($amount + self::fee($amount), 2);
    }

    public static function toMinor(float $amount, string $currency): int
    {
        return FlightPricing::toMinor($amount, $currency);
    }

    public static function breakdown(float $providerAmount, int $nights = 1): array
    {
        $total = self::total($providerAmount);

        return [
            'provider_amount' => round($providerAmount, 2),
            'fee_percent' => self::percent(),
            'fee_amount' => self::fee($providerAmount),
            'total_amount' => $total,
            'per_night' => round($total / max(1, $nights), 2),
            'nights' => $nights,
        ];
    }
}
