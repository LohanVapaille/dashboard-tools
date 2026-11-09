import { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import { ArrowDown, ArrowUp, GripVertical, LoaderCircle, Route, TriangleAlert, X } from "lucide-react";
import Modal from "@/Components/Modal";
import { STAY_PALETTE } from "@/Components/Itinerary/StayCard";
import { formatDay, nightsBetween } from "@/Utils/stays";

const addDays = (value, days) => {
    const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

/**
 * Réorganise les étapes du voyage : elles s'enchaînent dans le nouvel ordre à partir de la
 * première date, chacune garde son nombre de nuits et ses activités.
 */
export default function ReorderStaysModal({ show, onClose, trip }) {
    const initial = trip.stays || [];
    const [order, setOrder] = useState(() => initial.map((stay) => stay.id));
    const [dragged, setDragged] = useState(null);
    const [saving, setSaving] = useState(false);

    const byId = useMemo(() => Object.fromEntries(initial.map((stay) => [stay.id, stay])), [initial]);
    const colorOf = (id) => STAY_PALETTE[initial.findIndex((stay) => stay.id === id) % STAY_PALETTE.length];

    // Aperçu des nouvelles dates, calculé comme côté serveur.
    const preview = useMemo(() => {
        let cursor = initial[0]?.arrival_date?.slice(0, 10);
        return order.map((id) => {
            const stay = byId[id];
            const nights = nightsBetween(stay.arrival_date.slice(0, 10), stay.departure_date.slice(0, 10));
            const arrival = cursor;
            cursor = addDays(cursor, nights);
            return { stay, nights, arrival, departure: cursor };
        });
    }, [order, byId, initial]);

    const changed = order.some((id, index) => id !== initial[index]?.id);
    const lostTransitions = (trip.transitions || []).filter((transition) => {
        const from = order.indexOf(transition.from_stay_id);
        return from === -1 || order[from + 1] !== transition.to_stay_id;
    }).length;

    const move = (from, to) => {
        if (to < 0 || to >= order.length || from === to) return;
        setOrder((current) => {
            const next = [...current];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            return next;
        });
    };

    const close = () => {
        setOrder(initial.map((stay) => stay.id));
        onClose();
    };

    const save = () => {
        setSaving(true);
        router.patch(route("stays.reorder", trip.id), { stays: order }, {
            preserveScroll: true,
            onSuccess: onClose,
            onFinish: () => setSaving(false),
        });
    };

    return (
        <Modal show={show} onClose={close} maxWidth="lg">
            <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                            <Route className="h-5 w-5 text-violet-500" /> Réorganiser les étapes
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Glissez les étapes ou utilisez les flèches. Chaque étape garde ses nuits et ses activités ; les dates se recalent à partir du {formatDay(initial[0]?.arrival_date, { day: "numeric", month: "long" })}.
                        </p>
                    </div>
                    <button type="button" onClick={close} aria-label="Fermer" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <ol className="mt-5 space-y-2">
                    {preview.map(({ stay, nights, arrival, departure }, index) => {
                        const color = colorOf(stay.id);
                        const moved = arrival !== stay.arrival_date.slice(0, 10);
                        return (
                            <li
                                key={stay.id}
                                draggable
                                onDragStart={() => setDragged(index)}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    if (dragged === null || dragged === index) return;
                                    move(dragged, index);
                                    setDragged(index);
                                }}
                                onDragEnd={() => setDragged(null)}
                                className={`flex cursor-grab items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition active:cursor-grabbing dark:bg-slate-800 ${dragged === index ? "border-violet-400 opacity-60 ring-2 ring-violet-300" : "border-slate-200 dark:border-slate-700"}`}
                            >
                                <GripVertical className="h-5 w-5 shrink-0 text-slate-300" />
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color.gradient} text-sm font-black text-white`}>{index + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-bold text-slate-800 dark:text-slate-100">{stay.location_name.split(",")[0]}</p>
                                    <p className="text-xs text-slate-500">
                                        {moved && <span className="mr-1 text-slate-400 line-through">{formatDay(stay.arrival_date)}</span>}
                                        <span className={moved ? "font-bold text-violet-600 dark:text-violet-400" : ""}>{formatDay(arrival)} → {formatDay(departure)}</span>
                                        {" · "}{nights} nuit{nights > 1 ? "s" : ""}
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-col">
                                    <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label="Monter" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700">
                                        <ArrowUp className="h-4 w-4" />
                                    </button>
                                    <button type="button" onClick={() => move(index, index + 1)} disabled={index === order.length - 1} aria-label="Descendre" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700">
                                        <ArrowDown className="h-4 w-4" />
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ol>

                {changed && lostTransitions > 0 && (
                    <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        {lostTransitions} trajet{lostTransitions > 1 ? "s" : ""} entre étapes ne correspondr{lostTransitions > 1 ? "ont" : "a"} plus à l’ordre et ser{lostTransitions > 1 ? "ont" : "a"} supprimé{lostTransitions > 1 ? "s" : ""}. Vos réservations ne sont pas touchées.
                    </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={close} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
                        Annuler
                    </button>
                    <button type="button" onClick={save} disabled={!changed || saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-700 px-4 py-2 text-sm font-bold text-white shadow-md disabled:opacity-50">
                        {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Enregistrer l’ordre
                    </button>
                </div>
            </div>
        </Modal>
    );
}
