<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Flights\FlightPricing;
use App\Services\Flights\Providers\DuffelProvider;
use App\Services\Stays\StayPricing;
use App\Services\Stays\StayProviders;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Modèle par défaut : les partenaires vendent, le site ne vend ni n'encaisse rien. */
class PartnerModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_cart_and_checkout_are_closed(): void
    {
        $user = User::factory()->create();

        foreach (['flights.cart.store', 'stays.cart.store', 'flights.checkout.store', 'stays.checkout.store'] as $route) {
            $this->actingAs($user)->postJson(route($route), [])->assertForbidden();
        }
    }

    public function test_no_fee_is_added_and_no_instant_stay_booking(): void
    {
        config(['flights.tax_percent' => 5, 'stays.commission_percent' => 5, 'stays.providers.liteapi.key' => 'sand_x', 'stays.providers.liteapi.enabled' => true]);

        $this->assertSame(0.0, FlightPricing::percent());
        $this->assertSame(0.0, StayPricing::percent());
        $this->assertFalse(app(StayProviders::class)->anyEnabled());
        $this->assertFalse(app(DuffelProvider::class)->bookable());
    }

    public function test_flight_offers_link_to_aviasales_with_affiliate_marker(): void
    {
        config(['flights.providers.travelpayouts.marker' => '588927']);

        $url = DuffelProvider::partnerUrl(
            ['origin' => ['iata_code' => 'cdg'], 'destination' => ['iata_code' => 'NRT']],
            ['departing_at' => '2027-05-09T10:30:00'],
            2,
        );

        $this->assertSame('https://www.aviasales.com/search/CDG0905NRT2?marker=588927', $url);
    }

    public function test_partner_terms_replace_sales_terms(): void
    {
        $this->get(route('legal.terms'))->assertOk()->assertInertia(fn ($page) => $page->component('Legal/PartnerTerms'));
        $this->get(route('legal.notice'))->assertOk()->assertInertia(fn ($page) => $page->where('directBooking', false));

        config(['commerce.direct_booking' => true]);
        $this->get(route('legal.terms'))->assertOk()->assertInertia(fn ($page) => $page->component('Legal/Terms'));
    }

    public function test_free_trips_are_limited_and_premium_unlocks_expenses_and_travel_book(): void
    {
        $owner = User::factory()->create();
        $trip = \App\Models\Trip::create(['title' => 'Japon', 'start_date' => '2027-04-01', 'end_date' => '2027-04-10', 'user_id' => $owner->id]);
        $member = $this->actingAs($owner)->getJson(route('trips.budget.show', $trip))
            ->assertJsonPath('expense_limit', \App\Models\Trip::FREE_EXPENSE_LIMIT)
            ->json('members.0.id');
        $expense = fn () => $this->actingAs($owner)->postJson(route('trips.expenses.store', $trip), [
            'title' => 'Ramen', 'category' => 'repas', 'amount' => 12, 'paid_by' => $member,
            'split_mode' => 'equal', 'shares' => [['member_id' => $member]],
        ]);

        for ($i = 0; $i < \App\Models\Trip::FREE_EXPENSE_LIMIT; $i++) {
            $expense()->assertOk();
        }
        $expense()->assertForbidden();
        $this->actingAs($owner)->get(route('trips.print', $trip))->assertRedirect(route('billing.show'));

        $owner->forceFill(['subscription_status' => 'active', 'subscription_ends_at' => null])->save();

        $expense()->assertOk()->assertJsonPath('expense_limit', null);
        $this->actingAs($owner)->get(route('trips.print', $trip))->assertOk()->assertInertia(fn ($page) => $page->component('Trips/Print'));
    }
}
