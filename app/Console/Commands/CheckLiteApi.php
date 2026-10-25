<?php

namespace App\Console\Commands;

use App\Services\Stays\LiteApiClient;
use App\Services\Stays\Providers\LiteApiStaysProvider;
use App\Services\Stays\StaySearchQuery;
use Illuminate\Console\Command;

/**
 * Vérifie de bout en bout la réservation instantanée d'hôtels avec la clé LiteAPI
 * configurée : recherche, tarifs, pré-réservation, réservation puis annulation.
 * Réservé aux clés sandbox (aucune réservation réelle).
 */
class CheckLiteApi extends Command
{
    protected $signature = 'stays:liteapi-check
        {--lat=48.8566 : Latitude de la recherche (Paris par défaut)}
        {--lng=2.3522 : Longitude}
        {--book : Effectuer aussi une réservation de test puis l’annuler}';

    protected $description = 'Teste la réservation instantanée d’hôtels (LiteAPI sandbox)';

    public function handle(LiteApiClient $client, LiteApiStaysProvider $provider): int
    {
        if (!$client->enabled()) {
            $this->error('LITEAPI_KEY est vide. Créez une clé sandbox gratuite sur https://www.liteapi.travel puis ajoutez-la au .env.');

            return self::FAILURE;
        }

        $query = new StaySearchQuery((float) $this->option('lat'), (float) $this->option('lng'), now()->addDays(45)->toDateString(), now()->addDays(47)->toDateString(), 2, 1, 5, 'Test');
        $this->info('1/5 Recherche d’hôtels autour de ' . $query->latitude . ', ' . $query->longitude . '…');
        $properties = $provider->search($query);
        $this->line('    ' . count($properties) . ' hôtel(s) avec disponibilités.');
        if (!$properties) {
            $this->warn('Aucun résultat : essayez une autre ville avec --lat et --lng.');

            return self::FAILURE;
        }

        $property = collect($properties)->sortBy('price.total_amount')->first();
        $this->line(sprintf('    Le moins cher : %s — %.2f %s (taxes et frais inclus)', $property['name'], $property['price']['total_amount'], $property['price']['currency']));

        $this->info('2/5 Chambres et tarifs…');
        $details = $provider->rates($property['id'], $query);
        $rates = collect($details['rooms'])->flatMap(fn ($room) => $room['rates']);
        $rate = $rates->firstWhere('refundable', true) ?? $rates->first();
        $this->line(sprintf('    %d tarif(s) · retenu : %s, %s, %s', $rates->count(), $rate['room_name'], $rate['board_label'], $rate['refundable'] ? 'remboursable' : 'non remboursable'));

        $this->info('3/5 Pré-réservation (blocage du prix)…');
        $quote = $provider->quote($rate);
        $this->line(sprintf('    prebookId %s · %.2f %s', $quote['id'], $quote['amount'], $quote['currency']));

        if (!$this->option('book')) {
            $this->comment('Ajoutez --book pour tester aussi la réservation et l’annulation (sandbox uniquement).');

            return self::SUCCESS;
        }
        if (!$client->sandbox()) {
            $this->error('Clé de production détectée : test de réservation refusé.');

            return self::FAILURE;
        }

        $this->info('4/5 Réservation de test…');
        $booking = $client->book([
            'prebookId' => $quote['id'],
            'clientReference' => 'CHECK-' . now()->timestamp,
            'holder' => ['firstName' => 'Test', 'lastName' => 'Voyageur', 'email' => 'test@example.com', 'phone' => '+33600000000'],
            'guests' => [['occupancyNumber' => 1, 'firstName' => 'Test', 'lastName' => 'Voyageur', 'email' => 'test@example.com']],
        ]);
        $this->line('    bookingId ' . ($booking['bookingId'] ?? '?') . ' · statut ' . ($booking['status'] ?? '?') . ' · confirmation hôtel ' . ($booking['hotelConfirmationCode'] ?? '—'));

        $this->info('5/5 Annulation…');
        $cancel = $client->cancel($booking['bookingId']);
        $this->line(sprintf('    statut %s · remboursé %.2f %s', $cancel['status'] ?? '?', $cancel['refund_amount'] ?? 0, $cancel['currency'] ?? ''));

        $this->info('Tout fonctionne : la réservation instantanée est prête.');

        return self::SUCCESS;
    }
}
