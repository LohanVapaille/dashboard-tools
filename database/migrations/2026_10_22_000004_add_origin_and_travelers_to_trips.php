<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Lieu de départ et nombre de voyageurs : pré-remplissent vols et hébergements.
        Schema::table('trips', function (Blueprint $table) {
            $table->string('origin_name')->nullable()->after('description');
            $table->decimal('origin_latitude', 10, 7)->nullable()->after('origin_name');
            $table->decimal('origin_longitude', 10, 7)->nullable()->after('origin_latitude');
            $table->unsignedTinyInteger('travelers')->nullable()->after('origin_longitude');
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropColumn(['origin_name', 'origin_latitude', 'origin_longitude', 'travelers']);
        });
    }
};
