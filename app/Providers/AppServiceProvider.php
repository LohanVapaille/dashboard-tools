<?php

namespace App\Providers;

use App\Models\Trip;
use App\Policies\TripPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // En production, tous les liens générés (e-mails, redirections Stripe, partage) sont en HTTPS.
        if ($this->app->isProduction()) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }

        Gate::policy(Trip::class, TripPolicy::class);

        RateLimiter::for('ai-itinerary', function (Request $request) {
            $user = $request->user();
            $identity = $user?->getAuthIdentifier() ?? $request->ip();

            return [
                Limit::perMinute((int) config('services.gemini.rate_limit_per_minute', 2))
                    ->by('ai-minute:' . $identity),
                Limit::perDay($user?->hasPremiumAccess()
                    ? (int) config('services.gemini.premium_daily_limit', 1000)
                    : (int) config('services.gemini.free_daily_limit', 3))
                    ->by('ai-day:' . $identity),
            ];
        });
    }
}