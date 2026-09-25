<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('trips', 'share_token')) {
            Schema::table('trips', function (Blueprint $table) {
                $table->string('share_token', 40)->nullable()->after('id');
            });
        }

        try {
            Schema::table('trips', function (Blueprint $table) {
                $table->unique('share_token');
            });
        } catch (\Exception $e) {
            // l'index unique existe déjà, on ignore
        }

        DB::table('trips')->whereNull('share_token')->orderBy('id')->each(function ($trip) {
            DB::table('trips')->where('id', $trip->id)->update([
                'share_token' => Str::random(32),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropUnique(['share_token']);
            $table->dropColumn('share_token');
        });
    }
};