<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Bagages payants : flight_amount inclut désormais tarif + bagages.
        foreach (['flight_cart_items', 'flight_bookings'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->json('services')->nullable();
                $table->decimal('services_amount', 12, 2)->default(0);
            });
        }
    }

    public function down(): void
    {
        foreach (['flight_cart_items', 'flight_bookings'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn(['services', 'services_amount']);
            });
        }
    }
};
