import { useEffect, useState } from "react";
import axios from "axios";
import {
    Check,
    Copy,
    Crown,
    Eye,
    Link2,
    LoaderCircle,
    Mail,
    MessageCircle,
    PencilLine,
    RefreshCw,
    Send,
    Share2,
    ShieldCheck,
    Trash2,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

const ROLES = {
    viewer: { label: "Lecteur", hint: "Consulte le voyage", Icon: Eye, color: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300" },
    editor: { label: "Éditeur", hint: "Modifie le programme", Icon: PencilLine, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
    admin: { label: "Admin", hint: "Gère aussi les accès", Icon: ShieldCheck, color: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
};
const AVATAR_COLORS = ["from-indigo-500 to-violet-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-rose-500 to-pink-500", "from-sky-500 to-cyan-500"];

const initials = (name = "?") => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

function RoleBadge({ role }) {
    const meta = ROLES[role] || ROLES.viewer;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.color}`}>
            <meta.Icon className="h-3 w-3" /> {meta.label}
        </span>
    );
}

export default function ShareTripModal({ trip, onClose }) {
    const { canManageAccess, canManageRoles } = useTripPermissions();
    const [shareUrl, setShareUrl] = useState("");
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [invite, setInvite] = useState({ email: "", role: "viewer", processing: false, error: "", sent: "" });
    const [error, setError] = useState("");

    const load = async () => {
        try {
            const { data } = await axios.get(route(canManageAccess ? "trips.members" : "trips.share-link", trip.id));
            setShareUrl(data.share_url);
            setMembers(data.members || []);
        } catch {
            setError("Impossible de charger les informations de partage.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const onKey = (event) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const message = `Rejoins mon voyage « ${trip.title} » sur TravelPlanner : ${shareUrl}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            window.prompt("Copiez le lien :", shareUrl);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const nativeShare = () => navigator.share?.({ title: trip.title, text: `Rejoins mon voyage « ${trip.title} »`, url: shareUrl }).catch(() => {});

    const resetLink = async () => {
        if (!window.confirm("Créer un nouveau lien ? L’ancien lien ne fonctionnera plus (les personnes déjà membres gardent leur accès).")) return;
        setResetting(true);
        try {
            const { data } = await axios.post(route("trips.share", trip.id));
            setShareUrl(data.share_url);
        } catch {
            setError("Le lien n’a pas pu être régénéré.");
        } finally {
            setResetting(false);
        }
    };

    const sendInvite = async (event) => {
        event.preventDefault();
        setInvite((state) => ({ ...state, processing: true, error: "", sent: "" }));
        try {
            await axios.post(route("trips.members.store", trip.id), { email: invite.email, role: invite.role });
            setInvite({ email: "", role: invite.role, processing: false, error: "", sent: `Invitation envoyée à ${invite.email}.` });
            load();
        } catch (failure) {
            setInvite((state) => ({ ...state, processing: false, error: failure.response?.data?.message || "Impossible d’inviter cette personne." }));
        }
    };

    const updateRole = async (member, role) => {
        const previous = members;
        setMembers(members.map((item) => (item.id === member.id ? { ...item, role } : item)));
        try {
            await axios.patch(route("trips.members.update", [trip.id, member.id]), { role });
        } catch {
            setMembers(previous);
            setError("Le rôle n’a pas pu être modifié.");
        }
    };

    const removeMember = async (member) => {
        if (!window.confirm(`Retirer l’accès de ${member.name || member.email} ?`)) return;
        try {
            await axios.delete(route("trips.members.remove", [trip.id, member.id]));
            setMembers(members.filter((item) => item.id !== member.id));
        } catch {
            setError("L’accès n’a pas pu être retiré.");
        }
    };

    const channels = [
        ["WhatsApp", MessageCircle, `https://wa.me/?text=${encodeURIComponent(message)}`, "bg-emerald-500 hover:bg-emerald-600"],
        ["E-mail", Mail, `mailto:?subject=${encodeURIComponent(`Voyage « ${trip.title} »`)}&body=${encodeURIComponent(message)}`, "bg-sky-500 hover:bg-sky-600"],
        ["SMS", Send, `sms:?&body=${encodeURIComponent(message)}`, "bg-violet-500 hover:bg-violet-600"],
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
                <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 pb-6 pt-5 text-white">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                    <div className="relative flex items-start justify-between gap-4">
                        <div>
                            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-100"><Share2 className="h-3.5 w-3.5" /> Partager</p>
                            <h3 className="mt-1 text-xl font-black leading-tight">{trip.title}</h3>
                            <p className="mt-1 text-sm text-indigo-100">Invitez vos compagnons de route à suivre et préparer le voyage avec vous.</p>
                        </div>
                        <button onClick={onClose} className="rounded-full bg-white/15 p-2 transition hover:bg-white/25" aria-label="Fermer"><X className="h-4 w-4" /></button>
                    </div>
                </header>

                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                    {error && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

                    <section className="space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><Link2 className="h-4 w-4 text-indigo-500" /> Lien d’invitation</h4>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 pl-4 dark:border-slate-700 dark:bg-slate-800">
                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-600 dark:text-slate-300">{loading ? "Chargement…" : shareUrl}</span>
                            <button
                                onClick={copy}
                                disabled={!shareUrl}
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow transition disabled:opacity-50 ${copied ? "bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-700"}`}
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copié !" : "Copier"}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {typeof navigator !== "undefined" && navigator.share && (
                                <button onClick={nativeShare} disabled={!shareUrl} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                                    <Share2 className="h-3.5 w-3.5" /> Partager…
                                </button>
                            )}
                            {channels.map(([label, Icon, href, color]) => (
                                <a key={label} href={shareUrl ? href : undefined} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition ${color}`}>
                                    <Icon className="h-3.5 w-3.5" /> {label}
                                </a>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                            <span>Avec ce lien, on choisit un pseudo puis on rejoint le voyage en <strong>lecteur</strong>.</span>
                            {canManageAccess && (
                                <button onClick={resetLink} disabled={resetting} className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:underline disabled:opacity-50 dark:text-indigo-300">
                                    <RefreshCw className={`h-3 w-3 ${resetting ? "animate-spin" : ""}`} /> Nouveau lien
                                </button>
                            )}
                        </div>
                    </section>

                    {canManageAccess && (
                        <section className="space-y-3">
                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><UserPlus className="h-4 w-4 text-indigo-500" /> Inviter par e-mail</h4>
                            <form onSubmit={sendInvite} className="space-y-2">
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        type="email"
                                        required
                                        placeholder="prenom@exemple.com"
                                        value={invite.email}
                                        onChange={(event) => setInvite((state) => ({ ...state, email: event.target.value }))}
                                        className="min-w-0 flex-1 rounded-xl border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                    />
                                    <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                                        {["viewer", "editor"].map((role) => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setInvite((state) => ({ ...state, role }))}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${invite.role === role ? "bg-white text-indigo-700 shadow dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}
                                            >
                                                {ROLES[role].label}
                                            </button>
                                        ))}
                                    </div>
                                    <button disabled={invite.processing} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-indigo-700 disabled:opacity-50">
                                        {invite.processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Inviter
                                    </button>
                                </div>
                                {invite.error && <p className="text-xs text-rose-600">{invite.error}</p>}
                                {invite.sent && <p className="text-xs font-semibold text-emerald-600">{invite.sent}</p>}
                            </form>
                        </section>
                    )}

                    {canManageAccess && (
                        <section className="space-y-3">
                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                                <Users className="h-4 w-4 text-indigo-500" /> Participants
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800">{members.length + 1}</span>
                            </h4>
                            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                                <li className="flex items-center gap-3 bg-amber-50/60 px-4 py-3 dark:bg-amber-950/20">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white"><Crown className="h-4 w-4" /></span>
                                    <p className="flex-1 text-sm font-bold text-slate-800 dark:text-slate-100">Propriétaire du voyage</p>
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Tous les droits</span>
                                </li>
                                {loading && <li className="px-4 py-6 text-center text-xs text-slate-400"><LoaderCircle className="mx-auto h-5 w-5 animate-spin" /></li>}
                                {!loading && members.length === 0 && (
                                    <li className="px-4 py-6 text-center text-xs text-slate-400">Personne n’a encore rejoint ce voyage. Envoyez-leur le lien !</li>
                                )}
                                {members.map((member, index) => (
                                    <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-black text-white ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}>
                                            {initials(member.name || member.email)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{member.name || member.email}</p>
                                            <p className="truncate text-xs text-slate-400">
                                                {member.type === "guest" && !member.email ? "Invité via le lien" : member.email}
                                                {member.status === "pending" && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">en attente</span>}
                                            </p>
                                        </div>
                                        {canManageRoles ? (
                                            <div className="flex items-center gap-1">
                                                <select
                                                    value={member.role}
                                                    onChange={(event) => updateRole(member, event.target.value)}
                                                    className="rounded-xl border-slate-200 py-1.5 pl-3 pr-8 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                                >
                                                    {Object.entries(ROLES).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                                                </select>
                                                <button onClick={() => removeMember(member)} title="Retirer l’accès" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <RoleBadge role={member.role} />
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <div className="grid gap-2 sm:grid-cols-3">
                                {Object.entries(ROLES).map(([key, meta]) => (
                                    <div key={key} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                                        <meta.Icon className="h-4 w-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{meta.label}</p>
                                            <p className="text-[11px] text-slate-500">{meta.hint}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {!canManageRoles && <p className="text-[11px] text-slate-400">Seul le propriétaire peut changer les rôles ou retirer un accès.</p>}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
