<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('trip_participants', function (Blueprint $table) {
            $table->string('guest_name', 40)->nullable()->after('guest_token');
        });

        // Doublons d'un même invité sur un même voyage (rejoint plusieurs fois) : on garde le premier.
        $duplicates = DB::table('trip_participants')
            ->whereNotNull('guest_token')
            ->select('trip_id', 'guest_token', DB::raw('MIN(id) as keep_id'))
            ->groupBy('trip_id', 'guest_token')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $duplicate) {
            DB::table('trip_participants')
                ->where('trip_id', $duplicate->trip_id)
                ->where('guest_token', $duplicate->guest_token)
                ->where('id', '!=', $duplicate->keep_id)
                ->delete();
        }

        // Garantie en base : un invité ne peut rejoindre un voyage qu'une seule fois.
        Schema::table('trip_participants', function (Blueprint $table) {
            $table->unique(['trip_id', 'guest_token']);
        });
    }

    public function down(): void
    {
        Schema::table('trip_participants', function (Blueprint $table) {
            $table->dropUnique(['trip_id', 'guest_token']);
            $table->dropColumn('guest_name');
        });
    }
};
