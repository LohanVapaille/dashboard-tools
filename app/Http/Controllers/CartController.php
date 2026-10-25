<?php

namespace App\Http\Controllers;

use App\Models\FlightCartItem;
use App\Models\StayCartItem;
use App\Services\Flights\FlightPricing;
use App\Services\Stays\StayPricing;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Panier unique, en deux parties payées séparément : vols et hébergements. */
class CartController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        [$givenName, $familyName] = array_pad(explode(' ', trim((string) $user->name), 2), 2, '');

        $flights = FlightCartItem::with('trip:id,title')
            ->where('user_id', $user->id)
            ->orderBy('trip_id')
            ->orderByRaw("CASE direction WHEN 'outbound' THEN 0 WHEN 'oneway' THEN 1 ELSE 2 END")
            ->get();
        $activeFlights = $flights->reject->isExpired();
        $flightsAmount = round((float) $activeFlights->sum('flight_amount'), 2);

        $stays = StayCartItem::with('trip:id,title')->where('user_id', $user->id)->orderBy('check_in')->get();
        $activeStays = $stays->reject->isExpired();
        $staysAmount = round((float) $activeStays->sum('stay_amount'), 2);

        return Inertia::render('Cart/Index', [
            'flights' => [
                'items' => $flights->map(fn (FlightCartItem $item) => [
                    'id' => $item->id,
                    'direction' => $item->direction,
                    'trip' => $item->trip ? ['id' => $item->trip->id, 'title' => $item->trip->title] : null,
                    'offer' => $item->offer,
                    'services' => $item->services ?? [],
                    'services_amount' => (float) $item->services_amount,
                    'flight_amount' => (float) $item->flight_amount,
                    'total_amount' => FlightPricing::total((float) $item->flight_amount),
                    'expires_at' => $item->expires_at?->toIso8601String(),
                    'expired' => $item->isExpired(),
                ])->values(),
                'summary' => [
                    'currency' => $activeFlights->first()?->currency ?? 'EUR',
                    'passengers_count' => (int) ($activeFlights->first()?->passengers_count ?? 1),
                    ...FlightPricing::breakdown($flightsAmount),
                    'fee_label' => config('flights.tax_label'),
                ],
            ],
            'stays' => [
                'items' => $stays->map(fn (StayCartItem $item) => [
                    'id' => $item->id,
                    'trip' => $item->trip ? ['id' => $item->trip->id, 'title' => $item->trip->title] : null,
                    'property' => $item->property,
                    'room' => $item->room,
                    'rate' => $item->rate,
                    'check_in' => $item->check_in->toDateString(),
                    'check_out' => $item->check_out->toDateString(),
                    'nights' => $item->nights(),
                    'guests' => $item->guests,
                    'rooms' => $item->rooms,
                    'stay_amount' => (float) $item->stay_amount,
                    'total_amount' => StayPricing::total((float) $item->stay_amount),
                    'currency' => $item->currency,
                    'expires_at' => $item->expires_at?->toIso8601String(),
                    'expired' => $item->isExpired(),
                ])->values(),
                'summary' => [
                    'currency' => $activeStays->first()?->currency ?? 'EUR',
                    'guests_count' => (int) ($activeStays->max('guests') ?? 1),
                    'provider_amount' => $staysAmount,
                    'fee_percent' => StayPricing::percent(),
                    'fee_amount' => round($activeStays->sum(fn ($item) => StayPricing::fee((float) $item->stay_amount)), 2),
                    'total_amount' => round($staysAmount + $activeStays->sum(fn ($item) => StayPricing::fee((float) $item->stay_amount)), 2),
                    'fee_label' => config('stays.commission_label'),
                ],
            ],
            'defaults' => [
                'given_name' => $givenName,
                'family_name' => $familyName,
                'email' => $user->email,
            ],
            'seller' => config('flights.seller'),
            'cancelled' => $request->boolean('cancelled'),
            'section' => $request->query('section') === 'stays' ? 'stays' : 'flights',
        ]);
    }

    public function clear(Request $request)
    {
        $section = $request->query('section');
        if ($section !== 'stays') {
            FlightCartItem::where('user_id', $request->user()->id)->delete();
        }
        if ($section !== 'flights') {
            StayCartItem::where('user_id', $request->user()->id)->delete();
        }

        return back()->with('status', 'Panier vidé.');
    }
}
