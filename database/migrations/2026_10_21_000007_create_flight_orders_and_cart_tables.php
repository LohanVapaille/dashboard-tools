<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Une commande = un paiement Stripe, pouvant contenir l'aller et le retour.
        Schema::create('flight_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('reference', 20)->unique();
            $table->string('status')->default('payment_pending')->index();
            $table->string('currency', 3);
            $table->decimal('flights_amount', 12, 2);
            $table->decimal('fee_percent', 5, 2);
            $table->decimal('fee_amount', 12, 2);
            $table->decimal('total_amount', 12, 2);
            $table->decimal('refunded_amount', 12, 2)->default(0);
            $table->json('passengers');
            $table->string('contact_email');
            $table->string('contact_phone', 40);
            $table->string('stripe_checkout_session_id')->nullable()->unique();
            $table->string('stripe_payment_intent_id')->nullable()->index();
            $table->string('stripe_receipt_url', 500)->nullable();
            $table->timestamp('terms_accepted_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('flight_cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('trip_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider')->default('duffel');
            $table->string('offer_id');
            $table->string('direction', 10)->default('outbound');
            $table->unsignedTinyInteger('passengers_count');
            $table->string('currency', 3);
            $table->decimal('flight_amount', 12, 2);
            $table->json('offer');
            $table->json('raw_offer')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'offer_id']);
        });

        Schema::table('flight_bookings', function (Blueprint $table) {
            $table->foreignId('flight_order_id')->nullable()->after('trip_id')->constrained()->cascadeOnDelete();
            $table->string('direction', 10)->nullable()->after('flight_order_id');
            $table->string('booking_reference', 20)->nullable()->after('duffel_order_id');
            $table->json('ticket_numbers')->nullable()->after('booking_reference');
            $table->json('offer')->nullable()->after('offer_snapshot');
            $table->decimal('refunded_amount', 12, 2)->default(0)->after('total_amount');
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('tax_refund_requested_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('flight_bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('flight_order_id');
            $table->dropColumn(['direction', 'booking_reference', 'ticket_numbers', 'offer', 'refunded_amount', 'cancelled_at', 'tax_refund_requested_at']);
        });
        Schema::dropIfExists('flight_cart_items');
        Schema::dropIfExists('flight_orders');
    }
};
