<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TripController;
use App\Http\Controllers\StayController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\StayTransitionController;

Route::get('/', function () {
    return redirect()->route('trips.index');
});

Route::get('/dashboard', function () {
    return redirect()->route('trips.index');
})->name('dashboard');

// Routes Voyages
Route::resource('trips', TripController::class);

// Routes Séjours
Route::post('/trips/{trip}/stays', [StayController::class, 'store'])->name('stays.store');
Route::delete('/stays/{stay}', [StayController::class, 'destroy'])->name('stays.destroy');

// Routes Activités
Route::post('/days/{day}/activities', [ActivityController::class, 'store'])->name('activities.store');
Route::delete('/activities/{activity}', [ActivityController::class, 'destroy'])->name('activities.destroy');

// Routes Transitions
Route::post('/trips/{trip}/transitions', [StayTransitionController::class, 'store'])->name('transitions.store');
Route::delete('/transitions/{transition}', [StayTransitionController::class, 'destroy'])->name('transitions.destroy');

