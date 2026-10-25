<?php

namespace App\Http\Controllers;

use App\Events\SupportMessagePosted;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Chat d'assistance côté client (compte ou invité identifié par son cookie). */
class SupportChatController extends Controller
{
    /** Conversation en cours du visiteur (la plus récente encore ouverte), avec ses messages. */
    public function current(Request $request)
    {
        $conversation = $this->owned($request)->where('status', 'open')->latest('last_message_at')->first();

        return response()->json([
            'conversation' => $conversation?->present(),
            'topics' => SupportConversation::TOPICS,
            'response_time' => config('support.response_time'),
        ]);
    }

    public function start(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'topic' => ['required', Rule::in(array_keys(SupportConversation::TOPICS))],
            'name' => [$user ? 'nullable' : 'required', 'string', 'max:80'],
            'email' => [$user ? 'nullable' : 'required', 'email', 'max:191'],
            'message' => ['required', 'string', 'min:2', 'max:4000'],
            'trip_id' => ['nullable', 'integer'],
        ], [], ['message' => 'message', 'email' => 'e-mail', 'name' => 'nom']);

        $guestToken = $request->cookie('guest_token');
        if (!$user && !$guestToken) {
            $guestToken = (string) Str::uuid();
            cookie()->queue('guest_token', $guestToken, 60 * 24 * 365);
        }

        // Le voyage n'est rattaché que si le visiteur y a accès.
        $trip = isset($validated['trip_id']) ? Trip::find($validated['trip_id']) : null;
        if ($trip && !$trip->canView($user, $guestToken)) {
            $trip = null;
        }

        $conversation = SupportConversation::create([
            'user_id' => $user?->id,
            'guest_token' => $user ? null : $guestToken,
            'trip_id' => $trip?->id,
            'name' => $user?->name ?: $validated['name'],
            'email' => $user?->email ?: $validated['email'],
            'topic' => $validated['topic'],
            'last_message_at' => now(),
            'customer_read_at' => now(),
        ]);

        $this->post($conversation, 'customer', $conversation->name, $validated['message']);
        $this->post($conversation, 'system', null, 'Merci ' . Str::before($conversation->name, ' ') . ' ! Votre demande « ' . $conversation->topicLabel() . ' » est bien reçue. Notre équipe vous répond ici ' . config('support.response_time') . ' ; vous serez aussi prévenu par e-mail.');
        $this->notifyAgents($conversation, $validated['message']);

        return response()->json(['conversation' => $conversation->fresh()->present()], 201);
    }

    public function send(Request $request, SupportConversation $conversation)
    {
        $this->authorizeCustomer($request, $conversation);
        $body = $request->validate(['message' => ['required', 'string', 'min:1', 'max:4000']])['message'];

        // Écrire dans une conversation fermée la rouvre.
        $conversation->update(['status' => 'open', 'customer_read_at' => now()]);
        $message = $this->post($conversation, 'customer', $conversation->name, $body);

        return response()->json(['message' => $message->present()], 201);
    }

    public function show(Request $request, SupportConversation $conversation)
    {
        $this->authorizeCustomer($request, $conversation);
        $conversation->update(['customer_read_at' => now()]);

        return response()->json(['conversation' => $conversation->present()]);
    }

    public function close(Request $request, SupportConversation $conversation)
    {
        $this->authorizeCustomer($request, $conversation);
        $conversation->update(['status' => 'closed']);
        broadcast(new SupportMessagePosted($conversation));

        return response()->json(['conversation' => $conversation->present()]);
    }

    public static function post(SupportConversation $conversation, string $author, ?string $name, string $body): SupportMessage
    {
        $message = $conversation->messages()->create(['author' => $author, 'author_name' => $name, 'body' => trim($body)]);
        $conversation->update(['last_message_at' => now()]);
        // Diffusion en direct ; si le serveur temps réel est arrêté, les clients se rattrapent par rafraîchissement.
        rescue(fn () => broadcast(new SupportMessagePosted($conversation, $message)), report: false);

        return $message;
    }

    private function notifyAgents(SupportConversation $conversation, string $message): void
    {
        $agents = config('support.admins');
        if (!$agents) {
            return;
        }

        rescue(fn () => Mail::raw(
            "Nouvelle demande d'assistance « {$conversation->topicLabel()} » de {$conversation->name} ({$conversation->email}) :\n\n{$message}\n\nRépondre : " . route('admin.support.index', ['c' => $conversation->token]),
            fn ($mail) => $mail->to($agents)->subject('[Assistance] ' . $conversation->topicLabel() . ' · ' . $conversation->name),
        ), fn ($exception) => Log::info('Support notification failed', ['error' => $exception->getMessage()]), false);
    }

    private function owned(Request $request)
    {
        $user = $request->user();
        $guestToken = $request->cookie('guest_token');

        return SupportConversation::query()->where(fn ($query) => $user
            ? $query->where('user_id', $user->id)
            : $query->whereNull('user_id')->where('guest_token', $guestToken ?: '__none__'));
    }

    private function authorizeCustomer(Request $request, SupportConversation $conversation): void
    {
        abort_unless($this->owned($request)->whereKey($conversation->id)->exists(), 404);
    }
}
