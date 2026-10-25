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
                'support_agent' => (bool) $request->user()?->isSupportAgent(),
            ],
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
            ],
            'legal' => fn () => [
                'company' => config('legal.company'),
                'consent_days' => config('legal.consent_days'),
                'affiliate_enabled' => (bool) config('flights.providers.travelpayouts.drive') || (bool) config('commerce.activities.getyourguide_partner_id'),
            ],
            // Script d'affiliation Travelpayouts : chargé seulement après consentement, sur les pages à liens partenaires.
            'affiliate' => fn () => [
                'marker' => config('flights.providers.travelpayouts.marker'),
                'project_id' => config('flights.providers.travelpayouts.project_id'),
                // Le script Drive est propre au projet Travelpayouts (et non au Partner ID).
                'drive_script' => config('flights.providers.travelpayouts.drive')
                    && ($project = config('flights.providers.travelpayouts.project_id') ?: config('flights.providers.travelpayouts.marker'))
                    ? 'https://tpembars.com/' . base64_encode((string) $project) . '.js?t=' . rawurlencode((string) $project)
                    : null,
            ],
            'commerce' => fn () => [
                'direct_booking' => (bool) config('commerce.direct_booking'),
                // Hôtels : cart (panier Stripe), embedded (paiement Nuitée dans la page) ou null (liens partenaires).
                'stay_checkout' => app(\App\Services\Stays\StayProviders::class)->checkoutMode(),
                'activities' => array_filter(config('commerce.activities', [])),
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
