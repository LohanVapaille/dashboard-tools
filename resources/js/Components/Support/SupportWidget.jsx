import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { usePage } from "@inertiajs/react";
import { Bot, CheckCircle2, ChevronLeft, CreditCard, Headset, Lightbulb, LoaderCircle, MessageCircle, Send, Sparkles, Ticket, User, Wrench, X } from "lucide-react";
import { isLive, listen } from "@/Utils/realtime";
import { firstError } from "@/Utils/flights";

const TOPIC_ICONS = { reservation: Ticket, paiement: CreditCard, compte: User, programme: Sparkles, bug: Wrench, partenariat: Lightbulb, autre: MessageCircle };

const time = (value) => new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function Bubble({ message }) {
    if (message.author === "system") {
        return (
            <div className="mx-auto flex max-w-[90%] items-start gap-2 rounded-2xl bg-indigo-50 px-3 py-2 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                <Bot className="mt-0.5 h-4 w-4 shrink-0" /> <span>{message.body}</span>
            </div>
        );
    }
    const mine = message.author === "customer";
    return (
        <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine ? "rounded-br-md bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"}`}>
                {!mine && <p className="mb-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-300">{message.author_name || "Équipe"} · Assistance</p>}
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-indigo-100" : "text-slate-400"}`}>{time(message.created_at)}</p>
            </div>
        </div>
    );
}

/**
 * Chat d'assistance flottant : choix du motif, puis conversation en direct avec l'équipe.
 * Messages instantanés via WebSocket (Reverb), sinon rafraîchis toutes les 8 s.
 */
