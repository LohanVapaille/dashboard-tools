<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FlightOrder;
use App\Models\StayOrder;
use App\Models\SupportConversation;
use App\Models\Trip;
use App\Models\TripPhoto;
use App\Models\User;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $stripePremium = fn ($query) => $query->whereIn('subscription_status', ['active', 'trialing'])
            ->where(fn ($q) => $q->whereNull('subscription_ends_at')->orWhere('subscription_ends_at', '>', now()));

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                ['label' => 'Utilisateurs', 'value' => User::count(), 'hint' => '+' . User::where('created_at', '>=', now()->subDays(7))->count() . ' cette semaine', 'resource' => 'users', 'icon' => 'users'],
                ['label' => 'Premium', 'value' => User::where(fn ($q) => $q->where('premium_granted', true)->orWhere($stripePremium))->count(), 'hint' => User::where('premium_granted', true)->count() . ' offert(s) à la main', 'resource' => 'users', 'icon' => 'sparkles'],
                ['label' => 'Voyages', 'value' => Trip::count(), 'hint' => Trip::whereNull('user_id')->count() . ' créés par des invités', 'resource' => 'trips', 'icon' => 'map'],
                ['label' => 'Photos', 'value' => TripPhoto::count(), 'hint' => 'dans les albums', 'resource' => 'trip_photos', 'icon' => 'image'],
                ['label' => 'Assistance ouverte', 'value' => SupportConversation::where('status', 'open')->count(), 'hint' => SupportConversation::count() . ' conversations au total', 'resource' => 'support_conversations', 'icon' => 'headset'],
                ['label' => 'Commandes payées', 'value' => FlightOrder::whereNotNull('paid_at')->count() + StayOrder::whereNotNull('paid_at')->count(), 'hint' => 'vols et hébergements', 'resource' => 'flight_orders', 'icon' => 'ticket'],
            ],
            'recentUsers' => User::latest('id')->limit(6)->get(['id', 'name', 'email', 'created_at']),
            'recentTrips' => Trip::with('user:id,name')->latest('id')->limit(6)->get(['id', 'title', 'user_id', 'start_date', 'created_at']),
        ]);
    }
}
