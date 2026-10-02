<?php
// database/migrations/2026_09_27_000000_create_trip_participants_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('trip_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('guest_token')->nullable()->index();
            $table->string('email')->nullable();
            $table->enum('role', ['admin', 'editor', 'viewer'])->default('viewer');
            $table->enum('status', ['pending', 'accepted'])->default('accepted');
            $table->timestamps();

            $table->unique(['trip_id', 'user_id']);
        });

        $trips = DB::table('trips')->pluck('user_id', 'id');

        if (Schema::hasTable('trip_user')) {
            foreach (DB::table('trip_user')->get() as $row) {
                // On saute les lignes qui ne font que dupliquer le propriétaire
                if ($row->user_id && ($trips[$row->trip_id] ?? null) === $row->user_id) {
                    continue;
                }

                DB::table('trip_participants')->updateOrInsert(
                    ['trip_id' => $row->trip_id, 'user_id' => $row->user_id, 'guest_token' => $row->guest_token],
                    [
                        'role' => in_array($row->role, ['admin', 'editor', 'viewer']) ? $row->role : 'viewer',
                        'status' => 'accepted',
                        'created_at' => $row->created_at,
                        'updated_at' => $row->updated_at,
                    ]
                );
            }
        }

        if (Schema::hasTable('trip_members')) {
            foreach (DB::table('trip_members')->get() as $row) {
                DB::table('trip_participants')->updateOrInsert(
                    ['trip_id' => $row->trip_id, 'user_id' => $row->user_id],
                    [
                        'email' => $row->email,
                        'role' => $row->role,
                        'status' => $row->status,
                        'created_at' => $row->created_at,
                        'updated_at' => $row->updated_at,
                    ]
                );
            }
        }

        Schema::dropIfExists('trip_members');
        Schema::dropIfExists('trip_user');
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_participants');
    }
};