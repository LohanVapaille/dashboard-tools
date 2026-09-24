<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TripController;
use App\Http\Controllers\StayController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\StayTransitionController;
use App\Http\Controllers\DayBlockController;
use App\Http\Controllers\DayPeriodController;
use App\Http\Controllers\Auth\SocialAuthController;
use App\Http\Controllers\Auth\LoginController;

Route::get('/login', [LoginController::class, 'create'])->name('login');

Route::get('/', function () {
    return redirect()->route('trips.index');
});

Route::get('/dashboard', function () {
    return redirect()->route('trips.index');
})->name('dashboard');

// ==========================================
// ROUTES VOYAGES & PARTAGE
// ==========================================
Route::resource('trips', TripController::class);

// Partage et rejoindre un voyage via le lien unique
Route::get('/trips/join/{share_token}', [TripController::class, 'join'])->name('trips.join');
Route::post('/trips/{trip}/share', [TripController::class, 'generateShareLink'])
    ->middleware('check.trip.access:share')
    ->name('trips.share');

// Routes protégées par la limite de 2 voyages pour les non-inscrits
Route::middleware(['check.trip.access:create_or_join'])->group(function () {
    // Si tu as une route spécifique de création ou de duplication, tu peux l'ajouter ici
});

// ==========================================
// ROUTES SÉJOURS & TRANSITIONS
// ==========================================
Route::post('/trips/{trip}/stays', [StayController::class, 'store'])->name('stays.store');
Route::put('/stays/{stay}', [StayController::class, 'update'])->name('stays.update');
Route::delete('/stays/{stay}', [StayController::class, 'destroy'])->name('stays.destroy');

Route::post('/trips/{trip}/transitions', [StayTransitionController::class, 'store'])->name('transitions.store');
Route::delete('/transitions/{transition}', [StayTransitionController::class, 'destroy'])->name('transitions.destroy');

// ==========================================
// ROUTES JOURNÉES, PERIODES & BLOCS
// ==========================================
Route::patch('/days/{day}/periods', [DayPeriodController::class, 'update'])->name('day-periods.update');

Route::post('/days/{day}/day-blocks', [DayBlockController::class, 'store'])->name('day-blocks.store');
Route::get('/day-blocks/{dayBlock}', [DayBlockController::class, 'show'])->name('day-blocks.show');
Route::patch('/day-blocks/{dayBlock}', [DayBlockController::class, 'update'])->name('day-blocks.update');
Route::delete('/day-blocks/{dayBlock}', [DayBlockController::class, 'destroy'])->name('day-blocks.destroy');

// ==========================================
// ROUTES ACTIVITÉS
// ==========================================
Route::post('/days/{day}/activities', [ActivityController::class, 'store'])->name('activities.store');
Route::patch('/activites/{activity}/period', [ActivityController::class, 'updatePeriod'])->name('activities.update-period');
Route::delete('/activities/{activity}', [ActivityController::class, 'destroy'])->name('activities.destroy');

// Redirection vers Google ou Facebook
Route::get('/auth/{provider}', [SocialAuthController::class, 'redirectToProvider'])
    ->whereIn('provider', ['google'])
    ->name('auth.social');

// Callback de retour après connexion
Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'handleProviderCallback'])
    ->whereIn('provider', ['google']);