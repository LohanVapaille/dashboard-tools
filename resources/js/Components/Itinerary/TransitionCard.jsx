import { useState } from "react";
import { router } from "@inertiajs/react";
import { Clock3, Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import TransitionModal, { TRANSPORT_STYLE } from "./TransitionModal";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";
import { confirmDialog } from "@/Components/ConfirmDialog";

const time = (value) => (value ? new Date(String(value).replace(" ", "T")).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null);

/** Trajet entre deux étapes, avec le détail du billet quand il est renseigné. */
export default function TransitionCard({ transition }) {
    const { canEdit } = useTripPermissions();
    const [editing, setEditing] = useState(false);
    const style = TRANSPORT_STYLE[transition.transport_mode] || TRANSPORT_STYLE.car;
    const ticket = [transition.carrier, transition.service_number].filter(Boolean).join(" ");

    const handleDelete = async () => {
        if (await confirmDialog({ title: "Supprimer ce trajet ?", message: "Le trajet entre ces deux étapes sera retiré du programme.", confirmLabel: "Supprimer" })) {
            router.delete(route("transitions.destroy", transition.id), { preserveScroll: true });
        }
    };

    return (
        <div className="relative my-2 flex justify-center">
            <span className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-sky-300 to-indigo-300 dark:from-sky-800 dark:to-indigo-800" />
            <div className="relative w-full max-w-xl rounded-2xl bg-white p-3 shadow-sm ring-1 ring-sky-100 dark:bg-slate-800 dark:ring-sky-900/50">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white"><style.Icon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                            {style.label}{ticket && ` · ${ticket}`}
                        </p>
                        <p className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                            {transition.departure_at && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {time(transition.departure_at)}{transition.arrival_at && ` → ${time(transition.arrival_at)}`}</span>}
                            {!transition.departure_at && transition.duration_minutes && <span>{Math.floor(transition.duration_minutes / 60)} h {String(transition.duration_minutes % 60).padStart(2, "0")}</span>}
                            {transition.cost > 0 && <span className="font-semibold text-slate-700 dark:text-slate-200">{Number(transition.cost).toLocaleString("fr-FR")} €</span>}
                        </p>
                    </div>
                    {canEdit && (
                        <div className="flex shrink-0 gap-1">
                            <button onClick={() => setEditing(true)} title="Modifier le trajet et le billet" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"><Pencil className="h-4 w-4" /></button>
                            <button onClick={handleDelete} title="Supprimer" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    )}
                </div>
                {(transition.reference || transition.seat || transition.departure_place || transition.booking_url) && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-700">
                        {transition.reference && (
                            <button onClick={() => navigator.clipboard?.writeText(transition.reference)} title="Copier" className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                {transition.reference} <Copy className="h-3 w-3" />
                            </button>
                        )}
                        {transition.departure_place && <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{transition.departure_place}{transition.arrival_place && ` → ${transition.arrival_place}`}</span>}
                        {transition.seat && <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{style.seat} : <strong>{transition.seat}</strong></span>}
                        {transition.baggage && <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{transition.baggage}</span>}
                        {transition.booking_url && <a href={transition.booking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-sky-600 hover:underline">Billet <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                )}
                {canEdit && !transition.reference && !transition.carrier && (
                    <button onClick={() => setEditing(true)} className="mt-2 text-[11px] font-bold text-sky-600 hover:underline">+ Ajouter le billet (référence, n° de vol, horaires…)</button>
                )}
            </div>
            {editing && <TransitionModal transition={transition} tripId={transition.trip_id} onClose={() => setEditing(false)} />}
        </div>
    );
}
