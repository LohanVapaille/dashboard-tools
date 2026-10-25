<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Un billet payé ne doit pas disparaître avec le voyage : comme les commandes, il garde ses données
 * (trip_id passe à null) pour rester visible dans « Réservations » et pouvoir être annulé.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('flight_bookings', function (Blueprint $table) {
            $table->dropForeign(['trip_id']);
        });

        Schema::table('flight_bookings', function (Blueprint $table) {
            $table->foreignId('trip_id')->nullable()->change();
            $table->foreign('trip_id')->references('id')->on('trips')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('flight_bookings', function (Blueprint $table) {
            $table->dropForeign(['trip_id']);
        });

        Schema::table('flight_bookings', function (Blueprint $table) {
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
        });
    }
};
