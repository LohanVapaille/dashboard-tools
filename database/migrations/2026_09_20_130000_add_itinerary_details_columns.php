<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->enum('period', ['matin', 'midi', 'apres_midi', 'soir', 'nuit'])->default('matin')->after('day_id');
            $table->string('category')->default('autre')->after('title');
            $table->decimal('price', 10, 2)->nullable()->after('category');
            $table->integer('order_index')->default(0)->after('price');
        });

        Schema::table('stay_transitions', function (Blueprint $table) {
            $table->decimal('cost', 10, 2)->nullable()->after('duration_minutes');
            $table->text('notes')->nullable()->after('cost');
        });

        Schema::table('stays', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('location_name');
        });

        Schema::table('days', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('day_number');
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn(['period', 'category', 'price', 'order_index']);
        });

        Schema::table('stay_transitions', function (Blueprint $table) {
            $table->dropColumn(['cost', 'notes']);
        });

        Schema::table('stays', function (Blueprint $table) {
            $table->dropColumn(['notes']);
        });

        Schema::table('days', function (Blueprint $table) {
            $table->dropColumn(['notes']);
        });
    }
};
