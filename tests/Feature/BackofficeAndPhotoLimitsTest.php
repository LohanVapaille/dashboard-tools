<?php

namespace Tests\Feature;

use App\Admin\AdminResources;
use App\Http\Middleware\EnsureBackofficeAdmin;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BackofficeAndPhotoLimitsTest extends TestCase
{
    use RefreshDatabase;

    private function trip(?User $user = null, array $attributes = []): Trip
    {
        return Trip::create([
            'title' => 'Portugal',
            'start_date' => now()->addMonth()->toDateString(),
            'end_date' => now()->addMonth()->addDays(5)->toDateString(),
            'user_id' => $user?->id,
            ...$attributes,
        ]);
    }

    private function asAdmin(): static
    {
        return $this->withSession([EnsureBackofficeAdmin::SESSION_KEY => true]);
    }

    public function test_guests_get_a_clear_message_when_uploading_a_photo(): void
    {
        Storage::fake('public');
        $trip = $this->trip(null, ['guest_token' => 'guest-1']);

        $this->withCookie('guest_token', 'guest-1')
            ->postJson(route('trips.photos.store', $trip), ['photo' => UploadedFile::fake()->image('a.jpg')])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Connectez-vous ou créez un compte gratuit pour ajouter des photos à l’album du voyage.');
    }

    public function test_free_trips_are_limited_to_five_photos_and_premium_is_unlimited(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $trip = $this->trip($user);

        for ($i = 0; $i < Trip::FREE_PHOTO_LIMIT; $i++) {
            $this->actingAs($user)->postJson(route('trips.photos.store', $trip), ['photo' => UploadedFile::fake()->image("p$i.jpg")])->assertOk();
        }
        $this->actingAs($user)->postJson(route('trips.photos.store', $trip), ['photo' => UploadedFile::fake()->image('extra.jpg')])
            ->assertForbidden()
            ->assertJsonPath('message', 'La version gratuite permet 5 photos par voyage. Passez à Premium pour un album illimité.');

        $user->forceFill(['premium_granted' => true])->save();
        $this->actingAs($user->fresh())->postJson(route('trips.photos.store', $trip), ['photo' => UploadedFile::fake()->image('extra.jpg')])->assertOk();
        $this->assertSame(6, $trip->photos()->count());
    }

    public function test_backoffice_requires_the_env_credentials(): void
    {
        config(['admin.username' => 'boss', 'admin.password' => 'un-mot-de-passe-long']);

        $this->get(route('admin.dashboard'))->assertRedirect(route('admin.login'));
        $this->get(route('admin.resources.index', 'users'))->assertRedirect(route('admin.login'));

        $this->post(route('admin.login.store'), ['username' => 'boss', 'password' => 'faux'])->assertSessionHasErrors('username');
        $this->post(route('admin.login.store'), ['username' => 'boss', 'password' => 'un-mot-de-passe-long'])
            ->assertRedirect(route('admin.resources.index', 'users')); // retour à la page demandée avant connexion
        $this->get(route('admin.dashboard'))->assertOk();
    }

    public function test_backoffice_is_closed_without_a_password(): void
    {
        config(['admin.username' => 'admin', 'admin.password' => null]);

        $this->post(route('admin.login.store'), ['username' => 'admin', 'password' => ''])->assertSessionHasErrors();
        $this->post(route('admin.login.store'), ['username' => 'admin', 'password' => 'nimporte'])->assertSessionHasErrors('username');
        $this->get(route('admin.dashboard'))->assertRedirect(route('admin.login'));
    }

    public function test_premium_can_be_toggled_by_hand(): void
    {
        $user = User::factory()->create();
        $this->assertFalse($user->hasPremiumAccess());

        $this->asAdmin()->patch(route('admin.resources.toggle', ['users', $user->id]), ['field' => 'premium_granted'])->assertRedirect();
        $this->assertTrue($user->fresh()->hasPremiumAccess());

        $this->asAdmin()->patch(route('admin.resources.toggle', ['users', $user->id]), ['field' => 'premium_granted']);
        $this->assertFalse($user->fresh()->hasPremiumAccess());

        // Seuls les champs déclarés comme interrupteurs peuvent être basculés.
        $this->asAdmin()->patch(route('admin.resources.toggle', ['users', $user->id]), ['field' => 'email'])->assertSessionHasErrors('field');
    }

    public function test_users_crud(): void
    {
        $this->asAdmin()->post(route('admin.resources.store', 'users'), [
            'name' => 'Alice', 'email' => 'alice@example.com', 'password' => 'secret-123', 'premium_granted' => true,
        ])->assertSessionHasNoErrors();
        $user = User::where('email', 'alice@example.com')->firstOrFail();
        $this->assertTrue($user->premium_granted);

        // Mot de passe vide : conservé.
        $hash = $user->password;
        $this->asAdmin()->put(route('admin.resources.update', ['users', $user->id]), ['name' => 'Alice B.', 'email' => 'alice@example.com', 'password' => ''])->assertSessionHasNoErrors();
        $this->assertSame('Alice B.', $user->fresh()->name);
        $this->assertSame($hash, $user->fresh()->password);

        $this->asAdmin()->post(route('admin.resources.store', 'users'), ['name' => 'Doublon', 'email' => 'alice@example.com', 'password' => 'secret-123'])->assertSessionHasErrors('email');

        $this->asAdmin()->get(route('admin.resources.index', ['users', 'q' => 'Alice']))->assertOk();
        $this->asAdmin()->get(route('admin.resources.edit', ['users', $user->id]))->assertOk();
        $this->asAdmin()->delete(route('admin.resources.destroy', ['users', $user->id]))->assertRedirect(route('admin.resources.index', 'users'));
        $this->assertNull($user->fresh());
    }

    public function test_trip_content_crud_and_filters(): void
    {
        $trip = $this->trip(User::factory()->create());

        $this->asAdmin()->post(route('admin.resources.store', 'stays'), [
            'trip_id' => $trip->id, 'location_name' => 'Lisbonne', 'latitude' => 38.72, 'longitude' => -9.14,
            'arrival_date' => '2026-12-01', 'departure_date' => '2026-12-04', 'order_index' => 0,
        ])->assertSessionHasNoErrors();
        $stay = $trip->stays()->firstOrFail();

        $this->asAdmin()->put(route('admin.resources.update', ['trips', $trip->id]), [
            'title' => 'Portugal 2026', 'start_date' => '2026-12-01', 'end_date' => '2026-12-10',
            'is_private' => false, 'visible_tabs' => '["program","photos"]',
        ])->assertSessionHasNoErrors();
        $this->assertSame('Portugal 2026', $trip->fresh()->title);
        $this->assertSame(['program', 'photos'], $trip->fresh()->visible_tabs);

        $this->asAdmin()->get(route('admin.resources.index', ['stays', 'trip_id' => $trip->id]))->assertOk();
        $this->asAdmin()->get(route('admin.resources.lookup', ['trips', 'q' => 'Portugal']))->assertOk()->assertJsonPath('options.0.id', $trip->id);

        Storage::fake('public');
        $this->asAdmin()->post(route('admin.resources.store', 'trip_photos'), ['trip_id' => $trip->id, 'path' => UploadedFile::fake()->image('a.jpg')])->assertSessionHasNoErrors();
        $photo = $trip->photos()->firstOrFail();
        Storage::disk('public')->assertExists($photo->path);
        $this->asAdmin()->delete(route('admin.resources.destroy', ['trip_photos', $photo->id]));
        Storage::disk('public')->assertMissing($photo->path);

        $this->asAdmin()->delete(route('admin.resources.destroy', ['stays', $stay->id]))->assertRedirect();
        $this->assertSame(0, $trip->stays()->count());
    }

    public function test_every_resource_page_renders(): void
    {
        $trip = $this->trip(User::factory()->create());

        foreach (array_keys(AdminResources::all()) as $resource) {
            $this->asAdmin()->get(route('admin.resources.index', $resource))->assertOk();
            $this->asAdmin()->get(route('admin.resources.create', $resource))->assertOk();
        }
        $this->asAdmin()->get(route('admin.resources.edit', ['trips', $trip->id]))->assertOk();
        $this->asAdmin()->get(route('admin.support.index'))->assertOk();
        $this->asAdmin()->get(route('admin.resources.index', 'inconnu'))->assertNotFound();
    }
}
