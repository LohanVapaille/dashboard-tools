<?php

namespace App\Console\Commands;

use App\Models\TripParticipant;
use Illuminate\Console\Command;

/**
 * Supprime les participations d'invités créées par l'ancien lien de partage,
 * qui inscrivait un « invité » à chaque ouverture (robots d'aperçu des messageries).
 * Les vrais invités rejoignent désormais avec un pseudo : ceux sans pseudo sont des fantômes.
 */
class PruneGhostGuests extends Command
{
    protected $signature = 'trips:prune-ghost-guests {--force : Supprimer sans demander confirmation}';

    protected $description = 'Supprime les invités sans pseudo créés par l’ancien lien de partage';

    public function handle(): int
    {
        $query = TripParticipant::whereNull('user_id')->whereNotNull('guest_token')->whereNull('guest_name');
        $count = $query->count();

        if (!$count) {
            $this->info('Aucun invité fantôme à supprimer.');

            return self::SUCCESS;
        }

        $this->table(['Voyage', 'Invités sans pseudo'], (clone $query)
            ->selectRaw('trip_id, COUNT(*) as total')
            ->groupBy('trip_id')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [$row->trip_id, $row->total])
            ->all());

        if (!$this->option('force') && !$this->confirm("Supprimer ces {$count} participations ? Les vrais invités concernés devront rouvrir le lien et choisir un pseudo.")) {
            return self::FAILURE;
        }

        $query->delete();
        $this->info("{$count} invités fantômes supprimés.");

        return self::SUCCESS;
    }
}
