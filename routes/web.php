<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TripController;
use App\Http\Controllers\StayController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\StayTransitionController;
use App\Http\Controllers\DayBlockController;
use App\Http\Controllers\DayPeriodController;

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

// Routes Blocs de Jour
Route::post('/days/{day}/day-blocks', [DayBlockController::class, 'store'])->name('day-blocks.store');
Route::patch('/day-blocks/{dayBlock}', [DayBlockController::class, 'update'])->name('day-blocks.update');
Route::delete('/day-blocks/{dayBlock}', [DayBlockController::class, 'destroy'])->name('day-blocks.destroy');

// Routes pour afficher un bloc de jour spécifique (optionnel)
Route::get('/day-blocks/{dayBlock}', [DayBlockController::class, 'show'])->name('day-blocks.show');



Route::post('/days/{day}/blocks', [DayBlockController::class, 'store'])->name('day-blocks.store');
Route::patch('/day-blocks/{dayBlock}', [DayBlockController::class, 'update'])->name('day-blocks.update');
Route::delete('/day-blocks/{dayBlock}', [DayBlockController::class, 'destroy'])->name('day-blocks.destroy');
Route::patch('/days/{day}/periods', [DayPeriodController::class, 'update'])->name('day-periods.update');
Route::put('/stays/{stay}', [StayController::class, 'update'])->name('stays.update');
Route::patch('/activites/{activity}/period', [ActivityController::class, 'updatePeriod'])->name('activities.update-period');