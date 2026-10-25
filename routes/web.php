<?php
// routes/web.php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TripController;
use App\Http\Controllers\StayController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\StayTransitionController;
use App\Http\Controllers\DayBlockController;
use App\Http\Controllers\DayPeriodController;
use App\Http\Controllers\TripNoteController;
use App\Http\Controllers\TripReservationController;
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
use App\Http\Controllers\AIItineraryController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\TripPhotoController;
use App\Http\Controllers\TripTabController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\TravelSearchController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\FlightCartController;
use App\Http\Controllers\StayCartController;
use App\Http\Controllers\StayCheckoutController;
use App\Http\Controllers\StayEmbeddedCheckoutController;
use App\Http\Controllers\StayOrderController;
use App\Http\Controllers\StaySearchController;
use App\Http\Controllers\PlaceSuggestionController;
use App\Http\Controllers\FlightCheckoutController;
use App\Http\Controllers\FlightOrderController;

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


    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->middleware('throttle:10,1')->name('profile.avatar.update');
    Route::delete('/profile/avatar', [ProfileController::class, 'destroyAvatar'])->name('profile.avatar.destroy');

    Route::delete('/trips/{trip}/leave', [TripController::class, 'leave'])->name('trips.leave');
    Route::patch('/trips/{trip}/tabs', [TripTabController::class, 'update'])->name('trips.tabs.update');

    // Panier et achat de billets d'avion
    Route::get('/panier', [CartController::class, 'index'])->middleware('direct.booking')->name('flights.cart.index');
    Route::post('/panier/vols', [FlightCartController::class, 'store'])->middleware('throttle:20,1')->middleware('direct.booking')->name('flights.cart.store');
    Route::delete('/panier/vols/{item}', [FlightCartController::class, 'destroy'])->middleware('direct.booking')->name('flights.cart.destroy');
    Route::delete('/panier', [CartController::class, 'clear'])->middleware('direct.booking')->name('flights.cart.clear');
    Route::post('/panier/paiement', [FlightCheckoutController::class, 'store'])->middleware('throttle:10,1')->middleware('direct.booking')->name('flights.checkout.store');
    Route::get('/reservations/{order}/paiement-confirme', [FlightCheckoutController::class, 'success'])->name('flights.checkout.success');

    // Hébergements : panier et paiement distincts des vols
    Route::post('/panier/logements', [StayCartController::class, 'store'])->middleware('throttle:20,1')->middleware('direct.booking')->name('stays.cart.store');
    Route::delete('/panier/logements/{item}', [StayCartController::class, 'destroy'])->middleware('direct.booking')->name('stays.cart.destroy');
    Route::post('/panier/logements/paiement', [StayCheckoutController::class, 'store'])->middleware('throttle:10,1')->middleware('direct.booking')->name('stays.checkout.store');
    Route::get('/reservations/logements/{order}', [StayOrderController::class, 'show'])->name('stays.orders.show');
    // Mode partenaires : réservation d'hôtel payée dans le module Nuitée intégré (Nuitée encaisse).
    Route::post('/logements/reservation', [StayEmbeddedCheckoutController::class, 'start'])->middleware('throttle:10,1')->name('stays.embedded.start');
    Route::get('/reservations/logements/{order}/confirmation-hotel', [StayEmbeddedCheckoutController::class, 'complete'])->name('stays.embedded.complete');
    Route::get('/reservations/logements/{order}/statut', [StayOrderController::class, 'status'])->name('stays.orders.status');
    Route::get('/reservations/logements/{order}/paiement-confirme', [StayCheckoutController::class, 'success'])->name('stays.checkout.success');
    Route::post('/reservations/logements/{order}/sejours/{booking}/annulation', [StayOrderController::class, 'cancel'])->name('stays.bookings.cancel');

    Route::get('/reservations', [FlightOrderController::class, 'index'])->name('flights.orders.index');
    Route::get('/reservations/{order}', [FlightOrderController::class, 'show'])->name('flights.orders.show');
    Route::get('/reservations/{order}/statut', [FlightOrderController::class, 'status'])->name('flights.orders.status');
    Route::post('/reservations/{order}/billets/{booking}/devis-annulation', [FlightOrderController::class, 'cancellationQuote'])->middleware('throttle:10,1')->name('flights.bookings.cancellation-quote');
    Route::post('/reservations/{order}/billets/{booking}/annulation', [FlightOrderController::class, 'cancel'])->name('flights.bookings.cancel');
    Route::post('/reservations/{order}/billets/{booking}/remboursement-taxes', [FlightOrderController::class, 'requestTaxRefund'])->name('flights.bookings.tax-refund');

    Route::get('/premium', [SubscriptionController::class, 'show'])->name('billing.show');
    Route::post('/premium/checkout', [SubscriptionController::class, 'checkout'])->name('billing.checkout');
    Route::get('/premium/success', [SubscriptionController::class, 'success'])->name('billing.success');
});

