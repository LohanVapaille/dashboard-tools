<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Taxes et frais appliqués aux billets d'avion
    |--------------------------------------------------------------------------
    |
    | Pourcentage ajouté au prix de la compagnie. Il est appliqué partout :
    | prix affichés dans la recherche, panier, montant envoyé à Stripe et reçu.
    | Pour le modifier : FLIGHT_TAX_PERCENT=7.5 dans le .env (puis
    | `php artisan config:clear` si la configuration est mise en cache).
    |
    */

    'tax_percent' => (float) env('FLIGHT_TAX_PERCENT', 5),

    // Libellé affiché au client pour ce supplément (reçu, panier, Stripe).
    'tax_label' => env('FLIGHT_TAX_LABEL', 'Taxes et frais de service'),

    /*
    |--------------------------------------------------------------------------
    | Panier
    |--------------------------------------------------------------------------
    */

    // Durée de conservation d'un vol dans le panier (les offres des
    // compagnies expirent rapidement, on ne garde pas un prix périmé).
    'cart_ttl_minutes' => (int) env('FLIGHT_CART_TTL_MINUTES', 30),

    'max_passengers' => 9,

    /*
    |--------------------------------------------------------------------------
    | Fournisseurs de vols
    |--------------------------------------------------------------------------
    |
    | Duffel : recherche + réservation (300+ compagnies, NDC et low-cost).
    | Travelpayouts : comparaison de prix uniquement, redirige vers le
    | partenaire (activé si TRAVELPAYOUTS_TOKEN est renseigné).
    |
    */

    'providers' => [
        'duffel' => [
            'enabled' => (bool) env('DUFFEL_API_KEY'),
        ],
        'travelpayouts' => [
            'enabled' => (bool) env('TRAVELPAYOUTS_TOKEN'),
            'token' => env('TRAVELPAYOUTS_TOKEN'),
            'marker' => env('TRAVELPAYOUTS_MARKER'),
            // Script « Drive » : convertit automatiquement les liens sortants en liens affiliés.
            'drive' => filter_var(env('TRAVELPAYOUTS_DRIVE', false), FILTER_VALIDATE_BOOLEAN),
            'base_url' => env('TRAVELPAYOUTS_BASE_URL', 'https://api.travelpayouts.com'),
        ],
    ],

    // Coordonnées affichées dans les conditions de vente et sur les reçus.
    'seller' => [
        'name' => env('FLIGHT_SELLER_NAME', env('APP_NAME', 'TravelPlanner')),
        'email' => env('FLIGHT_SUPPORT_EMAIL', env('MAIL_FROM_ADDRESS')),
        'address' => env('FLIGHT_SELLER_ADDRESS'),
        'mediator' => env('FLIGHT_MEDIATOR', 'Médiation Tourisme et Voyage (MTV) — www.mtv.travel'),
    ],

];
