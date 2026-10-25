<?php

/*
|--------------------------------------------------------------------------
| Informations légales (mentions légales, CGV, confidentialité)
|--------------------------------------------------------------------------
|
| Obligatoires pour un site professionnel (loi pour la confiance dans
| l'économie numérique, art. 6 III). À renseigner dans le .env : les champs
| vides s'affichent « à compléter » sur les pages légales.
|
*/

return [
    'company' => env('LEGAL_COMPANY_NAME', env('APP_NAME', 'LovaTrip')),
    // Ex. « Entreprise individuelle (micro-entreprise) », « SAS au capital de 1 000 € »
    'legal_form' => env('LEGAL_FORM'),
    'address' => env('LEGAL_ADDRESS'),
    'siret' => env('LEGAL_SIRET'),
    'rcs' => env('LEGAL_RCS'),
    'vat' => env('LEGAL_VAT_NUMBER'),
    'director' => env('LEGAL_PUBLICATION_DIRECTOR'),
    'email' => env('LEGAL_EMAIL', env('FLIGHT_SUPPORT_EMAIL', env('MAIL_FROM_ADDRESS'))),
    'phone' => env('LEGAL_PHONE'),

    // Opérateur de voyages : immatriculation Atout France et garanties (Code du tourisme).
    'atout_france' => env('LEGAL_ATOUT_FRANCE_NUMBER'),
    'financial_guarantee' => env('LEGAL_FINANCIAL_GUARANTEE'),
    'insurance' => env('LEGAL_RC_PRO_INSURANCE'),

    'host' => [
        'name' => env('LEGAL_HOST_NAME'),
        'address' => env('LEGAL_HOST_ADDRESS'),
        'phone' => env('LEGAL_HOST_PHONE'),
    ],

    'mediator' => env('FLIGHT_MEDIATOR', 'Médiation Tourisme et Voyage (MTV) — BP 80303, 75823 Paris Cedex 17 — www.mtv.travel'),

    // Durée de validité d'un choix sur les cookies avant de redemander (recommandation CNIL : 6 mois).
    'consent_days' => (int) env('COOKIE_CONSENT_DAYS', 182),
];