Route::post('/stripe/webhook', [SubscriptionController::class, 'webhook'])->name('stripe.webhook');
Route::post('/stripe/flights/webhook', [FlightCheckoutController::class, 'webhook'])->name('stripe.flights.webhook');

// Recherche de vols : accessible aussi aux invités d'un voyage
Route::get('/flights/airports', [TravelSearchController::class, 'airports'])->middleware('throttle:120,1')->name('flights.airports');
Route::get('/flights/offers/{offerId}/baggage', [FlightCartController::class, 'baggage'])->middleware('throttle:30,1')->name('flights.offers.baggage');
Route::get('/flights/airports/nearest',[TravelSearchController::class, 'nearestAirports'])->middleware('throttle:30,1')->name('flights.airports.nearest');
Route::post('/trips/{trip}/stays-search', [StaySearchController::class, 'search'])->middleware('throttle:20,1')->name('trips.stays.search');
Route::post('/trips/{trip}/stays-listings', [StaySearchController::class, 'listings'])->middleware('throttle:20,1')->name('trips.stays.listings');
Route::get('/stays/photos/{hotelId}', [StaySearchController::class, 'photos'])->middleware('throttle:60,1')->name('stays.photos');
Route::get('/stays/results/{searchResultId}/rates', [StaySearchController::class, 'rates'])->middleware('throttle:30,1')->name('stays.rates');
Route::post('/trips/{trip}/travel-search/flights', [TravelSearchController::class, 'flights'])->middleware('throttle:20,1')->name('trips.travel-search.flights');
Route::get('/conditions-generales', fn () => config('commerce.direct_booking') ? Inertia\Inertia::render('Legal/Terms', [
    'seller' => config('flights.seller'),
    'flightFeePercent' => App\Services\Flights\FlightPricing::percent(),
    'flightFeeLabel' => config('flights.tax_label'),
    'stayFeePercent' => App\Services\Stays\StayPricing::percent(),
    'stayFeeLabel' => config('stays.commission_label'),
    'guestTripLimit' => TripController::GUEST_TRIP_LIMIT,
]) : Inertia\Inertia::render('Legal/PartnerTerms', [
    'seller' => config('flights.seller'),
    'guestTripLimit' => TripController::GUEST_TRIP_LIMIT,
    'premiumPrice' => '5 € par mois',
    'embeddedHotels' => app(App\Services\Stays\StayProviders::class)->checkoutMode() === 'embedded',
]))->name('legal.terms');
Route::get('/mentions-legales', fn () => Inertia\Inertia::render('Legal/Notice', [
    'legal' => config('legal'),
    'directBooking' => (bool) config('commerce.direct_booking'),
    'appUrl' => config('app.url'),
]))->name('legal.notice');
Route::get('/confidentialite', fn () => Inertia\Inertia::render('Legal/Privacy', [
    'legal' => config('legal'),
    'sessionCookie' => config('session.cookie'),
    'sessionMinutes' => (int) config('session.lifetime'),
    'affiliateEnabled' => (bool) config('flights.providers.travelpayouts.drive'),
    'activitiesWidget' => (bool) config('commerce.activities.getyourguide_partner_id'),
    'embeddedHotels' => app(App\Services\Stays\StayProviders::class)->checkoutMode() === 'embedded',
]))->name('legal.privacy');
// Ancienne adresse conservée pour les liens déjà envoyés (e-mails de confirmation).
Route::redirect('/conditions-de-vente-vols', '/conditions-generales', 301)->name('flights.terms');

Route::get('/', fn() => redirect()->route('trips.index'));
Route::get('/dashboard', fn() => redirect()->route('trips.index'))->name('dashboard');

