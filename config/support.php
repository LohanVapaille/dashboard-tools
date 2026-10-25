<?php

return [
    // Comptes qui répondent au chat d'assistance (adresses e-mail séparées par des virgules).
    'admins' => array_values(array_filter(array_map('trim', explode(',', (string) env('SUPPORT_ADMIN_EMAILS', ''))))),
    // Délai de réponse annoncé au client.
    'response_time' => env('SUPPORT_RESPONSE_TIME', 'en général dans la journée'),
];
