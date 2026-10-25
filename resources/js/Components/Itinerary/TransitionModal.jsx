import { useForm } from "@inertiajs/react";
import { Bus, Car, Plane, Ship, TrainFront } from "lucide-react";
import ActivitySheet from "@/Components/Itinerary/ActivitySheet";

export const TRANSPORT_STYLE = {
    flight: { label: "Avion", Icon: Plane, number: "N° de vol", from: "Terminal / porte au départ", to: "Terminal à l’arrivée", seat: "Siège(s)" },
    train: { label: "Train", Icon: TrainFront, number: "N° de train", from: "Gare / quai de départ", to: "Gare d’arrivée", seat: "Voiture et place(s)" },
    bus: { label: "Bus", Icon: Bus, number: "N° de ligne", from: "Arrêt de départ", to: "Arrêt d’arrivée", seat: "Place(s)" },
    ferry: { label: "Ferry", Icon: Ship, number: "Navire / traversée", from: "Port de départ", to: "Port d’arrivée", seat: "Cabine / siège" },
    car: { label: "Voiture", Icon: Car, number: "Véhicule", from: "Prise en charge", to: "Restitution", seat: "Conducteurs" },
};

const field = "w-full rounded-xl border-slate-300 text-sm focus:border-sky-500 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const Field = ({ label, children, wide }) => (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        {children}
    </label>
);
const toInput = (value) => (value ? String(value).replace(" ", "T").slice(0, 16) : "");

/** Trajet entre deux étapes : mode, coût, et tout le détail du billet (référence, n° de vol, horaires…). */
export default function TransitionModal({ onClose, tripId, fromStay, toStay, transition = null }) {
    const { data, setData, post, put, processing, errors } = useForm({
        from_stay_id: fromStay?.id ?? transition?.from_stay_id,
        to_stay_id: toStay?.id ?? transition?.to_stay_id,
        transport_mode: transition?.transport_mode || "train",
        duration_minutes: transition?.duration_minutes ?? "",
        distance_km: transition?.distance_km ?? "",
        cost: transition?.cost ?? "",
        reference: transition?.reference || "",
        carrier: transition?.carrier || "",
        service_number: transition?.service_number || "",
        departure_at: toInput(transition?.departure_at),
        arrival_at: toInput(transition?.arrival_at),
        departure_place: transition?.departure_place || "",
        arrival_place: transition?.arrival_place || "",
        seat: transition?.seat || "",
        baggage: transition?.baggage || "",
        booking_url: transition?.booking_url || "",
        notes: transition?.notes || "",
    });
    const style = TRANSPORT_STYLE[data.transport_mode] || TRANSPORT_STYLE.car;
    const set = (key) => (event) => setData(key, event.target.value);

    const submit = (event) => {
        event.preventDefault();
        const options = { onSuccess: onClose, preserveScroll: true };
        transition ? put(route("transitions.update", transition.id), options) : post(route("transitions.store", tripId), options);
    };

    const from = (fromStay?.location_name || transition?.from_stay?.location_name || "").split(",")[0];
    const to = (toStay?.location_name || transition?.to_stay?.location_name || "").split(",")[0];

    return (
        <ActivitySheet title={from && to ? `${from} → ${to}` : "Trajet"} subtitle="Trajet et billet" Icon={style.Icon} gradient="from-sky-500 to-indigo-600" onClose={onClose}>
            <form onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-5 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    {Object.entries(TRANSPORT_STYLE).map(([key, mode]) => (
                        <button key={key} type="button" onClick={() => setData("transport_mode", key)} className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-bold transition ${data.transport_mode === key ? "bg-white text-sky-700 shadow dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}>
                            <mode.Icon className="h-4 w-4" /> {mode.label}
                        </button>
                    ))}
                </div>

                <fieldset className="grid gap-3 sm:grid-cols-2">
                    <legend className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Billet</legend>
                    <Field label="N° de réservation"><input value={data.reference} onChange={set("reference")} placeholder="PNR, n° de dossier" className={`${field} font-mono uppercase`} /></Field>
                    <Field label="Compagnie"><input value={data.carrier} onChange={set("carrier")} placeholder="Air France, SNCF…" className={field} /></Field>
                    <Field label={style.number}><input value={data.service_number} onChange={set("service_number")} className={field} /></Field>
                    <Field label={style.seat}><input value={data.seat} onChange={set("seat")} className={field} /></Field>
                    <Field label="Départ"><input type="datetime-local" value={data.departure_at} onChange={set("departure_at")} className={field} /></Field>
                    <Field label="Arrivée"><input type="datetime-local" value={data.arrival_at} min={data.departure_at || undefined} onChange={set("arrival_at")} className={field} /></Field>
                    <Field label={style.from}><input value={data.departure_place} onChange={set("departure_place")} className={field} /></Field>
                    <Field label={style.to}><input value={data.arrival_place} onChange={set("arrival_place")} className={field} /></Field>
                    <Field label="Bagages / options" wide><input value={data.baggage} onChange={set("baggage")} placeholder="1 cabine + 1 soute 23 kg" className={field} /></Field>
                    <Field label="Lien du billet ou de la réservation" wide><input type="url" value={data.booking_url} onChange={set("booking_url")} placeholder="https://" className={field} /></Field>
                </fieldset>

                <fieldset className="grid gap-3 sm:grid-cols-3">
                    <legend className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Trajet</legend>
                    <Field label="Coût total (€)"><input type="number" step="0.01" min="0" value={data.cost} onChange={set("cost")} className={field} /></Field>
                    <Field label="Durée (min)"><input type="number" min="0" value={data.duration_minutes} onChange={set("duration_minutes")} className={field} /></Field>
                    <Field label="Distance (km)"><input type="number" min="0" value={data.distance_km} onChange={set("distance_km")} className={field} /></Field>
                </fieldset>

                <Field label="Notes"><textarea rows={2} value={data.notes} onChange={set("notes")} className={field} /></Field>

                {Object.keys(errors).length > 0 && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{Object.values(errors)[0]}</p>}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</button>
                    <button disabled={processing} className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50">
                        {transition ? "Enregistrer" : "Ajouter le trajet"}
                    </button>
                </div>
            </form>
        </ActivitySheet>
    );
}
