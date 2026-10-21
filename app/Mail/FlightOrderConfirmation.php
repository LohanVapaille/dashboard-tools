<?php

namespace App\Mail;

use App\Models\FlightOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class FlightOrderConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public FlightOrder $order)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Vos billets d’avion — commande ' . $this->order->reference,
        );
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.flights.confirmation', with: [
            'order' => $this->order,
            'url' => route('flights.orders.show', $this->order),
            'taxLabel' => config('flights.tax_label'),
        ]);
    }
}
