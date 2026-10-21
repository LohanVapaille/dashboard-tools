<?php

namespace App\Services\Payments;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class StripeClient
{
    private const API = 'https://api.stripe.com/v1';

    public function configured(): bool
    {
        return (bool) config('services.stripe.secret');
    }

    /**
     * Crée une session Checkout. Les options d'apparence récentes
     * (branding_settings) sont retirées si le compte Stripe ne les accepte pas.
     */
    public function createCheckoutSession(array $params, array $branding = []): array
    {
        $response = $this->post('/checkout/sessions', $params + $branding);

        if ($branding && $response->status() === 400 && str_starts_with((string) $response->json('error.param'), 'branding_settings')) {
            $response = $this->post('/checkout/sessions', $params);
        }

        if ($response->failed() || !$response->json('url')) {
            Log::error('Stripe checkout session failed', ['body' => $response->json('error')]);
            throw new RuntimeException($response->json('error.message') ?: 'Création de la session Stripe impossible.');
        }

        return $response->json();
    }

    public function retrieveCheckoutSession(string $id): array
    {
        $response = $this->request()->get(self::API . '/checkout/sessions/' . rawurlencode($id));
        if ($response->failed()) {
            throw new RuntimeException('Session Stripe introuvable.');
        }

        return $response->json();
    }

    /** URL du reçu Stripe officiel lié au paiement. */
    public function receiptUrl(?string $paymentIntentId): ?string
    {
        if (!$paymentIntentId) {
            return null;
        }

        $response = $this->request()->get(self::API . '/payment_intents/' . rawurlencode($paymentIntentId), [
            'expand' => ['latest_charge'],
        ]);

        return $response->successful() ? $response->json('latest_charge.receipt_url') : null;
    }

    /** Remboursement partiel ou total (montant en centimes). */
    public function refund(string $paymentIntentId, int $amountMinor, string $reason, string $idempotencyKey): bool
    {
        $response = $this->request()
            ->withHeaders(['Idempotency-Key' => $idempotencyKey])
            ->post(self::API . '/refunds', [
                'payment_intent' => $paymentIntentId,
                'amount' => $amountMinor,
                'metadata' => ['reason' => $reason],
            ]);

        if ($response->failed()) {
            Log::critical('Stripe refund failed', ['payment_intent' => $paymentIntentId, 'amount' => $amountMinor, 'error' => $response->json('error')]);
        }

        return $response->successful();
    }

    public static function validSignature(string $payload, ?string $header, string $secret, int $tolerance = 300): bool
    {
        if (!$header) {
            return false;
        }

        $timestamp = null;
        $signatures = [];
        foreach (explode(',', $header) as $part) {
            [$key, $value] = array_pad(explode('=', trim($part), 2), 2, null);
            if ($key === 't') {
                $timestamp = (int) $value;
            } elseif ($key === 'v1') {
                $signatures[] = $value;
            }
        }

        if (!$timestamp || !$signatures || abs(time() - $timestamp) > $tolerance) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
        foreach ($signatures as $signature) {
            if (hash_equals($expected, (string) $signature)) {
                return true;
            }
        }

        return false;
    }

    private function post(string $path, array $params): Response
    {
        try {
            return $this->request()->post(self::API . $path, $params);
        } catch (ConnectionException) {
            throw new RuntimeException('Stripe ne répond pas. Réessayez dans un instant.');
        }
    }

    private function request()
    {
        return Http::asForm()->withBasicAuth((string) config('services.stripe.secret'), '')->timeout(20);
    }
}
