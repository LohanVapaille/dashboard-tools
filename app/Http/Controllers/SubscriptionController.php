<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use RuntimeException;

class SubscriptionController extends Controller
{
    public function show(Request $request)
    {
        return Inertia::render('Billing/Premium', [
            'isPremium' => $request->user()->hasPremiumAccess(),
        ]);
    }

    public function checkout(Request $request)
    {
        $user = $request->user();
        $secret = config('services.stripe.secret');
        $price = config('services.stripe.price_id');

        if (!$secret || !$price) {
            return back()->withErrors(['stripe' => 'Le paiement Premium n’est pas encore configuré.']);
        }

        $response = Http::asForm()->withBasicAuth($secret, '')->post(
            'https://api.stripe.com/v1/checkout/sessions',
            [
                'mode' => 'subscription',
                'line_items[0][price]' => $price,
                'line_items[0][quantity]' => 1,
                'customer_email' => $user->email,
                'client_reference_id' => (string) $user->id,
                'success_url' => route('billing.success') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('billing.show'),
                'subscription_data[metadata][user_id]' => (string) $user->id,
            ]
        );

        if ($response->failed() || !$response->json('url')) {
            report(new RuntimeException('Stripe Checkout session creation failed: ' . $response->body()));
            return back()->withErrors(['stripe' => 'Impossible de démarrer le paiement Stripe.']);
        }

        return redirect()->away($response->json('url'));
    }

    public function success()
    {
        return redirect()->route('billing.show')->with('status', 'Paiement reçu. Votre abonnement sera activé après confirmation Stripe.');
    }

    public function webhook(Request $request)
    {
        $signature = $request->header('Stripe-Signature');
        $secret = config('services.stripe.webhook_secret');

        if (!$secret || !$this->validSignature($request->getContent(), $signature, $secret)) {
            return response()->json(['message' => 'Signature Stripe invalide.'], 400);
        }

        $event = $request->json()->all();
        $object = $event['data']['object'] ?? [];

        if (in_array($event['type'] ?? '', ['checkout.session.completed', 'customer.subscription.updated'], true)) {
            $user = isset($object['client_reference_id'])
                ? \App\Models\User::find($object['client_reference_id'])
                : (isset($object['metadata']['user_id'])
                ? \App\Models\User::find($object['metadata']['user_id'])
                : \App\Models\User::where('stripe_customer_id', $object['customer'] ?? null)->first());

            if ($user) {
                $user->update([
                    'stripe_customer_id' => $object['customer'] ?? $user->stripe_customer_id,
                    'stripe_subscription_id' => $object['subscription'] ?? $object['id'] ?? $user->stripe_subscription_id,
                    'subscription_status' => $object['status'] ?? 'active',
                    'subscription_ends_at' => isset($object['current_period_end'])
                        ? now()->setTimestamp($object['current_period_end'])
                        : null,
                ]);
            }
        }

        if (($event['type'] ?? '') === 'customer.subscription.deleted') {
            \App\Models\User::where('stripe_customer_id', $object['customer'] ?? null)->update([
                'subscription_status' => 'canceled',
                'subscription_ends_at' => now(),
            ]);
        }

        return response()->json(['received' => true]);
    }

    private function validSignature(string $payload, ?string $header, string $secret): bool
    {
        if (!$header) {
            return false;
        }

        $parts = collect(explode(',', $header))->mapWithKeys(function ($part) {
            [$key, $value] = array_pad(explode('=', $part, 2), 2, null);
            return [$key => $value];
        });
        $timestamp = (int) $parts->get('t');
        $signature = $parts->get('v1');

        if (!$timestamp || !$signature || abs(time() - $timestamp) > 300) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
        return hash_equals($expected, $signature);
    }
}
