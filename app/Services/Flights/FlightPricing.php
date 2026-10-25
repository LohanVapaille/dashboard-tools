<?php

namespace App\Services\Flights;

/**
 * Point unique de calcul du prix client : tout montant affiché ou facturé
 * passe par ici, pour que la recherche, le panier et Stripe soient identiques.
 */
class FlightPricing
{
    public static function percent(): float
    {
        // Modèle partenaires : le prix affiché est celui du vendeur, sans frais ajoutés.
        return config('commerce.direct_booking') ? max(0, (float) config('flights.tax_percent', 5)) : 0.0;
    }

    public static function fee(float $airlineAmount): float
    {
        return round($airlineAmount * self::percent() / 100, 2);
    }

    public static function total(float $airlineAmount): float
    {
        return round($airlineAmount + self::fee($airlineAmount), 2);
    }

    /** Montant en plus petite unité monétaire pour Stripe (centimes). */
    public static function toMinor(float $amount, string $currency): int
    {
        // Devises sans décimales acceptées par Stripe.
        $zeroDecimal = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

        return in_array(strtoupper($currency), $zeroDecimal, true)
            ? (int) round($amount)
            : (int) round($amount * 100);
    }

    public static function breakdown(float $airlineAmount): array
    {
        return [
            'airline_amount' => round($airlineAmount, 2),
            'fee_percent' => self::percent(),
            'fee_amount' => self::fee($airlineAmount),
            'total_amount' => self::total($airlineAmount),
        ];
    }
}
