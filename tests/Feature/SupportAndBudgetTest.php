<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\SupportConversation;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SupportAndBudgetTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_chats_with_support_and_only_agents_see_the_inbox(): void
    {
        Mail::fake();
        config(['support.admins' => ['agent@example.com']]);
        $customer = User::factory()->create(['name' => 'Ada Lovelace']);
        $agent = User::factory()->create(['email' => 'agent@example.com', 'name' => 'Léa']);

        $token = $this->actingAs($customer)->postJson(route('support.start'), ['topic' => 'reservation', 'message' => 'Mon vol a été annulé, que faire ?'])
            ->assertCreated()
            ->assertJsonPath('conversation.topic_label', 'Réservation ou billet')
            ->assertJsonCount(2, 'conversation.messages')
            ->json('conversation.token');

        $this->actingAs($customer)->getJson(route('support.current'))->assertJsonPath('conversation.token', $token);

        // Ni un autre client ni un non-agent n'accèdent à la conversation.
        $other = User::factory()->create();
        $this->actingAs($other)->postJson(route('support.send', $token), ['message' => 'intrus'])->assertNotFound();
        $this->actingAs($customer)->get(route('admin.support.index'))->assertForbidden();

        $this->actingAs($agent)->get(route('admin.support.index'))->assertOk()->assertInertia(fn ($page) => $page->component('Admin/Support')->where('conversations.0.unread', 1));
        $this->actingAs($agent)->postJson(route('admin.support.reply', $token), ['message' => 'Bonjour Ada, voici la marche à suivre…'])->assertCreated();

        $this->actingAs($customer)->getJson(route('support.show', $token))
            ->assertJsonPath('conversation.messages.2.author', 'agent')
            ->assertJsonPath('conversation.messages.2.author_name', 'Léa');

        $this->actingAs($customer)->postJson(route('support.close', $token))->assertOk();
        $this->assertSame('closed', SupportConversation::where('token', $token)->value('status'));
    }

    public function test_guests_can_ask_for_help_with_their_email(): void
    {
        $this->postJson(route('support.start'), ['topic' => 'autre', 'message' => 'Bonjour'])->assertJsonValidationErrors(['name', 'email']);

        $this->withCredentials()->withCookie('guest_token', 'guest-1')
            ->postJson(route('support.start'), ['topic' => 'compte', 'name' => 'Sam', 'email' => 'sam@example.com', 'message' => 'Je ne retrouve plus mon voyage'])
            ->assertCreated();
        $this->withCredentials()->withCookie('guest_token', 'guest-1')->getJson(route('support.current'))->assertJsonPath('conversation.name', 'Sam');
        $this->withCredentials()->withCookie('guest_token', 'guest-2')->getJson(route('support.current'))->assertJsonPath('conversation', null);
    }

    public function test_planned_budget_paid_toggle_hidden_and_custom_lines_and_flight_estimates(): void
    {
        $owner = User::factory()->create();
        $trip = Trip::create(['title' => 'Japon', 'start_date' => '2027-04-01', 'end_date' => '2027-04-05', 'user_id' => $owner->id, 'travelers' => 2,
            'origin_name' => 'Paris, France', 'origin_latitude' => 48.85, 'origin_longitude' => 2.35]);
        $stay = $trip->stays()->create(['location_name' => 'Tokyo, Japon', 'latitude' => 35.68, 'longitude' => 139.69, 'arrival_date' => '2027-04-01', 'departure_date' => '2027-04-05', 'accommodation_cost' => 600]);
        $stay->generateDays();
        Activity::create(['day_id' => $stay->days()->first()->id, 'title' => 'Musée Ghibli', 'period' => 'matin', 'category' => 'visite', 'price' => 10]);

        config(['flights.providers.travelpayouts.enabled' => true, 'flights.providers.travelpayouts.token' => 'tp']);
        Http::fake(['api.travelpayouts.com/aviasales/*' => Http::response(['success' => true, 'data' => [
            ['departure_at' => '2027-04-01T10:00:00+02:00', 'price' => 450],
            ['departure_at' => '2027-04-09T10:00:00+02:00', 'price' => 390],
        ]])]);

        $planned = collect($this->actingAs($owner)->getJson(route('trips.budget.show', $trip))->json('planned'))->keyBy('key');
        $this->assertSame(900.0, (float) $planned['estimate-flight-out']['amount']);
        $this->assertSame('Meilleur prix Aviasales ce jour-là', $planned['estimate-flight-out']['detail']);
        $this->assertSame(780.0, (float) $planned['estimate-flight-back']['amount']);

        // Un billet enregistré remplace l'estimation de l'aller.
        $trip->reservations()->create(['kind' => 'flight', 'title' => 'Vol aller', 'starts_at' => '2027-04-01 10:00', 'price' => 1020]);
        $planned = collect($this->actingAs($owner)->getJson(route('trips.budget.show', $trip))->json('planned'))->keyBy('key');
        $this->assertArrayNotHasKey('estimate-flight-out', $planned->all());
        $this->assertSame(1020.0, (float) $planned->first(fn ($line) => $line['type'] === 'reservation')['amount']);

        // Estimation modifiée à la main, ligne masquée puis rétablie, ligne ajoutée.
        $this->actingAs($owner)->patchJson(route('trips.budget.planned', $trip), ['type' => 'estimate', 'key' => 'estimate-flight-back', 'amount' => 300])
            ->assertJsonPath('planned', fn ($lines) => collect($lines)->firstWhere('key', 'estimate-flight-back')['amount'] == 600);
        $this->actingAs($owner)->postJson(route('trips.budget.lines.hide', $trip), ['key' => 'stay-' . $stay->id])
            ->assertJsonPath('hidden_lines', 1)
            ->assertJsonPath('planned', fn ($lines) => !collect($lines)->contains('key', 'stay-' . $stay->id));
        $this->actingAs($owner)->postJson(route('trips.budget.lines.restore', $trip))->assertJsonPath('hidden_lines', 0);
        $custom = collect($this->actingAs($owner)->postJson(route('trips.budget.lines.store', $trip), ['label' => 'Assurance voyage', 'amount' => 40, 'group' => 'autre', 'per_person' => true])
            ->json('planned'))->firstWhere('label', 'Assurance voyage');
        $this->assertSame(80.0, (float) $custom['amount']);

        // Payé : une dépense liée à la ligne ; non payé : la dépense est supprimée.
        $member = $this->actingAs($owner)->getJson(route('trips.budget.show', $trip))->json('members.0.id');
        $line = collect($this->actingAs($owner)->postJson(route('trips.expenses.store', $trip), [
            'title' => 'Musée Ghibli', 'category' => 'activite', 'amount' => 20, 'paid_by' => $member, 'split_mode' => 'equal',
            'shares' => [['member_id' => $member]], 'planned_key' => 'activity-' . Activity::first()->id,
        ])->json('planned'))->firstWhere('key', 'activity-' . Activity::first()->id);
        $this->assertNotNull($line['paid']);

        $this->actingAs($owner)->deleteJson(route('trips.expenses.destroy', [$trip, $line['paid']['expense_id']]))
            ->assertJsonPath('planned', fn ($lines) => collect($lines)->firstWhere('key', 'activity-' . Activity::first()->id)['paid'] === null);

        $this->actingAs($owner)->postJson(route('trips.budget.lines.hide', $trip), ['key' => $custom['key']]);
        $this->assertDatabaseMissing('trip_budget_lines', ['label' => 'Assurance voyage']);
    }

    public function test_transition_keeps_full_ticket_details(): void
    {
        $owner = User::factory()->create();
        $trip = Trip::create(['title' => 'Italie', 'start_date' => '2027-05-01', 'end_date' => '2027-05-06', 'user_id' => $owner->id]);
        $rome = $trip->stays()->create(['location_name' => 'Rome, Italie', 'latitude' => 41.9, 'longitude' => 12.5, 'arrival_date' => '2027-05-01', 'departure_date' => '2027-05-03']);
        $florence = $trip->stays()->create(['location_name' => 'Florence, Italie', 'latitude' => 43.77, 'longitude' => 11.25, 'arrival_date' => '2027-05-03', 'departure_date' => '2027-05-06']);

        $this->actingAs($owner)->post(route('transitions.store', $trip), [
            'from_stay_id' => $rome->id, 'to_stay_id' => $florence->id, 'transport_mode' => 'train', 'cost' => 58,
            'reference' => 'PNR8XK', 'carrier' => 'Trenitalia', 'service_number' => 'FR 9521',
            'departure_at' => '2027-05-03T09:15', 'arrival_at' => '2027-05-03T10:50', 'seat' => 'Voiture 5 · place 12A',
        ])->assertRedirect();

        $transition = $trip->transitions()->first();
        $this->assertSame('PNR8XK', $transition->reference);
        $this->actingAs($owner)->put(route('transitions.update', $transition), ['transport_mode' => 'train', 'seat' => 'Voiture 6 · place 3B'])->assertRedirect();
        $this->assertSame('Voiture 6 · place 3B', $transition->fresh()->seat);
    }
}
