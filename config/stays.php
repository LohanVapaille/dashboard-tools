<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Commission appliquée aux hébergements
    |--------------------------------------------------------------------------
    |
    | Pourcentage ajouté au prix de l'hébergeur, distinct de celui des vols
    | (FLIGHT_TAX_PERCENT). Appliqué à l'affichage, au panier, à Stripe et au
    | reçu. Pour le modifier : STAY_COMMISSION_PERCENT=7 dans le .env.
    |
    */

    'commission_percent' => (float) env('STAY_COMMISSION_PERCENT', 5),

    'commission_label' => env('STAY_COMMISSION_LABEL', 'Frais de service'),

    'cart_ttl_minutes' => (int) env('STAY_CART_TTL_MINUTES', 30),

    // Rayon de recherche autour de la destination (km).
    'search_radius_km' => (int) env('STAYS_SEARCH_RADIUS_KM', 5),

    'max_guests' => 16,
    'max_rooms' => 8,

    /*
    |--------------------------------------------------------------------------
    | Fournisseurs
    |--------------------------------------------------------------------------
    |
    | duffel_stays : hôtels et appartements réservables et payables dans
    | l'application (même compte Duffel que les vols). L'accès doit être
    | activé par Duffel (https://duffel.com/contact-us) puis DUFFEL_STAYS_ENABLED=true.
    |
    | openstreetmap : tous les hébergements référencés autour de la
    | destination (hôtels, auberges, gîtes, appartements, campings…), sans prix ;
    | le client compare et réserve chez Booking, Airbnb, Expedia ou en direct.
    |
    */

    'providers' => [
        // LiteAPI (Nuitée) : réservation instantanée gratuite (Rates → Prebook → Book).
        // Clé sandbox gratuite sur https://www.liteapi.travel (sans carte bancaire), clé live
        // après ajout d'une carte au compte : c'est elle qui paie l'hôtel, vous encaissez via Stripe.
        'liteapi' => [
            'enabled' => filter_var(env('LITEAPI_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
            'key' => env('LITEAPI_KEY'),
            'api_url' => env('LITEAPI_API_URL', 'https://api.liteapi.travel/v3.0'),
            'book_url' => env('LITEAPI_BOOK_URL', 'https://book.liteapi.travel/v3.0'),
            'currency' => env('LITEAPI_CURRENCY', 'EUR'),
            'guest_nationality' => env('LITEAPI_GUEST_NATIONALITY', 'FR'),
            'timeout' => (int) env('LITEAPI_TIMEOUT', 8),
            'max_hotels' => (int) env('LITEAPI_MAX_HOTELS', 60),
        ],
        'duffel_stays' => [
            'enabled' => filter_var(env('DUFFEL_STAYS_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
        ],
        'openstreetmap' => [
            'enabled' => filter_var(env('STAYS_OSM_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
            // Plusieurs serveurs séparés par des virgules, essayés dans l'ordre.
            'overpass_url' => env('OVERPASS_URL', 'https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter,https://overpass.kumi.systems/api/interpreter'),
            'max_results' => 400,
            // Recommandé en production : https://www.geoapify.com (gratuit jusqu'à 3 000 requêtes/jour).
            // Sans clé, repli sur Overpass puis Nominatim (gratuits mais plus lents ou limités).
            'geoapify_key' => env('GEOAPIFY_API_KEY'),
        ],
    ],

    // Identifiant du programme d'affiliation Booking.com (commission sur les liens sortants).
    'partners' => [
        'booking_aid' => env('BOOKING_AFFILIATE_ID'),
    ],

];
