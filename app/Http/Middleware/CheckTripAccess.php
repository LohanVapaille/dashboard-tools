<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Models\Trip;

class CheckTripAccess
{
    public function handle(Request $request, Closure $next, string $action = 'edit')
    {
        $user = $request->user();
        $guestToken = $request->cookie('guest_token');

        if (!$user && !$guestToken) {
            $guestToken = (string) Str::uuid();
            cookie()->queue('guest_token', $guestToken, 60 * 24 * 365);
        }

        $trip = $this->resolveTrip($request);

        if (!$trip) {
            return $next($request);
        }

        $allowed = match ($action) {
            'edit' => $trip->canEdit($user, $guestToken),
            'view_share_link' => $trip->canViewShareLink($user, $guestToken),
            'manage_access' => $trip->canManageAccess($user, $guestToken),
            'manage_roles' => $trip->canManageRoles($user, $guestToken),
            default => false,
        };

        if (!$allowed) {
            $message = match ($action) {
                'manage_roles' => "Seul le propriétaire peut gérer les rôles.",
                'manage_access' => "Seul le propriétaire ou un administrateur peut gérer les accès.",
                default => "Accès refusé : vous êtes en mode lecture seule.",
            };

            return response()->json(['message' => $message], 403);
        }

        return $next($request);
    }

    private function resolveTrip(Request $request): ?Trip
    {
        $trip = $request->route('trip');
        if ($trip instanceof Trip)
            return $trip;
        if (is_string($trip) || is_int($trip))
            return Trip::find($trip);

        foreach (['stay', 'day', 'activity', 'dayBlock', 'tripNote', 'transition'] as $param) {
            $model = $request->route($param);
            if (!$model)
                continue;

            return match ($param) {
                'stay' => $model->trip,
                'day' => $model->stay->trip,
                'activity' => $model->day->stay->trip,
                'dayBlock' => $model->day->stay->trip,
                'tripNote' => $model->trip,
                'transition' => $model->fromStay->trip ?? $model->trip,
            };
        }

        return null;
    }
}
