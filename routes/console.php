<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Purge quotidienne des données arrivées au terme de leur conservation (ex. conversations d'assistance).
Illuminate\Support\Facades\Schedule::command('model:prune')->daily();
