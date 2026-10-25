import { useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import { CalendarDays, Copy, ExternalLink, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { KIND_META } from "@/Components/Reservations/kinds";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";
import ReservationModal, { TICKET_FIELDS } from "@/Components/Reservations/ReservationModal";
import { openPartnerWindow } from "@/Utils/partners";
import { formatPrice } from "@/Utils/flights";
import { confirmDialog } from "@/Components/ConfirmDialog";


const when = (value) => (value ? new Date(value).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(" 00:00", "") : null);

/**
 * Ouvre un partenaire dans une fenêtre dédiée puis, à sa fermeture, propose d'enregistrer
 * la réservation dans le voyage avec ce qu'on sait déjà (trajet, dates, prix indicatif).
 */
export function usePartnerBooking(trip, kinds) {
    const { canEdit } = useTripPermissions();
    const [prompt, setPrompt] = useState(null);

    const open = (url, draft) => openPartnerWindow(url, () => canEdit && draft && setPrompt(draft));
    const element = prompt ? <ReservationModal trip={trip} draft={prompt} prompt kinds={kinds} onClose={() => setPrompt(null)} /> : null;

    return { open, element };
}

function ReservationCard({ reservation, canEdit, onEdit, onDelete }) {
    const meta = KIND_META[reservation.kind] || KIND_META.other;
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard?.writeText(reservation.reference).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <article className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow ${meta.gradient}`}><meta.Icon className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate font-bold text-slate-900 dark:text-white">{reservation.title}</h4>
                    {reservation.provider && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.tone}`}>{reservation.provider}</span>}
                </div>
                {(reservation.origin || reservation.destination) && (
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{reservation.origin} → {reservation.destination}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {reservation.starts_at && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {when(reservation.starts_at)}{reservation.ends_at && ` → ${when(reservation.ends_at)}`}</span>}
                    {reservation.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {reservation.address}</span>}
                    {reservation.travelers && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {reservation.travelers}</span>}
                </div>
                {(TICKET_FIELDS[reservation.kind] || []).some(([key]) => reservation.details?.[key]) && (
                    <div className="flex flex-wrap gap-1.5">
                        {(TICKET_FIELDS[reservation.kind] || []).filter(([key]) => reservation.details?.[key]).map(([key, label]) => (
                            <span key={key} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                <span className="text-slate-400">{label} :</span> <strong>{reservation.details[key]}</strong>
                            </span>
                        ))}
                    </div>
                )}
                {reservation.notes && <p className="text-xs text-slate-500">{reservation.notes}</p>}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    {reservation.reference && (
                        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200" title="Copier la référence">
                            {reservation.reference} <Copy className="h-3 w-3" /> {copied && <span className="font-sans text-emerald-600">copié</span>}
                        </button>
                    )}
                    {reservation.url && (
                        <a href={reservation.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400">
                            {reservation.details?.receipt ? "Voir la confirmation" : "Gérer la réservation"} <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>
            </div>
            <div className="flex flex-col items-end justify-between gap-2">
                {reservation.price != null && <p className="text-lg font-black text-slate-900 dark:text-white">{formatPrice(reservation.price, reservation.currency)}</p>}
                {canEdit && !reservation.details?.locked && (
                    <div className="flex gap-1 opacity-60 transition group-hover:opacity-100">
                        <button onClick={() => onEdit(reservation)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700" title="Modifier"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => onDelete(reservation)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                    </div>
                )}
            </div>
        </article>
    );
}

/** Réservations du voyage d'une famille donnée (transports ou logements). */
export default function TripReservations({ trip, kinds, title, empty, accent = "text-slate-900" }) {
    const { canEdit } = useTripPermissions();
    const [editing, setEditing] = useState(null);
    const list = (trip.reservations || []).filter((reservation) => kinds.includes(reservation.kind));
    const total = list.reduce((sum, reservation) => (reservation.currency === (list[0]?.currency || "EUR") ? sum + (reservation.price || 0) : sum), 0);

    const remove = async (reservation) => {
        if (!(await confirmDialog({ title: "Retirer cette réservation ?", message: `« ${reservation.title} » sera retirée du voyage. La réservation chez le partenaire n’est pas annulée.`, confirmLabel: "Retirer" }))) return;
        await axios.delete(route("trips.reservations.destroy", [trip.id, reservation.id]));
        router.reload({ only: ["trip"], preserveScroll: true });
    };

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={`flex items-center gap-2 text-lg font-black ${accent}`}>
                    {title}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">{list.length}</span>
                    {total > 0 && <span className="text-sm font-semibold text-slate-400">· {formatPrice(total, list[0].currency)}</span>}
                </h3>
                {canEdit && (
                    <button onClick={() => setEditing({ kind: kinds[0] })} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <Plus className="h-4 w-4" /> Ajouter une réservation
                    </button>
                )}
            </div>
            {list.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                    {list.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} canEdit={canEdit} onEdit={setEditing} onDelete={remove} />)}
                </div>
            ) : (
                <p className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">{empty}</p>
            )}
            {editing && <ReservationModal trip={trip} draft={editing} kinds={kinds} onClose={() => setEditing(null)} />}
        </section>
    );
}
