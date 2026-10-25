<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Réservations faites chez un partenaire (compagnie, Booking, Omio…) et notées dans le voyage :
 * le site ne les vend pas, il les range avec le reste du voyage.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('trip_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind', 20)->index();
            $table->string('title');
            $table->string('provider', 80)->nullable();
            $table->string('reference', 120)->nullable();
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->string('origin')->nullable();
            $table->string('destination')->nullable();
            $table->string('address')->nullable();
            $table->unsignedSmallInteger('travelers')->nullable();
            $table->decimal('price', 12, 2)->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->string('url', 2048)->nullable();
            $table->text('notes')->nullable();
            $table->json('details')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_reservations');
    }
};
