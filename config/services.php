<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URL'),
    ],
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-flash-latest'),
        'fallback_models' => array_values(array_filter(array_map(
            'trim',
            explode(',', env('GEMINI_FALLBACK_MODELS', 'gemini-2.5-flash-lite,gemini-2.5-flash')),
        ))),
        'rate_limit_per_minute' => env('GEMINI_RATE_LIMIT_PER_MINUTE', 2),
        'free_daily_limit' => env('GEMINI_FREE_DAILY_LIMIT', 3),
        'premium_daily_limit' => env('GEMINI_PREMIUM_DAILY_LIMIT', 1000),
    ],
    'stripe' => [
        'secret' => env('STRIPE_SECRET'),
        'price_id' => env('STRIPE_PRICE_ID'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'flight_webhook_secret' => env('STRIPE_FLIGHT_WEBHOOK_SECRET'),
    ],
    'duffel' => [
        'api_key' => env('DUFFEL_API_KEY'),
        'base_url' => env('DUFFEL_API_BASE_URL', 'https://api.duffel.com'),
        'version' => env('DUFFEL_API_VERSION', 'v2'),
        'booking_enabled' => env('DUFFEL_BOOKING_ENABLED', false),
    ],

];
