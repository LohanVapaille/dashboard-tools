<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Mode de vente
    |--------------------------------------------------------------------------
    |
    | false (par défaut) : modèle « partenaires vendeurs ». Les vols et hébergements
    | sont réservés et payés chez des partenaires (Aviasales, Booking.com, Expedia…),
    | qui sont les vendeurs et gèrent annulations et litiges. Le site se rémunère
    | par commissions d'affiliation : aucun encaissement, aucune marge ajoutée.
    |
    | true : vente directe (panier, paiement Stripe, frais de service). À n'activer
    | qu'une fois immatriculé auprès d'Atout France, avec garantie financière et
    | assurance RC professionnelle : le site devient alors vendeur et responsable.
    |
    */

    'direct_booking' => filter_var(env('DIRECT_BOOKING_ENABLED', false), FILTER_VALIDATE_BOOLEAN),

    /*
    |--------------------------------------------------------------------------
    | Activités (affiliation)
    |--------------------------------------------------------------------------
    |
    | Identifiants partenaires facultatifs : sans eux, les liens restent valides et
    | le script Travelpayouts Drive peut les convertir s'il est activé.
    |
    */

    'activities' => [
        'getyourguide_partner_id' => env('GETYOURGUIDE_PARTNER_ID'),
        'viator_pid' => env('VIATOR_PARTNER_ID'),
    ],

];
