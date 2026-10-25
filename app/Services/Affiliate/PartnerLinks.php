<?php

namespace App\Services\Affiliate;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Transforme un lien vers une marque partenaire (Omio, Airalo, AirHelp…) en lien affilié Travelpayouts,
 * pour être rémunéré même quand le visiteur refuse les cookies du script Drive.
 * API : POST /links/v1/create (jeton, Partner ID et ID du projet abonné aux marques).
 */
class PartnerLinks
{
    /** Marques acceptées : évite d'utiliser le jeton pour n'importe quelle adresse. */
    public const HOSTS = [
        'aviasales.com', 'aviasales.fr', 'omio.com', 'omio.fr', 'airalo.com', 'saily.com', 'yesim.app', 'gigsky.com',
        'airhelp.com', 'welcomepickups.com', 'gettransfer.com', 'autoeurope.fr', 'autoeurope.com', 'autoeurope.eu',
        'qeeq.com', 'tiqets.com', 'klook.com', 'kkday.com', 'trip.com', 'booking.com', 'getyourguide.com', 'getyourguide.fr',
    ];

    public function configured(): bool
    {
        $config = config('flights.providers.travelpayouts');

        return filled($config['token']) && filled($config['marker']) && filled($config['project_id']);
    }

    public static function allowed(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        return str_starts_with($url, 'https://')
            && collect(self::HOSTS)->contains(fn (string $domain) => $host === $domain || str_ends_with($host, '.' . $domain));
    }

    /** Lien affilié, ou le lien d'origine si la marque n'est pas rejointe ou si l'API ne répond pas. */
    public function convert(string $url, ?string $subId = null): string
    {
        if (!$this->configured() || !self::allowed($url)) {
            return $url;
        }

        return Cache::remember('affiliate.link.' . sha1($url . '|' . $subId), now()->addDays(7), function () use ($url, $subId) {
            $config = config('flights.providers.travelpayouts');

            try {
                $response = Http::withHeaders(['X-Access-Token' => $config['token']])->acceptJson()->timeout(6)
                    ->post(rtrim($config['base_url'], '/') . '/links/v1/create', [
                        'trs' => (int) $config['project_id'],
                        'marker' => (int) $config['marker'],
                        'shorten' => false,
                        'links' => [array_filter(['url' => $url, 'sub_id' => $subId])],
                    ]);
            } catch (\Throwable $exception) {
                Log::info('Affiliate link API unreachable', ['error' => $exception->getMessage()]);

                return $url;
            }

            $link = $response->json('result.links.0');
            if (($link['code'] ?? null) !== 'success' || empty($link['partner_url'])) {
                Log::info('Affiliate link not created', ['url' => $url, 'message' => $link['message'] ?? $response->json('error')]);

                return $url;
            }

            return $link['partner_url'];
        });
    }
}
