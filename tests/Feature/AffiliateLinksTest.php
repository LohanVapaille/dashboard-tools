<?php

namespace Tests\Feature;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AffiliateLinksTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'flights.providers.travelpayouts.token' => 'tp_token',
            'flights.providers.travelpayouts.marker' => '123456',
            'flights.providers.travelpayouts.project_id' => '588927',
        ]);
    }

    public function test_partner_urls_become_affiliate_links(): void
    {
        Http::fake(['api.travelpayouts.com/links/v1/create' => Http::response(['result' => ['links' => [
            ['url' => 'https://www.airalo.com/iceland-esim', 'code' => 'success', 'partner_url' => 'https://airalo.tp.st/abc'],
        ]], 'code' => 'success', 'status' => 200])]);

        $this->postJson(route('partners.link'), ['url' => 'https://www.airalo.com/iceland-esim'])
            ->assertOk()->assertJsonPath('url', 'https://airalo.tp.st/abc');

        Http::assertSent(fn (Request $request) => $request->hasHeader('X-Access-Token', 'tp_token')
            && $request['trs'] === 588927 && $request['marker'] === 123456);

        // Résultat mis en cache : pas de second appel.
        $this->postJson(route('partners.link'), ['url' => 'https://www.airalo.com/iceland-esim'])->assertOk();
        Http::assertSentCount(1);
    }

    public function test_unknown_brands_are_refused_and_failures_keep_the_original_link(): void
    {
        $this->postJson(route('partners.link'), ['url' => 'https://evil.example.com/phishing'])->assertStatus(422);

        Http::fake(['api.travelpayouts.com/*' => Http::response(['result' => ['links' => [
            ['code' => 'failed', 'message' => 'trs is not subscribed for brand', 'partner_url' => ''],
        ]], 'code' => 'success'])]);

        $this->postJson(route('partners.link'), ['url' => 'https://www.qeeq.com/'])
            ->assertOk()->assertJsonPath('url', 'https://www.qeeq.com/');
    }

    public function test_each_stay_knows_its_country(): void
    {
        $owner = User::factory()->create();
        $trip = Trip::create(['title' => 'Islande', 'start_date' => '2027-06-01', 'end_date' => '2027-06-08', 'user_id' => $owner->id]);
        $trip->stays()->create(['location_name' => 'Reykjavík, Höfuðborgarsvæðið, Ísland', 'latitude' => 64.14, 'longitude' => -21.94, 'arrival_date' => '2027-06-01', 'departure_date' => '2027-06-08']);

        $this->actingAs($owner)->get(route('trips.show', $trip))
            ->assertInertia(fn ($page) => $page->where('trip.stays.0.country.code', 'IS')->where('trip.stays.0.country.slug', 'iceland'));
    }
}
