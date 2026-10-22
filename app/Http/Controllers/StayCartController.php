<?php

namespace App\Http\Controllers;

use App\Models\StayCartItem;
use App\Models\Trip;
use App\Services\Flights\FlightProviderException;
use App\Services\Stays\StayProviders;
use App\Services\Stays\StaySearchQuery;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class StayCartController extends Controller
{
    public function store(Request $request, StayProviders $providers)
    {
        $validated = $request->validate([
            'trip_id' => ['required', 'integer', 'exists:trips,id'],
            'search_result_id' => ['required', 'string', 'max:120', 'regex:/^(srr|lite)_[A-Za-z0-9_-]+$/'],
            'rate_id' => ['required', 'string', 'max:120'],
            'context' => ['nullable', 'array'],
            'context.latitude' => ['required_with:context', 'numeric', 'between:-90,90'],
            'context.longitude' => ['required_with:context', 'numeric', 'between:-180,180'],
            'context.check_in' => ['required_with:context', 'date_format:Y-m-d', 'after_or_equal:today'],
            'context.check_out' => ['required_with:context', 'date_format:Y-m-d', 'after:context.check_in'],
            'context.adults' => ['required_with:context', 'integer', 'min:1', 'max:' . config('stays.max_guests')],
            'context.rooms' => ['required_with:context', 'integer', 'min:1', 'max:' . config('stays.max_rooms')],
        ]);

        $trip = Trip::findOrFail($validated['trip_id']);
        Gate::authorize('view', $trip);
        $user = $request->user();
        $context = isset($validated['context']) ? new StaySearchQuery(
            (float) $validated['context']['latitude'],
            (float) $validated['context']['longitude'],
            $validated['context']['check_in'],
            $validated['context']['check_out'],
            (int) $validated['context']['adults'],
            (int) $validated['context']['rooms'],
        ) : null;

        try {
            // Tarifs à jour puis blocage du prix : garantit la disponibilité et le montant.
            $provider = $providers->forProperty($validated['search_result_id']);
            $details = $provider->rates($validated['search_result_id'], $context);
            $room = collect($details['rooms'])->first(fn ($room) => collect($room['rates'])->contains('id', $validated['rate_id']));
            $rate = $room ? collect($room['rates'])->firstWhere('id', $validated['rate_id']) : null;
            if (!$rate) {
                throw new FlightProviderException('Cette chambre n’est plus disponible. Choisissez une autre offre.');
            }
            $quote = $provider->quote($rate);
        } catch (FlightProviderException $exception) {
            throw ValidationException::withMessages(['cart' => $exception->getMessage()]);
        }

        $property = $details['property'];
        if (StayCartItem::active()->where('user_id', $user->id)->where('currency', '!=', $quote['currency'])->exists()) {
            throw ValidationException::withMessages(['cart' => 'Votre panier contient des hébergements dans une autre devise. Finalisez-les avant d’ajouter celui-ci.']);
        }

        $item = StayCartItem::updateOrCreate(
            ['user_id' => $user->id, 'rate_id' => $rate['id']],
            [
                'trip_id' => $trip->id,
                'provider' => $provider->key(),
                'search_result_id' => $validated['search_result_id'],
                'quote_id' => $quote['id'],
                'check_in' => $property['check_in_date'],
                'check_out' => $property['check_out_date'],
                'guests' => $quote['guests'],
                'rooms' => $quote['rooms'],
                'currency' => $quote['currency'],
                'stay_amount' => $quote['amount'],
                'property' => collect($property)->except(['price', 'links'])->all(),
                'room' => collect($room)->except('rates')->all(),
                'rate' => $rate,
                'expires_at' => collect([
                    now()->addMinutes((int) config('stays.cart_ttl_minutes', 30)),
                    !empty($rate['expires_at']) ? Carbon::parse($rate['expires_at']) : null,
                ])->filter()->min(),
            ],
        );

        return response()->json([
            'count' => StayCartItem::active()->where('user_id', $user->id)->count(),
            'item_id' => $item->id,
            'price_changed' => abs($quote['amount'] - (float) $rate['provider_amount']) >= 0.01,
        ]);
    }

    public function destroy(Request $request, StayCartItem $item)
    {
        abort_unless((int) $item->user_id === (int) $request->user()->id, 404);
        $item->delete();

        return back()->with('status', 'Hébergement retiré du panier.');
    }
}
