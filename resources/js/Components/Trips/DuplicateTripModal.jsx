import { useEffect } from "react";
import { useForm } from "@inertiajs/react";
import { CalendarRange, Copy, EyeOff, LoaderCircle, X } from "lucide-react";

const pad = (value) => String(value).padStart(2, "0");
const toValue = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const addDays = (value, days) => {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + days);
    return toValue(date);
};

/**
 * Reprendre un voyage publié : on choisit le départ ou le retour, l'autre date suit
 * pour garder exactement le même nombre de jours.
 */
export default function DuplicateTripModal({ trip, days, onClose }) {
    const today = toValue(new Date());
    const form = useForm({ start_date: today, end_date: addDays(today, days - 1) });

    useEffect(() => {
        const onKey = (event) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const setStart = (value) => value && form.setData({ start_date: value, end_date: addDays(value, days - 1) });
    const setEnd = (value) => value && form.setData({ start_date: addDays(value, -(days - 1)), end_date: value });

    const submit = (event) => {
        event.preventDefault();
        form.post(route("explore.duplicate", trip.id));
    };

    const input = "w-full rounded-xl border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

    return (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600"><Copy className="h-3.5 w-3.5" /> Reprendre ce voyage</p>
                        <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{trip.title}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer"><X className="h-5 w-5" /></button>
                </div>

                <p className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                    <CalendarRange className="h-4 w-4 shrink-0" /> Ce voyage dure {days} jour{days > 1 ? "s" : ""} : choisissez vos dates, la durée reste la même.
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Départ</span>
                        <input type="date" min={today} value={form.data.start_date} onChange={(event) => setStart(event.target.value)} className={input} required />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Retour</span>
                        <input type="date" min={addDays(today, days - 1)} value={form.data.end_date} onChange={(event) => setEnd(event.target.value)} className={input} required />
                    </label>
                </div>
                {(form.errors.start_date || form.errors.end_date) && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{form.errors.start_date || form.errors.end_date}</p>}

                <div className="space-y-1.5 text-xs text-slate-500">
                    <p className="font-bold text-slate-700 dark:text-slate-200">Repris dans votre copie</p>
                    <p>Étapes, logements prévus, activités, trajets, checklists et budget prévisionnel, aux nouvelles dates.</p>
                    <p className="flex items-start gap-1.5 pt-1"><EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Les photos, notes personnelles, réservations, participants et dépenses de l’auteur ne sont jamais copiés.</p>
                </div>

                <button disabled={form.processing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50">
                    {form.processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Créer mon voyage
                </button>
            </form>
        </div>
    );
}
