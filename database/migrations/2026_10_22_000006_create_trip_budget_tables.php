<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('stays', function (Blueprint $table) {
            // Coût total estimé ou réel du logement pour tout le groupe.
            $table->decimal('accommodation_cost', 10, 2)->nullable()->after('notes');
        });

        Schema::table('trips', function (Blueprint $table) {
            $table->decimal('budget_target', 10, 2)->nullable()->after('travelers');
        });

        // Personnes entre qui les dépenses sont réparties (membres du voyage ou simples noms).
        Schema::create('trip_budget_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('guest_token')->nullable();
            $table->timestamps();

            $table->unique(['trip_id', 'user_id']);
            $table->unique(['trip_id', 'guest_token']);
        });

        Schema::create('trip_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->foreignId('paid_by')->constrained('trip_budget_members')->cascadeOnDelete();
            $table->string('title', 191);
            $table->string('category', 20)->default('autre');
            $table->decimal('amount', 10, 2);
            $table->string('split_mode', 10)->default('equal');
            $table->date('spent_on')->nullable();
            $table->timestamps();
        });

        Schema::create('trip_expense_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_expense_id')->constrained()->cascadeOnDelete();
            $table->foreignId('trip_budget_member_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->timestamps();

            $table->unique(['trip_expense_id', 'trip_budget_member_id']);
        });

        // Les voyages qui ont déjà choisi leurs onglets voient aussi le nouveau.
        DB::table('trips')->whereNotNull('visible_tabs')->orderBy('id')->each(function ($trip) {
            $tabs = json_decode($trip->visible_tabs, true) ?: [];
            if (!in_array('budget', $tabs, true)) {
                $tabs[] = 'budget';
                DB::table('trips')->where('id', $trip->id)->update(['visible_tabs' => json_encode($tabs)]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_expense_shares');
        Schema::dropIfExists('trip_expenses');
        Schema::dropIfExists('trip_budget_members');

        Schema::table('trips', fn (Blueprint $table) => $table->dropColumn('budget_target'));
        Schema::table('stays', fn (Blueprint $table) => $table->dropColumn('accommodation_cost'));
    }
};
