<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\TripReservation;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TripReservationController extends Controller
{
    public function store(Request $request, Trip $trip)
    {
        $reservation = $trip->reservations()->create($this->validated($request) + ['user_id' => $request->user()?->id]);

        return response()->json(['reservation' => $reservation], 201);
    }

    public function update(Request $request, Trip $trip, TripReservation $reservation)
    {
        $reservation->update($this->validated($request));

        return response()->json(['reservation' => $reservation]);
    }

    public function destroy(Trip $trip, TripReservation $reservation)
    {
        $reservation->delete();

        return response()->json(['deleted' => true]);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in(TripReservation::KINDS)],
            'title' => ['required', 'string', 'max:255'],
            'provider' => ['nullable', 'string', 'max:80'],
            'reference' => ['nullable', 'string', 'max:120'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'origin' => ['nullable', 'string', 'max:255'],
            'destination' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'travelers' => ['nullable', 'integer', 'min:1', 'max:99'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'currency' => ['nullable', 'string', 'size:3'],
            'url' => ['nullable', 'url:http,https', 'max:2048'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'details' => ['nullable', 'array'],
        ]);

        $data['currency'] = strtoupper($data['currency'] ?? 'EUR');

        return $data;
    }
}
