<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stay_cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('trip_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider')->default('duffel');
            $table->string('search_result_id');
            $table->string('rate_id');
            $table->string('quote_id')->nullable();
            $table->date('check_in');
            $table->date('check_out');
            $table->unsignedTinyInteger('guests');
            $table->unsignedTinyInteger('rooms');
            $table->string('currency', 3);
            $table->decimal('stay_amount', 12, 2);
            $table->json('property');
            $table->json('room');
            $table->json('rate');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'rate_id']);
        });

        // Commandes d'hébergement : paiement distinct de celui des vols.
        Schema::create('stay_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('reference', 20)->unique();
            $table->string('status')->default('payment_pending')->index();
            $table->string('currency', 3);
            $table->decimal('stays_amount', 12, 2);
            $table->decimal('fee_percent', 5, 2);
            $table->decimal('fee_amount', 12, 2);
            $table->decimal('total_amount', 12, 2);
            $table->decimal('refunded_amount', 12, 2)->default(0);
            $table->json('guests');
            $table->string('contact_email');
            $table->string('contact_phone', 40);
            $table->text('special_requests')->nullable();
            $table->string('stripe_checkout_session_id')->nullable()->unique();
            $table->string('stripe_payment_intent_id')->nullable()->index();
            $table->string('stripe_receipt_url', 500)->nullable();
            $table->timestamp('terms_accepted_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('stay_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stay_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('trip_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider')->default('duffel');
            $table->string('rate_id');
            $table->string('quote_id')->nullable();
            $table->string('provider_booking_id')->nullable()->index();
            $table->string('reference')->nullable();
            $table->string('status')->default('pending');
            $table->date('check_in');
            $table->date('check_out');
            $table->unsignedTinyInteger('guests');
            $table->unsignedTinyInteger('rooms');
            $table->string('currency', 3);
            $table->decimal('stay_amount', 12, 2);
            $table->decimal('fee_amount', 12, 2);
            $table->decimal('total_amount', 12, 2);
            $table->decimal('refunded_amount', 12, 2)->default(0);
            $table->json('property');
            $table->json('room');
            $table->json('rate');
            $table->text('failure_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stay_bookings');
        Schema::dropIfExists('stay_orders');
        Schema::dropIfExists('stay_cart_items');
    }
};
