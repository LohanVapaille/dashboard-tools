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
    // « Frais de service » : ce supplément n'est pas une taxe, le présenter comme tel serait trompeur.
    'tax_label' => env('FLIGHT_TAX_LABEL', 'Frais de service'),

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
            // Mode partenaires : Duffel ne sert qu'à afficher des vols précis (achat sur Aviasales). Sans vente,
            // chaque recherche au-delà du ratio 1500:1 est facturée 0,005 $ (clé live). false = comparateurs seuls.
            // Désactivé par défaut : ses tarifs ne sont pas ceux d'Aviasales (et sont fictifs avec une clé de test).
            'partner_search' => filter_var(env('DUFFEL_PARTNER_SEARCH', false), FILTER_VALIDATE_BOOLEAN),
        ],
        'travelpayouts' => [
            'enabled' => (bool) env('TRAVELPAYOUTS_TOKEN'),
            'token' => env('TRAVELPAYOUTS_TOKEN'),
            // Partner ID (« marker ») : identifiant personnel affiché dans le compte Travelpayouts.
            'marker' => env('TRAVELPAYOUTS_MARKER'),
            // ID du projet (« trs », le source=… des pages Travelpayouts) : sert au script Drive et à l'API de liens.
            'project_id' => env('TRAVELPAYOUTS_PROJECT_ID'),
            // Script « Drive » : convertit automatiquement les liens sortants en liens affiliés.
            'drive' => filter_var(env('TRAVELPAYOUTS_DRIVE', false), FILTER_VALIDATE_BOOLEAN),
            'base_url' => env('TRAVELPAYOUTS_BASE_URL', 'https://api.travelpayouts.com'),
        ],
    ],

    // Coordonnées affichées dans les conditions de vente et sur les reçus.
    'seller' => [
        'name' => env('FLIGHT_SELLER_NAME', env('APP_NAME', 'LovaTrip')),
        'email' => env('FLIGHT_SUPPORT_EMAIL', env('MAIL_FROM_ADDRESS')),
        'address' => env('FLIGHT_SELLER_ADDRESS'),
        'mediator' => env('FLIGHT_MEDIATOR', 'Médiation Tourisme et Voyage (MTV) — www.mtv.travel'),
    ],

];
