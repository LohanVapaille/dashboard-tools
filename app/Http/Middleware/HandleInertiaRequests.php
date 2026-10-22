<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
            ],
            'legal' => fn () => [
                'company' => config('legal.company'),
                'consent_days' => config('legal.consent_days'),
                'affiliate_enabled' => (bool) config('flights.providers.travelpayouts.drive'),
            ],
            // Script d'affiliation Travelpayouts : chargé seulement après consentement, sur les pages à liens partenaires.
            'affiliate' => fn () => [
                'drive_script' => config('flights.providers.travelpayouts.drive') && ($marker = config('flights.providers.travelpayouts.marker'))
                    ? 'https://tpembars.com/' . base64_encode((string) $marker) . '.js?t=' . rawurlencode((string) $marker)
                    : null,
            ],
            'cart' => fn () => [
                'count' => $request->user()
                    ? \App\Models\FlightCartItem::active()->where('user_id', $request->user()->id)->count()
                        + \App\Models\StayCartItem::active()->where('user_id', $request->user()->id)->count()
                    : 0,
            ],
        ];
    }
}
