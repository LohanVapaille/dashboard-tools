<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stay_transitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->onDelete('cascade');
            $table->foreignId('from_stay_id')->constrained('stays')->onDelete('cascade');
            $table->foreignId('to_stay_id')->constrained('stays')->onDelete('cascade');
            $table->enum('transport_mode', ['car', 'train', 'flight', 'bus', 'ferry'])->default('car');
            $table->integer('distance_km')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stay_transitions');
    }
};
