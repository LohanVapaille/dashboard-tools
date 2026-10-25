<?php

namespace App\Http\Middleware;

use App\Admin\AdminResources;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Back-office : session ouverte avec ADMIN_USERNAME / ADMIN_PASSWORD. */
class EnsureBackofficeAdmin
{
    public const SESSION_KEY = 'backoffice.admin';

    public static function check(Request $request): bool
    {
        return $request->session()->get(self::SESSION_KEY) === true;
    }

    public function handle(Request $request, Closure $next)
    {
        if (!self::check($request)) {
            return $request->expectsJson() && !$request->header('X-Inertia')
                ? response()->json(['message' => 'Session administrateur expirée : reconnectez-vous.'], 401)
                : redirect()->guest(route('admin.login'));
        }

        Inertia::share('admin', fn () => ['nav' => AdminResources::nav()]);

        return $next($request);
    }
}
