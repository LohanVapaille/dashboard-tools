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
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;


// Routes publiques d'authentification
Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('register', [RegisteredUserController::class, 'store']);

    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])->name('password.request');
    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])->name('password.reset');
    Route::post('reset-password', [NewPasswordController::class, 'store'])->name('password.store');
});

// Routes protégées
Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)->name('verification.notice');
    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)->middleware(['signed', 'throttle:6,1'])->name('verification.verify');
    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])->middleware('throttle:6,1')->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'create'])->name('password.confirm');
    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::put('password', [PasswordController::class, 'update'])->name('password.update');
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('/test-logout', function () {
        Auth::guard('web')->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return redirect('/login')->with('status', 'Session détruite avec succès !');
    });
});

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