// Lien de partage : la page n'a aucun effet, on rejoint en validant le formulaire (avec pseudo si invité).
Route::post('/liens-partenaires', App\Http\Controllers\PartnerLinkController::class)->middleware('throttle:60,1')->name('partners.link');
// Chat d'assistance : clients (compte ou invité) et boîte de réception de l'équipe.
Route::prefix('assistance')->name('support.')->group(function () {
    Route::get('/conversation', [App\Http\Controllers\SupportChatController::class, 'current'])->name('current');
    Route::post('/conversation', [App\Http\Controllers\SupportChatController::class, 'start'])->middleware('throttle:5,1')->name('start');
    Route::get('/conversation/{conversation}', [App\Http\Controllers\SupportChatController::class, 'show'])->name('show');
    Route::post('/conversation/{conversation}/messages', [App\Http\Controllers\SupportChatController::class, 'send'])->middleware('throttle:30,1')->name('send');
    Route::post('/conversation/{conversation}/close', [App\Http\Controllers\SupportChatController::class, 'close'])->name('close');
});
// Accès vérifié dans le contrôleur : agent connecté (SUPPORT_ADMIN_EMAILS) ou session du back-office.
Route::prefix('admin/assistance')->name('admin.support.')->group(function () {
    Route::get('/', [App\Http\Controllers\Admin\SupportInboxController::class, 'index'])->name('index');
    Route::get('/conversations', [App\Http\Controllers\Admin\SupportInboxController::class, 'conversations'])->name('conversations');
    Route::get('/conversations/{conversation}', [App\Http\Controllers\Admin\SupportInboxController::class, 'show'])->name('show');
    Route::post('/conversations/{conversation}/reply', [App\Http\Controllers\Admin\SupportInboxController::class, 'reply'])->name('reply');
    Route::post('/conversations/{conversation}/status', [App\Http\Controllers\Admin\SupportInboxController::class, 'status'])->name('status');
});

// Back-office : identifiants ADMIN_USERNAME / ADMIN_PASSWORD du .env, indépendants des comptes du site.
Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/connexion', [App\Http\Controllers\Admin\AuthController::class, 'create'])->name('login');
    Route::post('/connexion', [App\Http\Controllers\Admin\AuthController::class, 'store'])->middleware('throttle:5,1')->name('login.store');
    Route::post('/deconnexion', [App\Http\Controllers\Admin\AuthController::class, 'destroy'])->name('logout');

    Route::middleware('backoffice')->group(function () {
        Route::get('/', App\Http\Controllers\Admin\DashboardController::class)->name('dashboard');
        Route::controller(App\Http\Controllers\Admin\ResourceController::class)->prefix('{resource}')->name('resources.')
            ->where(['resource' => '[a-z_]+', 'id' => '[0-9]+'])->group(function () {
                Route::get('/', 'index')->name('index');
                Route::get('/creer', 'create')->name('create');
                Route::post('/', 'store')->name('store');
                Route::get('/recherche', 'lookup')->name('lookup');
                Route::get('/{id}', 'edit')->name('edit');
                Route::put('/{id}', 'update')->name('update');
                Route::delete('/{id}', 'destroy')->name('destroy');
                Route::patch('/{id}/basculer', 'toggle')->name('toggle');
            });
    });
});

Route::get('/lieux/grandes-villes', [PlaceSuggestionController::class, 'cities'])->middleware('throttle:60,1')->name('places.cities');

Route::get('/rejoindre/{token}', [TripInviteController::class, 'show'])->name('trips.join');
Route::post('/rejoindre/{token}', [TripInviteController::class, 'join'])->middleware('throttle:10,1')->name('trips.join.store');
// Anciens liens déjà partagés
Route::get('/trips/join/{token}', fn (string $token) => redirect()->route('trips.join', $token));
Route::get('/invite/{token}', fn (string $token) => redirect()->route('trips.join', $token))->name('trips.invite.show');

Route::resource('trips', TripController::class);
Route::get('/trips/{trip}/budget', [BudgetController::class, 'show'])->name('trips.budget.show');
Route::get('/trips/{trip}/carnet', [TripController::class, 'printable'])->name('trips.print');
// Album : hors du groupe auth pour renvoyer un message clair aux invités (compte requis pour l'envoi).
Route::post('/trips/{trip}/photos', [TripPhotoController::class, 'store'])->middleware('throttle:60,1')->name('trips.photos.store');
Route::delete('/trip-photos/{photo}', [TripPhotoController::class, 'destroy'])->name('trips.photos.destroy');

