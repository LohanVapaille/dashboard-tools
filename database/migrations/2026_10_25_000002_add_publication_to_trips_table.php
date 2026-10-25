<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            // Voyage visible sur la page « Parcourir » et en lecture seule pour tous.
            $table->timestamp('published_at')->nullable()->index()->after('is_private');
            // Instantané pris à la publication : filtres (durée, budget) sans recalcul.
            $table->unsignedSmallInteger('published_days')->nullable()->after('published_at');
            $table->decimal('published_budget', 10, 2)->nullable()->after('published_days');
            $table->json('published_summary')->nullable()->after('published_budget');
            // Voyage d'origine quand il a été repris depuis la page « Parcourir ».
            $table->foreignId('copied_from_id')->nullable()->after('published_summary')->constrained('trips')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropConstrainedForeignId('copied_from_id');
            $table->dropColumn(['published_at', 'published_days', 'published_budget', 'published_summary']);
        });
    }
};
