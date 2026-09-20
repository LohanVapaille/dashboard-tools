<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('day_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('day_id')->constrained()->onDelete('cascade');
            $table->string('type')->default('period'); // 'period', 'memo', 'booking', etc.
            $table->string('title')->nullable();
            $table->json('content')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_visible')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('day_blocks');
    }
};
