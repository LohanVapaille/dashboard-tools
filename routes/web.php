<?php
// routes/web.php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TripController;
use App\Http\Controllers\StayController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\StayTransitionController;
use App\Http\Controllers\DayBlockController;
use App\Http\Controllers\DayPeriodController;
use App\Http\Controllers\Auth\SocialAuthController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\TripMemberController;
use App\Http\Controllers\TripInviteController;
use App\Http\Controllers\ProfileController;

Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('register', [RegisteredUserController::class, 'store']);
    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);
    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])->name('password.request');
    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])->name('password.email');
    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])->name('password.reset');
    Route::post('reset-password', [NewPasswordController::class, 'store'])->name('password.store');

    Route::get('/invite/{token}', [TripInviteController::class, 'show'])->name('trips.invite.show');
    Route::post('/invite/{token}/guest', [TripInviteController::class, 'joinAsGuest'])->name('trips.invite.guest');
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)->name('verification.notice');
    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)->middleware(['signed', 'throttle:6,1'])->name('verification.verify');
    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])->middleware('throttle:6,1')->name('verification.send');
    Route::get('confirm-password', [ConfirmablePasswordController::class, 'create'])->name('password.confirm');
    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);
    Route::put('password', [PasswordController::class, 'update'])->name('password.update');
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('/logout', function () {
        Auth::guard('web')->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();
        return redirect('/login');
    });

    // Lien de partage seul (copier/coller) : owner, admin, editor
    Route::get('/trips/{trip}/share-link', [TripController::class, 'shareLink'])
        ->middleware('check.trip.access:view_share_link')->name('trips.share-link');

    // Liste des membres + invitation : owner, admin
    Route::get('/trips/{trip}/members', [TripMemberController::class, 'index'])
        ->middleware('check.trip.access:manage_access')->name('trips.members');
    Route::post('/trips/{trip}/members', [TripMemberController::class, 'store'])
        ->middleware('check.trip.access:manage_access')->name('trips.members.store');

    // Changement de rôle / révocation : owner uniquement
    Route::patch('/trips/{trip}/members/{member}', [TripMemberController::class, 'update'])
        ->middleware('check.trip.access:manage_roles')->name('trips.members.update');
    Route::delete('/trips/{trip}/members/{member}', [TripMemberController::class, 'destroy'])
        ->middleware('check.trip.access:manage_roles')->name('trips.members.remove');

    // Régénération du token de partage : owner, admin
    Route::post('/trips/{trip}/share', [TripController::class, 'generateShareLink'])
        ->middleware('check.trip.access:manage_access')->name('trips.share');

    Route::post('/invite/{token}/join', [TripInviteController::class, 'joinAsUser'])->name('trips.invite.join');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::delete('/trips/{trip}/leave', [TripController::class, 'leave'])->name('trips.leave');
});

Route::get('/', fn() => redirect()->route('trips.index'));
Route::get('/dashboard', fn() => redirect()->route('trips.index'))->name('dashboard');

Route::get('/trips/join/{share_token}', [TripController::class, 'join'])->name('trips.join');

Route::resource('trips', TripController::class);

// Édition d'itinéraire — admin/editor/owner uniquement, appliqué une seule fois
Route::middleware('check.trip.access:edit')->group(function () {
    Route::post('/trips/{trip}/stays', [StayController::class, 'store'])->name('stays.store');
    Route::put('/stays/{stay}', [StayController::class, 'update'])->name('stays.update');
    Route::delete('/stays/{stay}', [StayController::class, 'destroy'])->name('stays.destroy');

    Route::post('/trips/{trip}/transitions', [StayTransitionController::class, 'store'])->name('transitions.store');
    Route::delete('/transitions/{transition}', [StayTransitionController::class, 'destroy'])->name('transitions.destroy');

    Route::patch('/days/{day}/periods', [DayPeriodController::class, 'update'])->name('day-periods.update');
    Route::post('/days/{day}/day-blocks', [DayBlockController::class, 'store'])->name('day-blocks.store');
    Route::patch('/day-blocks/{dayBlock}', [DayBlockController::class, 'update'])->name('day-blocks.update');
    Route::delete('/day-blocks/{dayBlock}', [DayBlockController::class, 'destroy'])->name('day-blocks.destroy');

    Route::post('/days/{day}/activities', [ActivityController::class, 'store'])->name('activities.store');
    Route::patch('/activites/{activity}/period', [ActivityController::class, 'updatePeriod'])->name('activities.update-period');
    Route::delete('/activities/{activity}', [ActivityController::class, 'destroy'])->name('activities.destroy');
});

Route::get('/day-blocks/{dayBlock}', [DayBlockController::class, 'show'])->name('day-blocks.show');

Route::get('/auth/{provider}', [SocialAuthController::class, 'redirectToProvider'])
    ->whereIn('provider', ['google'])->name('auth.social');
Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'handleProviderCallback'])
    ->whereIn('provider', ['google']);