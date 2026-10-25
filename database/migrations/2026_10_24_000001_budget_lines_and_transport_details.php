<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Dépense rattachée à une ligne du prévisionnel : la ligne s'affiche « payée ».
        Schema::table('trip_expenses', function (Blueprint $table) {
            $table->string('planned_key', 60)->nullable()->after('trip_id')->index();
        });

        // Lignes du prévisionnel ajoutées à la main, et réglages des lignes calculées (montant, masquée).
        Schema::create('trip_budget_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->string('key', 60)->nullable();
            $table->string('group', 20)->default('autre');
            $table->string('label', 191)->nullable();
            $table->decimal('amount', 10, 2)->nullable();
            $table->boolean('per_person')->default(false);
            $table->boolean('hidden')->default(false);
            $table->timestamps();
            $table->unique(['trip_id', 'key']);
        });

        // Trajet entre deux étapes : tout ce qui concerne le billet.
        Schema::table('stay_transitions', function (Blueprint $table) {
            $table->string('reference', 60)->nullable()->after('notes');
            $table->string('carrier', 80)->nullable()->after('reference');
            $table->string('service_number', 30)->nullable()->after('carrier');
            $table->dateTime('departure_at')->nullable()->after('service_number');
            $table->dateTime('arrival_at')->nullable()->after('departure_at');
            $table->string('departure_place', 120)->nullable()->after('arrival_at');
            $table->string('arrival_place', 120)->nullable()->after('departure_place');
            $table->string('seat', 60)->nullable()->after('arrival_place');
            $table->string('baggage', 120)->nullable()->after('seat');
            $table->string('booking_url', 2048)->nullable()->after('baggage');
        });
    }

    public function down(): void
    {
        Schema::table('stay_transitions', function (Blueprint $table) {
            $table->dropColumn(['reference', 'carrier', 'service_number', 'departure_at', 'arrival_at', 'departure_place', 'arrival_place', 'seat', 'baggage', 'booking_url']);
        });
        Schema::dropIfExists('trip_budget_lines');
        Schema::table('trip_expenses', function (Blueprint $table) {
            $table->dropColumn('planned_key');
        });
    }
};
