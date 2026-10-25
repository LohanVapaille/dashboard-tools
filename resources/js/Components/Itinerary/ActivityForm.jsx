import { useState } from "react";
import axios from "axios";
import { Clock3, Euro, Link2, LoaderCircle, MapPin } from "lucide-react";
import { CATEGORY_STYLE, PERIOD_STYLE } from "@/Components/Itinerary/activityMeta";
import { firstError } from "@/Utils/flights";

const field = "w-full rounded-xl border-slate-300 text-sm focus:border-violet-500 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

const IconField = ({ icon: Icon, children }) => (
    <label className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {children}
    </label>
);

/**
 * Ajout ou modification d'une activité. Enregistre directement (JSON) et renvoie l'activité
 * à jour au parent, pour un affichage immédiat sans recharger la page.
 */
export default function ActivityForm({ dayId, period, activity = null, onSaved, onCancel }) {
    const [data, setData] = useState({
        period: activity?.period || period || "matin",
        category: activity?.category || "visite",
        title: activity?.title || "",
        description: activity?.description || "",
        price: activity?.price ?? "",
        location_name: activity?.location_name || "",
        source_url: activity?.source_url || "",
        start_time: activity?.start_time?.slice(0, 5) || "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const set = (key) => (event) => setData((current) => ({ ...current, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        const payload = { ...data, price: data.price === "" ? null : data.price, source_url: data.source_url || null, start_time: data.start_time || null };
        try {
            const { data: saved } = activity
                ? await axios.put(route("activities.update", activity.id), payload, { headers: { Accept: "application/json" } })
                : await axios.post(route("activities.store", dayId), payload);
            onSaved?.({ ...activity, ...saved });
        } catch (failure) {
            setError(firstError(failure, "L’activité n’a pas pu être enregistrée."));
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Type</p>
                <div className="flex flex-wrap gap-1.5">
                    {Object.entries(CATEGORY_STYLE).map(([key, style]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setData((current) => ({ ...current, category: key }))}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${data.category === key ? "bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"}`}
                        >
                            <style.Icon className="h-3.5 w-3.5" /> {style.label}
                        </button>
                    ))}
                </div>
            </div>

            <input autoFocus required maxLength={191} placeholder="Nom de l’activité (ex. Musée national)" value={data.title} onChange={set("title")} className={`${field} text-base font-semibold`} />

            <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Moment de la journée</p>
                <div className="grid grid-cols-5 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    {PERIOD_STYLE.map(({ key, label, Icon, tint }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setData((current) => ({ ...current, period: key }))}
                            className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-bold transition ${data.period === key ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}
                        >
                            <Icon className={`h-4 w-4 ${tint}`} /> <span className="truncate">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <IconField icon={Clock3}><input type="time" value={data.start_time} onChange={set("start_time")} className={`${field} pl-9`} /></IconField>
                <IconField icon={Euro}><input type="number" step="0.01" min="0" placeholder="Prix / pers." value={data.price} onChange={set("price")} className={`${field} pl-9`} /></IconField>
                <IconField icon={MapPin}><input placeholder="Lieu" value={data.location_name} onChange={set("location_name")} className={`${field} pl-9`} /></IconField>
            </div>

            <textarea rows={3} placeholder="Infos utiles : adresse, horaires, conseils…" value={data.description} onChange={set("description")} className={field} />
            <IconField icon={Link2}><input type="url" placeholder="Lien du site ou de la réservation (facultatif)" value={data.source_url} onChange={set("source_url")} className={`${field} pl-9`} /></IconField>

            {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</button>
                <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 disabled:opacity-50">
                    {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} {activity ? "Enregistrer" : "Ajouter l’activité"}
                </button>
            </div>
        </form>
    );
}
