<?php

return [
    // Accès au back-office (/admin) : identifiants indépendants des comptes du site.
    // Sans ADMIN_PASSWORD, le back-office reste fermé.
    'username' => env('ADMIN_USERNAME', 'admin'),
    'password' => env('ADMIN_PASSWORD'),
    // Nom affiché sur les réponses d'assistance envoyées depuis le back-office.
    'agent_name' => env('ADMIN_AGENT_NAME', 'L’équipe LovaTrip'),
];