// Édition d'itinéraire — admin/editor/owner uniquement, appliqué une seule fois
Route::middleware('check.trip.access:edit')->group(function () {
    Route::post('/trips/{trip}/ai-itinerary/generate', [AIItineraryController::class, 'generate'])
        ->middleware(['auth', 'throttle:ai-itinerary'])->name('trips.ai-itinerary.generate');
    Route::post('/trips/{trip}/ai-itinerary/store', [AIItineraryController::class, 'store'])
        ->middleware(['auth', 'throttle:30,1'])->name('trips.ai-itinerary.store');
    Route::patch('/trips/{trip}/budget/target', [BudgetController::class, 'updateTarget'])->name('trips.budget.target');
    Route::patch('/trips/{trip}/budget/planned', [BudgetController::class, 'updatePlanned'])->name('trips.budget.planned');
    Route::post('/trips/{trip}/budget/lines', [BudgetController::class, 'storeLine'])->name('trips.budget.lines.store');
    Route::post('/trips/{trip}/budget/lines/hide', [BudgetController::class, 'hideLine'])->name('trips.budget.lines.hide');
    Route::post('/trips/{trip}/budget/lines/restore', [BudgetController::class, 'restoreLines'])->name('trips.budget.lines.restore');
    Route::post('/trips/{trip}/budget/members', [BudgetController::class, 'storeMember'])->name('trips.budget.members.store');
    Route::patch('/trips/{trip}/budget/members/{member}', [BudgetController::class, 'updateMember'])->name('trips.budget.members.update');
    Route::delete('/trips/{trip}/budget/members/{member}', [BudgetController::class, 'destroyMember'])->name('trips.budget.members.destroy');
    Route::post('/trips/{trip}/expenses', [BudgetController::class, 'storeExpense'])->name('trips.expenses.store');
    Route::put('/trips/{trip}/expenses/{expense}', [BudgetController::class, 'updateExpense'])->name('trips.expenses.update');
    Route::delete('/trips/{trip}/expenses/{expense}', [BudgetController::class, 'destroyExpense'])->name('trips.expenses.destroy');

    Route::post('/trips/{trip}/notes', [TripNoteController::class, 'store'])->name('trip-notes.store');
    Route::patch('/trip-notes/{tripNote}', [TripNoteController::class, 'update'])->name('trip-notes.update');
    Route::delete('/trip-notes/{tripNote}', [TripNoteController::class, 'destroy'])->name('trip-notes.destroy');

    Route::post('/trips/{trip}/reservations', [TripReservationController::class, 'store'])->middleware('throttle:60,1')->name('trips.reservations.store');
    Route::put('/trips/{trip}/reservations/{reservation}', [TripReservationController::class, 'update'])->scopeBindings()->name('trips.reservations.update');
    Route::delete('/trips/{trip}/reservations/{reservation}', [TripReservationController::class, 'destroy'])->scopeBindings()->name('trips.reservations.destroy');

    Route::post('/trips/{trip}/stays', [StayController::class, 'store'])->name('stays.store');
    Route::put('/stays/{stay}', [StayController::class, 'update'])->name('stays.update');
    Route::delete('/stays/{stay}', [StayController::class, 'destroy'])->name('stays.destroy');

    Route::post('/trips/{trip}/transitions', [StayTransitionController::class, 'store'])->name('transitions.store');
    Route::put('/transitions/{transition}', [StayTransitionController::class, 'update'])->name('transitions.update');
    Route::delete('/transitions/{transition}', [StayTransitionController::class, 'destroy'])->name('transitions.destroy');

    Route::patch('/days/{day}/periods', [DayPeriodController::class, 'update'])->name('day-periods.update');
    Route::post('/days/{day}/day-blocks', [DayBlockController::class, 'store'])->name('day-blocks.store');
    Route::patch('/day-blocks/{dayBlock}', [DayBlockController::class, 'update'])->name('day-blocks.update');
    Route::delete('/day-blocks/{dayBlock}', [DayBlockController::class, 'destroy'])->name('day-blocks.destroy');

    Route::post('/days/{day}/activities', [ActivityController::class, 'store'])->name('activities.store');
    Route::put('/activities/{activity}', [ActivityController::class, 'update'])->name('activities.update');
    Route::patch('/activities/{activity}', [ActivityController::class, 'update']);
    Route::patch('/activites/{activity}/period', [ActivityController::class, 'updatePeriod'])->name('activities.update-period');
    Route::delete('/activities/{activity}', [ActivityController::class, 'destroy'])->name('activities.destroy');
    Route::delete('/trips/{trip}/activities', [ActivityController::class, 'destroyAll'])->name('trips.activities.destroy-all');
});


Route::get('/auth/{provider}', [SocialAuthController::class, 'redirectToProvider'])
    ->whereIn('provider', ['google'])->name('auth.social');
Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'handleProviderCallback'])
    ->whereIn('provider', ['google']);