export default function SupportWidget() {
    const { auth, trip } = usePage().props;
    const user = auth?.user;
    const [open, setOpen] = useState(false);
    const [state, setState] = useState({ loaded: false, conversation: null, topics: {}, responseTime: "" });
    const [form, setForm] = useState({ topic: null, name: "", email: "", message: "" });
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const scroller = useRef(null);
    const conversation = state.conversation;

    const load = async () => {
        try {
            const { data } = await axios.get(route("support.current"));
            setState({ loaded: true, conversation: data.conversation, topics: data.topics, responseTime: data.response_time });
        } catch {
            setState((current) => ({ ...current, loaded: true }));
        }
    };

    useEffect(() => {
        if (open && !state.loaded) load();
    }, [open]);

    // Conversation en cours : chargée dès l'arrivée sur la page pour afficher les réponses non lues.
    useEffect(() => {
        try {
            if (localStorage.getItem("support.active")) load();
        } catch {
            // Stockage indisponible : chargement à l'ouverture du chat.
        }
    }, []);
    useEffect(() => {
        if (!state.loaded) return;
        try {
            conversation ? localStorage.setItem("support.active", "1") : localStorage.removeItem("support.active");
        } catch {
            // Sans stockage local, rien à mémoriser.
        }
    }, [conversation?.token, state.loaded]);

    // Nouveaux messages : en direct si le WebSocket répond, sinon rafraîchissement régulier.
    useEffect(() => {
        if (!conversation?.token) return;
        const stop = listen(`support.${conversation.token}`, "support.updated", (event) => {
            setState((current) => {
                const existing = current.conversation;
                if (!existing || existing.token !== event.token) return current;
                const messages = event.message && !existing.messages.some((message) => message.id === event.message.id) ? [...existing.messages, event.message] : existing.messages;
                return { ...current, conversation: { ...existing, status: event.status, messages, unread: open ? 0 : existing.unread + (event.message?.author === "agent" ? 1 : 0) } };
            });
        });
        const timer = setInterval(async () => {
            if (isLive()) return;
            try {
                const { data } = await axios.get(route(open ? "support.show" : "support.current", open ? conversation.token : undefined));
                if (data.conversation) setState((current) => ({ ...current, conversation: data.conversation }));
            } catch {
                // Hors ligne : nouvel essai au prochain passage.
            }
        }, 8000);
        return () => {
            stop();
            clearInterval(timer);
        };
    }, [conversation?.token, open]);

    useEffect(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    }, [conversation?.messages?.length, open]);

    // Conversation ouverte : messages marqués comme lus.
    useEffect(() => {
        if (open && conversation?.token && conversation.unread) {
            axios.get(route("support.show", conversation.token)).then(({ data }) => setState((current) => ({ ...current, conversation: data.conversation }))).catch(() => {});
        }
    }, [open]);

    const start = async (event) => {
        event.preventDefault();
        setSending(true);
        setError("");
        try {
            const { data } = await axios.post(route("support.start"), { ...form, trip_id: trip?.id });
            setState((current) => ({ ...current, conversation: data.conversation }));
            setForm({ topic: null, name: "", email: "", message: "" });
        } catch (failure) {
            setError(firstError(failure, "Votre message n’a pas pu être envoyé."));
        } finally {
            setSending(false);
        }
    };

    const send = async (event) => {
        event.preventDefault();
        const body = draft.trim();
        if (!body) return;
        setSending(true);
        setError("");
        try {
            const { data } = await axios.post(route("support.send", conversation.token), { message: body });
            setDraft("");
            setState((current) => ({
                ...current,
                conversation: { ...current.conversation, status: "open", messages: current.conversation.messages.some((message) => message.id === data.message.id) ? current.conversation.messages : [...current.conversation.messages, data.message] },
            }));
        } catch (failure) {
            setError(firstError(failure, "Message non envoyé, réessayez."));
        } finally {
            setSending(false);
        }
    };

    const closeConversation = async () => {
        await axios.post(route("support.close", conversation.token)).catch(() => {});
        setState((current) => ({ ...current, conversation: null }));
    };

    const field = "w-full rounded-xl border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
    const unread = conversation?.unread || 0;

    return (
        <div className="print:hidden">
            {open && (
                <div className="fixed inset-x-0 bottom-0 z-[95] flex h-[85vh] flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[36rem] sm:w-[24rem] sm:rounded-3xl">
                    <header className="flex items-center gap-3 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-3 text-white">
                        {conversation || !form.topic ? null : (
                            <button onClick={() => setForm({ ...form, topic: null })} className="rounded-full p-1 hover:bg-white/20" aria-label="Retour"><ChevronLeft className="h-5 w-5" /></button>
                        )}
                        <span className="rounded-2xl bg-white/20 p-2"><Headset className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                            <p className="font-black leading-tight">Assistance</p>
                            <p className="truncate text-[11px] text-indigo-100">{conversation ? conversation.topic_label : `Réponse ${state.responseTime || "rapide"}`}</p>
                        </div>
                        <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-white/20" aria-label="Fermer"><X className="h-5 w-5" /></button>
                    </header>

                    {!state.loaded ? (
                        <div className="flex flex-1 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-indigo-500" /></div>
                    ) : conversation ? (
                        <>
                            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
                                {conversation.messages.map((message) => <Bubble key={message.id} message={message} />)}
                                {conversation.status === "closed" && <p className="text-center text-[11px] text-slate-400">Conversation clôturée · écrivez pour la rouvrir</p>}
                            </div>
                            {error && <p className="px-4 pb-1 text-xs text-rose-600">{error}</p>}
                            <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                                <textarea
                                    rows={1}
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && send(event)}
                                    placeholder="Votre message…"
                                    className={`${field} max-h-32 resize-none`}
                                />
                                <button disabled={sending || !draft.trim()} className="rounded-xl bg-indigo-600 p-2.5 text-white shadow disabled:opacity-40" aria-label="Envoyer">
                                    {sending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </button>
                            </form>
                            <button onClick={closeConversation} className="flex items-center justify-center gap-1 bg-white pb-2 text-[11px] font-semibold text-slate-400 hover:text-emerald-600 dark:bg-slate-900">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Mon problème est résolu
                            </button>
                        </>
                    ) : !form.topic ? (
                        <div className="flex-1 space-y-3 overflow-y-auto p-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300">Bonjour{user ? ` ${user.name.split(" ")[0]}` : ""} 👋 Comment pouvons-nous vous aider ?</p>
                            <div className="grid gap-2">
                                {Object.entries(state.topics).map(([key, label]) => {
                                    const Icon = TOPIC_ICONS[key] || MessageCircle;
                                    return (
                                        <button key={key} onClick={() => setForm({ ...form, topic: key })} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-left text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-indigo-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                                            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"><Icon className="h-4 w-4" /></span>
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[11px] text-slate-400">Pour une réservation faite chez un partenaire (Aviasales, Booking…), le partenaire reste votre interlocuteur pour l’annulation et le remboursement : nous vous aidons à le contacter.</p>
                        </div>
                    ) : (
                        <form onSubmit={start} className="flex-1 space-y-3 overflow-y-auto p-4">
                            <p className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">{state.topics[form.topic]}</p>
                            {!user && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <input required maxLength={80} placeholder="Votre prénom" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={field} />
                                    <input required type="email" placeholder="E-mail (pour la réponse)" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={field} />
                                </div>
                            )}
                            <textarea required autoFocus rows={6} maxLength={4000} placeholder={form.topic === "reservation" ? "Indiquez le voyage, le partenaire et la référence de réservation si vous l’avez…" : "Décrivez votre question ou votre problème…"} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className={field} />
                            {trip?.title && <p className="text-[11px] text-slate-400">Votre voyage « {trip.title} » sera joint à la demande.</p>}
                            {error && <p className="text-xs text-rose-600">{error}</p>}
                            <button disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50">
                                {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer
                            </button>
                        </form>
                    )}
                </div>
            )}

            <button
                onClick={() => setOpen((value) => !value)}
                aria-label={open ? "Fermer l’assistance" : "Ouvrir l’assistance"}
                className={`fixed bottom-5 right-5 z-[94] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-xl shadow-indigo-500/40 transition hover:scale-105 ${open ? "hidden sm:flex" : ""}`}
            >
                {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
                {!open && unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black ring-2 ring-white">{unread}</span>}
            </button>
        </div>
    );
}
