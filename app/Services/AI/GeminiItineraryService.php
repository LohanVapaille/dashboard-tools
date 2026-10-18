<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
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
        $response = Http::timeout(45)
            ->retry(2, 500)
            ->post('https://generativelanguage.googleapis.com/v1beta/models/' .
                config('services.gemini.model', 'gemini-flash-latest') . ':generateContent?key=' . urlencode($apiKey), [
                    'contents' => [[
                        'parts' => [['text' => $prompt]],
                    ]],
                    'generationConfig' => [
                        'temperature' => 0.4,
                        'responseMimeType' => 'application/json',
                    ],
                ]);

        if ($response->failed()) {
            throw new RuntimeException('Gemini a refusé la requête (' . $response->status() . ').');
        }

        $text = $response->json('candidates.0.content.parts.0.text');
        if (!is_string($text) || trim($text) === '') {
            throw new RuntimeException('Gemini n’a pas renvoyé de contenu exploitable.');
        }

        $data = json_decode($text, true);
        if (!is_array($data) || !isset($data['days']) || !is_array($data['days'])) {
            throw new RuntimeException('La réponse de Gemini n’est pas un itinéraire JSON valide.');
        }

        return $data;
    }

    private function buildPrompt(array $context): string
    {
        return 'Tu es un assistant de planification de voyages. Réponds uniquement avec un JSON valide, sans markdown.
Crée des activités réalistes et variées pour les jours fournis, en respectant le lieu et les centres d’intérêt.
Ne prétends pas connaître les horaires, prix ou disponibilités exacts. Le champ source_url doit être null sauf si tu es certain de l’URL officielle.
Utilise uniquement les valeurs period: matin, midi, apres_midi, soir, nuit et category: transport, hebergement, camping, repas, visite, loisir, autre.
Réponse attendue: {"days":[{"date":"YYYY-MM-DD","activities":[{"title":"...","description":"...","period":"matin","category":"visite","price":null,"location_name":"...","source_url":null}]}]}.
Ne crée pas plus de 3 activités par jour et ne crée rien pour une date absente.

Voyage:
' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
}
