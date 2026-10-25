<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Chat d'assistance : une conversation par demande (motif), messages client / équipe. */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('support_conversations', function (Blueprint $table) {
            $table->id();
            // Jeton secret : nom du canal temps réel et accès invité à la conversation.
            $table->string('token', 64)->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('guest_token', 64)->nullable()->index();
            $table->foreignId('trip_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 80);
            $table->string('email', 191)->nullable();
            $table->string('topic', 30);
            $table->string('status', 10)->default('open')->index();
            $table->timestamp('last_message_at')->nullable()->index();
            $table->timestamp('agent_read_at')->nullable();
            $table->timestamp('customer_read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_conversation_id')->constrained()->cascadeOnDelete();
            $table->string('author', 10);
            $table->string('author_name', 80)->nullable();
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_messages');
        Schema::dropIfExists('support_conversations');
    }
};
