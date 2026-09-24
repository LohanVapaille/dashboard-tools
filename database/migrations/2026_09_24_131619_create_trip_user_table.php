<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('trip_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('guest_token')->nullable()->index(); // Pour les non-inscrits
            $table->string('role')->default('viewer'); // 'admin', 'editor', 'viewer'
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_user');
    }
};