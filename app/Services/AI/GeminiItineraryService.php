<?php

namespace App\Services\AI;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GeminiItineraryService
{
    public function suggest(array $context): array
    {
        $apiKey = config('services.gemini.api_key');

        if (!$apiKey) {
            throw new RuntimeException('La clé GEMINI_API_KEY n’est pas configurée.');
        }

        $prompt = $this->buildPrompt($context);
        $models = array_values(array_unique(array_filter(array_merge(
            [config('services.gemini.model', 'gemini-3.8-flash')],
            config('services.gemini.fallback_models', []),
        ))));
        $lastStatus = null;

        // Un modèle saturé, retiré ou trop lent ne bloque pas la génération : on passe au suivant.
        foreach ($models as $model) {
            try {
                // Clé en en-tête : elle n'apparaît pas dans les messages d'erreur ni les logs.
                $response = Http::timeout((int) config('services.gemini.timeout', 50))
                    ->withHeaders(['x-goog-api-key' => $apiKey])
                    ->post('https://generativelanguage.googleapis.com/v1beta/models/' .
                        urlencode($model) . ':generateContent', [
                            'contents' => [[
                                'parts' => [['text' => $prompt]],
                            ]],
                            'generationConfig' => [
                                'temperature' => 0.4,
                                'responseMimeType' => 'application/json',
                                // Peu de réflexion : la tâche est surtout de la rédaction, et la réponse arrive bien plus vite.
                                'thinkingConfig' => ['thinkingLevel' => 'low'],
                            ],
                        ]);
            } catch (ConnectionException $exception) {
                Log::warning('Gemini ne répond pas', ['model' => $model, 'error' => $exception->getMessage()]);
                $lastStatus = 504;
                continue;
            }

            if ($response->successful()) {
                $text = collect($response->json('candidates.0.content.parts', []))
                    ->reject(fn ($part) => $part['thought'] ?? false)
                    ->pluck('text')
                    ->implode('');

                $data = json_decode($text, true);
                if (is_array($data) && isset($data['stays']) && is_array($data['stays'])) {
                    return $data;
                }

                Log::warning('Réponse Gemini inexploitable', ['model' => $model, 'finish' => $response->json('candidates.0.finishReason')]);
                $lastStatus = 502;
                continue;
            }

            $lastStatus = $response->status();
            Log::warning('Gemini a refusé la requête', ['model' => $model, 'status' => $lastStatus, 'body' => mb_substr($response->body(), 0, 300)]);
            if (!in_array($lastStatus, [404, 408, 429, 500, 502, 503, 504], true)) {
                break;
            }
        }

        if (in_array($lastStatus, [503, 504, 429], true)) {
            throw new RuntimeException('Le service Gemini est temporairement très sollicité. Réessayez dans quelques instants.');
        }

        throw new RuntimeException('Gemini a refusé la requête (' . ($lastStatus ?? 'inconnu') . ').');
    }

    private function buildPrompt(array $context): string
    {
        return 'Tu es un assistant de planification de voyages. Réponds uniquement avec un JSON valide, sans markdown.

Le champ "mode" du voyage indique ce que tu dois faire :
- "voyage_complet" : aucun séjour n’a encore de contenu. Construis tout le voyage entre start_date et end_date.
- "completer" : des séjours existent mais certaines nuits ("free_periods") n’ont pas encore de logement. Propose des activités pour les séjours existants ET crée de nouveaux séjours dans free_periods.
- "activites_seulement" : toutes les nuits sont couvertes. Propose des activités pour les séjours existants.

Règles pour les séjours :
- Un séjour = un endroit où l’on dort. Dès que le lieu de la nuit change, crée un nouveau séjour.
- Si la demande vise une seule destination (ex. « une semaine à Rome »), un seul séjour couvre toute la période.
- Si la demande évoque un road trip, un circuit, plusieurs villes, un nombre de villes ou « visiter le pays », découpe la période en plusieurs séjours réalistes (en général 2 à 5 nuits par étape, trajets raisonnables), dans un ordre géographique logique depuis "origin" si elle est connue. Respecte le nombre de villes demandé et les villes citées.
- Les séjours s’enchaînent : departure_date d’un séjour = arrival_date du suivant. Le premier nouveau séjour commence au début de la période libre, le dernier finit à sa fin.
- Séjour existant avec "replaceable": false : ne le modifie jamais, réutilise son "id" pour lui ajouter des activités.
- Séjour existant avec "replaceable": true : il est encore vide. S’il correspond déjà à la demande (une ville précise et un seul lieu voulu), garde-le en renvoyant son "id". Si la demande implique plusieurs lieux, ou s’il désigne un pays ou une région trop large (ex. « Kazakhstan »), REMPLACE-le : ne renvoie pas son id et crée à la place de nouveaux séjours (villes précises) couvrant exactement ses dates.
- Un nouveau séjour a "id": null.
- Pour chaque nouveau séjour, donne location_name sous la forme « Ville, Pays », des coordonnées latitude/longitude précises du centre-ville, accommodation_type (type de logement conseillé et quartier) et accommodation_cost : estimation du coût TOTAL du logement pour tout le groupe ("travelers" personnes) sur toutes les nuits du séjour, en euros.
- Pour un séjour existant gardé dont accommodation_cost_known vaut false, tu peux aussi proposer accommodation_cost et accommodation_type.
- transport_from_previous décrit le trajet depuis l’étape précédente (null pour le premier séjour) : mode parmi car, train, flight, bus, ferry ; duration_minutes ; cost = coût total estimé pour le groupe en euros.

Règles pour les activités :
- Activités réalistes, variées et situées dans la ville du séjour, en tenant compte des centres d’intérêt.
- Ne propose JAMAIS une activité déjà prévue ("existing_activities", tous jours confondus), même reformulée : « Canyon de Charyn » et « Randonnée au canyon de Charyn » sont la même sortie. Un même lieu n’apparaît qu’une fois dans tout le voyage, et jamais deux fois le même jour.
- Si un jour a déjà des activités, complète seulement les moments libres de ce jour.
- Au maximum 3 activités par jour. Le jour d’un changement d’étape, reste léger (le trajet prend du temps).
- price = estimation du prix PAR PERSONNE en euros (0 si gratuit, null si inconnu). Ne prétends pas connaître les horaires, prix ou disponibilités exacts.
- source_url doit être null sauf si tu es certain de l’URL officielle.
- period parmi : matin, midi, apres_midi, soir, nuit. category parmi : transport, hebergement, camping, repas, visite, loisir, autre.
- Ne crée rien pour une date hors du séjour concerné.

Réponse attendue :
{"stays":[{"id":null,"location_name":"Ville, Pays","latitude":0.0,"longitude":0.0,"arrival_date":"YYYY-MM-DD","departure_date":"YYYY-MM-DD","accommodation_type":"...","accommodation_cost":0,"transport_from_previous":{"mode":"train","duration_minutes":120,"cost":0},"days":[{"date":"YYYY-MM-DD","activities":[{"title":"...","description":"...","period":"matin","category":"visite","price":null,"location_name":"...","source_url":null}]}]}]}

Voyage :
' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
}
