<?php

namespace App\Policies;

use App\Models\Trip;
use App\Models\User;

class TripPolicy
{
    public function view(?User $user, Trip $trip): bool
    {
        return $trip->canView($user, request()->cookie('guest_token'));
    }

    public function update(?User $user, Trip $trip): bool
    {
        return $trip->canEdit($user, request()->cookie('guest_token'));
    }

    public function viewShareLink(?User $user, Trip $trip): bool
    {
        return $trip->canViewShareLink($user, request()->cookie('guest_token'));
    }

    public function manageAccess(?User $user, Trip $trip): bool
    {
        return $trip->canManageAccess($user, request()->cookie('guest_token'));
    }

    public function manageRoles(?User $user, Trip $trip): bool
    {
        return $trip->canManageRoles($user, request()->cookie('guest_token'));
    }

    public function delete(?User $user, Trip $trip): bool
    {
        return $trip->isOwner($user, request()->cookie('guest_token'));
    }
}