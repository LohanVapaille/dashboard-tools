<x-mail::message>
# Bon voyage !

Votre paiement est confirmé. Voici le récapitulatif de la commande **{{ $order->reference }}**.

@foreach ($order->bookings as $booking)
@php($offer = $booking->offer ?? [])
## {{ $booking->direction === 'return' ? 'Retour' : 'Aller' }} — {{ $offer['origin']['city'] ?? $offer['origin']['code'] ?? '' }} → {{ $offer['destination']['city'] ?? $offer['destination']['code'] ?? '' }}

- **Compagnie :** {{ $offer['airline']['name'] ?? '' }}
- **Départ :** {{ isset($offer['departure']) ? \Illuminate\Support\Carbon::parse(substr($offer['departure'], 0, 19))->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH:mm') : '' }} ({{ $offer['origin']['code'] ?? '' }})
- **Arrivée :** {{ isset($offer['arrival']) ? \Illuminate\Support\Carbon::parse(substr($offer['arrival'], 0, 19))->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH:mm') : '' }} ({{ $offer['destination']['code'] ?? '' }})
@if ($booking->status === 'ticketed')
- **Référence de réservation (PNR) :** {{ $booking->booking_reference }}
@elseif ($booking->status === 'simulated')
- **Mode démonstration :** aucun billet n’a été émis auprès de la compagnie.
@else
- **Statut :** billet non émis, montant remboursé.
@endif

@endforeach

<x-mail::table>
| Détail | Montant |
|:--|--:|
| Billets (tarif compagnie, taxes aéroportuaires incluses) | {{ number_format($order->flights_amount, 2, ',', ' ') }} {{ $order->currency }} |
| {{ $taxLabel }} ({{ rtrim(rtrim(number_format($order->fee_percent, 2, ',', ''), '0'), ',') }} %) | {{ number_format($order->fee_amount, 2, ',', ' ') }} {{ $order->currency }} |
| **Total payé** | **{{ number_format($order->total_amount, 2, ',', ' ') }} {{ $order->currency }}** |
@if ((float) $order->refunded_amount > 0)
| Remboursé | −{{ number_format($order->refunded_amount, 2, ',', ' ') }} {{ $order->currency }} |
@endif
</x-mail::table>

<x-mail::button :url="$url">
Voir mon reçu et mes billets
</x-mail::button>

Présentez-vous à l’aéroport avec une pièce d’identité valide au nom indiqué sur la réservation. Vos droits en cas de retard, d’annulation ou de refus d’embarquement (règlement UE 261/2004) sont rappelés dans nos conditions de vente.

Merci de votre confiance,<br>
{{ config('flights.seller.name') }}
</x-mail::message>
