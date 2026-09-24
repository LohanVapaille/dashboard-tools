<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            if (!Schema::hasColumn('trips', 'guest_token')) {
                $table->string('guest_token')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('trips', 'is_private')) {
                $table->boolean('is_private')->default(true)->after('guest_token');
            }
            if (!Schema::hasColumn('trips', 'share_token')) {
                $table->string('share_token')->nullable()->after('is_private');
            }
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropColumn(['guest_token', 'is_private', 'share_token']);
        });
    }
};