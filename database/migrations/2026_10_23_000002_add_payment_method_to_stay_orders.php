<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Deux façons de payer un hôtel : Stripe (vente directe, le site encaisse) ou le module de paiement
 * Nuitée/LiteAPI intégré à la page (Nuitée encaisse et rembourse, le site touche une commission).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('stay_orders', function (Blueprint $table) {
            $table->string('payment_method', 20)->default('stripe')->after('status');
            $table->string('provider_transaction_id')->nullable()->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('stay_orders', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'provider_transaction_id']);
        });
    }
};
