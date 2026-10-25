<?php

namespace App\Http\Controllers\Admin;

use App\Events\SupportMessagePosted;
use App\Http\Controllers\Controller;
use App\Http\Controllers\SupportChatController;
use App\Models\SupportConversation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

/** Boîte de réception de l'équipe d'assistance. */
class SupportInboxController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeAgent($request);

        return Inertia::render('Admin/Support', [
            'conversations' => $this->list(),
            'selected' => $request->query('c'),
            'topics' => SupportConversation::TOPICS,
        ]);
    }

    public function conversations(Request $request)
    {
        $this->authorizeAgent($request);

        return response()->json(['conversations' => $this->list()]);
    }

    public function show(Request $request, SupportConversation $conversation)
    {
        $this->authorizeAgent($request);
        $conversation->update(['agent_read_at' => now()]);

        return response()->json(['conversation' => $conversation->load('trip')->present(true)]);
    }

    public function reply(Request $request, SupportConversation $conversation)
    {
        $this->authorizeAgent($request);
        $body = $request->validate(['message' => ['required', 'string', 'min:1', 'max:4000']])['message'];

        $conversation->update(['status' => 'open', 'agent_read_at' => now()]);
        $message = SupportChatController::post($conversation, 'agent', $request->user()->name, $body);

        // Le client n'est peut-être plus sur le site : copie de la réponse par e-mail.
        if ($conversation->email) {
            rescue(fn () => Mail::raw(
                "Bonjour {$conversation->name},\n\nNotre équipe vous a répondu au sujet de « {$conversation->topicLabel()} » :\n\n{$body}\n\nPour continuer la conversation, ouvrez l'assistance depuis le site : " . url('/'),
                fn ($mail) => $mail->to($conversation->email)->subject('Réponse à votre demande · ' . $conversation->topicLabel()),
            ), report: false);
        }

        return response()->json(['message' => $message->present()], 201);
    }

    public function status(Request $request, SupportConversation $conversation)
    {
        $this->authorizeAgent($request);
        $status = $request->validate(['status' => ['required', 'in:open,closed']])['status'];
        $conversation->update(['status' => $status]);
        if ($status === 'closed') {
            SupportChatController::post($conversation, 'system', null, 'Conversation clôturée par l’équipe. Écrivez-nous ici si vous avez encore besoin d’aide.');
        } else {
            broadcast(new SupportMessagePosted($conversation));
        }

        return response()->json(['conversation' => $conversation->fresh()->present(true)]);
    }

    private function list(): array
    {
        return SupportConversation::with('messages')
            ->orderByRaw("case when status = 'open' then 0 else 1 end")
            ->latest('last_message_at')
            ->limit(200)
            ->get()
            ->map(fn (SupportConversation $conversation) => [
                ...collect($conversation->present(true))->except('messages')->all(),
                'preview' => str($conversation->messages->where('author', '!=', 'system')->last()?->body)->limit(90)->toString(),
            ])
            ->all();
    }

    private function authorizeAgent(Request $request): void
    {
        abort_unless($request->user()?->isSupportAgent(), 403);
    }
}
