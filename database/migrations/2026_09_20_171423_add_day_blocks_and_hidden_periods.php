<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Supprime l'ancienne table de l'essai précédent (colonnes order / is_visible)
        Schema::dropIfExists('day_blocks');

        Schema::create('day_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('day_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30);
            $table->string('title')->nullable();
            $table->json('content')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['day_id', 'position']);
        });

        if (!Schema::hasColumn('days', 'hidden_periods')) {
            Schema::table('days', function (Blueprint $table) {
                $table->json('hidden_periods')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('days', 'hidden_periods')) {
            Schema::table('days', function (Blueprint $table) {
                $table->dropColumn('hidden_periods');
            });
        }

        Schema::dropIfExists('day_blocks');
    }
};