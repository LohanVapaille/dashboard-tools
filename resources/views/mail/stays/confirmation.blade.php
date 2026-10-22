<x-mail::message>
# Votre hébergement vous attend

Votre paiement est confirmé. Voici le récapitulatif de la commande **{{ $order->reference }}**.

@foreach ($order->bookings as $booking)
## {{ $booking->property['name'] ?? 'Hébergement' }}

- **Adresse :** {{ $booking->property['address'] ?? '' }}
- **Arrivée :** {{ $booking->check_in->locale('fr')->isoFormat('dddd D MMMM YYYY') }}{{ !empty($booking->property['check_in']) ? ' à partir de ' . $booking->property['check_in'] : '' }}
- **Départ :** {{ $booking->check_out->locale('fr')->isoFormat('dddd D MMMM YYYY') }}{{ !empty($booking->property['check_out']) ? ' avant ' . $booking->property['check_out'] : '' }}
- **Chambre :** {{ $booking->room['name'] ?? '' }} · {{ $booking->rate['board_label'] ?? '' }}
@if ($booking->status === 'confirmed')
- **Référence de réservation :** {{ $booking->reference ?: $booking->provider_booking_id }}
@else
- **Statut :** non confirmé, montant remboursé.
@endif
@if (!empty($booking->rate['due_at_property']))
- **À régler sur place :** {{ number_format($booking->rate['due_at_property']['amount'], 2, ',', ' ') }} {{ $booking->rate['due_at_property']['currency'] }} (taxes locales, taxe de séjour…)
@endif

@endforeach

<x-mail::table>
| Détail | Montant |
|:--|--:|
| Hébergements (taxes incluses) | {{ number_format($order->stays_amount, 2, ',', ' ') }} {{ $order->currency }} |
| {{ $feeLabel }} ({{ rtrim(rtrim(number_format($order->fee_percent, 2, ',', ''), '0'), ',') }} %) | {{ number_format($order->fee_amount, 2, ',', ' ') }} {{ $order->currency }} |
| **Total payé** | **{{ number_format($order->total_amount, 2, ',', ' ') }} {{ $order->currency }}** |
</x-mail::table>

<x-mail::button :url="$url">
Voir ma réservation
</x-mail::button>

Merci de votre confiance,<br>
{{ config('flights.seller.name') }}
</x-mail::message>
