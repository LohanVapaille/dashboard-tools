<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('flight_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->string('duffel_offer_id');
            $table->string('status')->default('payment_pending');
            $table->string('currency', 3);
            $table->decimal('flight_amount', 12, 2);
            $table->decimal('service_fee', 12, 2);
            $table->decimal('total_amount', 12, 2);
            $table->json('passengers');
            $table->json('offer_snapshot')->nullable();
            $table->string('stripe_checkout_session_id')->nullable()->unique();
            $table->string('duffel_order_id')->nullable()->index();
            $table->text('failure_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flight_bookings');
    }
};
