import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Bot, CheckCircle2, Headset, Inbox, LoaderCircle, Mail, RotateCcw, Send, UserCheck, Wifi, WifiOff } from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";
import AdminLayout from "@/Layouts/AdminLayout";
import { isLive, listen } from "@/Utils/realtime";

const when = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const today = new Date().toDateString() === date.toDateString();
    return today ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

// Depuis le back-office : même boîte, dans la coque d'administration (défini hors rendu pour garder l'état).
const BackofficeLayout = ({ children }) => <AdminLayout title="Boîte d’assistance">{children}</AdminLayout>;

/** Boîte de réception de l'assistance : conversations à gauche, échange à droite, en direct. */
export default function SupportInbox({ conversations: initial, selected: initialSelected, backoffice }) {
    const Layout = backoffice ? BackofficeLayout : GuestLayout;
    const [conversations, setConversations] = useState(initial);
    const [filter, setFilter] = useState("open");
    const [selected, setSelected] = useState(initialSelected || null);
    const [thread, setThread] = useState(null);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [live, setLive] = useState(false);
    const scroller = useRef(null);

    const refreshList = () => axios.get(route("admin.support.conversations")).then(({ data }) => setConversations(data.conversations)).catch(() => {});
    const openThread = (token) => {
        setSelected(token);
        axios.get(route("admin.support.show", token)).then(({ data }) => {
            setThread(data.conversation);
            setConversations((list) => list.map((item) => (item.token === token ? { ...item, unread: 0 } : item)));
        });
    };

    useEffect(() => {
        if (initialSelected) openThread(initialSelected);
        const stop = listen("support.agents", "support.updated", (event) => {
            refreshList();
            setThread((current) => {
                if (!current || current.token !== event.token) return current;
                const messages = event.message && !current.messages.some((message) => message.id === event.message.id) ? [...current.messages, event.message] : current.messages;
                return { ...current, status: event.status, messages };
            });
        }, { private: true });
        // Sans WebSocket : rafraîchissement toutes les 10 s.
        const timer = setInterval(() => {
            setLive(isLive());
            if (!isLive()) {
                refreshList();
                setSelected((token) => {
                    if (token) axios.get(route("admin.support.show", token)).then(({ data }) => setThread(data.conversation)).catch(() => {});
                    return token;
                });
            }
        }, 10000);
        setTimeout(() => setLive(isLive()), 1500);
        return () => {
            stop();
            clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    }, [thread?.messages?.length]);

    const reply = async (event) => {
        event.preventDefault();
        if (!draft.trim() || !thread) return;
        setSending(true);
        try {
            const { data } = await axios.post(route("admin.support.reply", thread.token), { message: draft.trim() });
            setDraft("");
            setThread((current) => ({ ...current, status: "open", messages: current.messages.some((message) => message.id === data.message.id) ? current.messages : [...current.messages, data.message] }));
            refreshList();
        } finally {
            setSending(false);
        }
    };

    const setStatus = async (status) => {
        const { data } = await axios.post(route("admin.support.status", thread.token), { status });
        setThread(data.conversation);
        refreshList();
    };

    const visible = conversations.filter((item) => filter === "all" || item.status === filter);
    const openCount = conversations.filter((item) => item.status === "open").length;

    return (
        <Layout>
            <Head title="Assistance" />
            <div className={backoffice ? "" : "mx-auto max-w-7xl px-4 py-6 sm:px-6"}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white"><Headset className="h-6 w-6 text-fuchsia-500" /> Assistance <span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-sm text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300">{openCount} ouverte{openCount > 1 ? "s" : ""}</span></h1>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${live ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                        {live ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />} {live ? "Temps réel actif" : "Temps réel indisponible · rafraîchi toutes les 10 s"}
                    </span>
                </div>

                <div className="grid h-[calc(100vh-12rem)] min-h-[30rem] overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 md:grid-cols-[22rem_1fr]">
                    <aside className={`flex min-h-0 flex-col border-r border-slate-100 dark:border-slate-700 ${selected ? "hidden md:flex" : "flex"}`}>
                        <div className="flex gap-1 border-b border-slate-100 p-2 dark:border-slate-700">
                            {[["open", "Ouvertes"], ["closed", "Clôturées"], ["all", "Toutes"]].map(([key, label]) => (
                                <button key={key} onClick={() => setFilter(key)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold ${filter === key ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>{label}</button>
                            ))}
                        </div>
                        <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">
                            {!visible.length && <li className="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-400"><Inbox className="h-8 w-8" /> Aucune conversation</li>}
                            {visible.map((item) => (
                                <li key={item.token}>
                                    <button onClick={() => openThread(item.token)} className={`flex w-full gap-3 px-4 py-3 text-left transition ${selected === item.token ? "bg-fuchsia-50 dark:bg-fuchsia-950/20" : "hover:bg-slate-50 dark:hover:bg-slate-700/40"}`}>
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-black text-white">{item.name.slice(0, 1).toUpperCase()}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.name}</span>
                                                <span className="shrink-0 text-[11px] text-slate-400">{when(item.last_message_at)}</span>
                                            </span>
                                            <span className="block truncate text-[11px] font-semibold text-fuchsia-600 dark:text-fuchsia-300">{item.topic_label}{item.status === "closed" && " · clôturée"}</span>
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate text-xs text-slate-500">{item.preview}</span>
                                                {item.unread > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">{item.unread}</span>}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </aside>

                    <section className={`min-h-0 flex-col ${selected ? "flex" : "hidden md:flex"}`}>
                        {!thread ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-slate-400">
                                {selected ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <><Headset className="h-10 w-10" /> Choisissez une conversation</>}
                            </div>
                        ) : (
                            <>
                                <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                                    <button onClick={() => { setSelected(null); setThread(null); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"><ArrowLeft className="h-5 w-5" /></button>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-black text-slate-900 dark:text-white">{thread.name} <span className="text-xs font-semibold text-fuchsia-600">· {thread.topic_label}</span></p>
                                        <p className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                                            {thread.email && <a href={`mailto:${thread.email}`} className="inline-flex items-center gap-1 hover:text-indigo-600"><Mail className="h-3 w-3" /> {thread.email}</a>}
                                            <span className="inline-flex items-center gap-1"><UserCheck className="h-3 w-3" /> {thread.registered ? "Compte" : "Invité"}</span>
                                            {thread.trip && <Link href={backoffice ? route("admin.resources.edit", ["trips", thread.trip.id]) : route("trips.show", thread.trip.id)} className="font-semibold text-indigo-600 hover:underline">Voyage : {thread.trip.title}</Link>}
                                        </p>
                                    </div>
                                    {thread.status === "open" ? (
                                        <button onClick={() => setStatus("closed")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-4 w-4" /> Clôturer</button>
                                    ) : (
                                        <button onClick={() => setStatus("open")} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"><RotateCcw className="h-4 w-4" /> Rouvrir</button>
                                    )}
                                </header>
                                <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-900/40">
                                    {thread.messages.map((message) => (
                                        message.author === "system" ? (
                                            <p key={message.id} className="mx-auto flex max-w-[85%] items-start gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200"><Bot className="h-4 w-4 shrink-0" /> {message.body}</p>
                                        ) : (
                                            <div key={message.id} className={`flex ${message.author === "agent" ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${message.author === "agent" ? "rounded-br-md bg-gradient-to-br from-fuchsia-600 to-violet-600 text-white" : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"}`}>
                                                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                                                    <p className={`mt-0.5 text-right text-[10px] ${message.author === "agent" ? "text-fuchsia-100" : "text-slate-400"}`}>{message.author_name} · {when(message.created_at)}</p>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                                <form onSubmit={reply} className="flex items-end gap-2 border-t border-slate-100 p-3 dark:border-slate-700">
                                    <textarea rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.ctrlKey || event.metaKey) && reply(event)} placeholder="Votre réponse… (Ctrl + Entrée pour envoyer)" className="max-h-40 flex-1 resize-none rounded-xl border-slate-300 text-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                    <button disabled={sending || !draft.trim()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">
                                        {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Répondre
                                    </button>
                                </form>
                                <p className="px-4 pb-2 text-[11px] text-slate-400">{thread.email ? "Une copie de votre réponse est envoyée par e-mail au client." : ""}</p>
                            </>
                        )}
                    </section>
                </div>
            </div>
        </Layout>
    );
}
