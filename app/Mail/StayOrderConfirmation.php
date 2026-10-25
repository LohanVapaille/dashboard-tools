<?php

namespace App\Mail;

use App\Models\StayOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StayOrderConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public StayOrder $order)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Votre hébergement est réservé — commande ' . $this->order->reference);
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.stays.confirmation', with: [
            'order' => $this->order,
            'url' => route('stays.orders.show', $this->order),
            'feeLabel' => config('stays.commission_label'),
        ]);
    }
}
