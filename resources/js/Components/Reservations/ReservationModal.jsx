import { useEffect, useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import { CheckCircle2, LoaderCircle, X } from "lucide-react";
import { firstError } from "@/Utils/flights";
import { KIND_META } from "@/Components/Reservations/kinds";

const field = "w-full rounded-xl border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

// Informations propres au billet, rangées dans `details` : n° de vol ou de train, terminal, siège…
export const TICKET_FIELDS = {
    flight: [
        ["carrier", "Compagnie", "Air France"],
        ["number", "N° de vol", "AF 1234"],
        ["departure_terminal", "Terminal / porte au départ", "2E · porte K42"],
        ["arrival_terminal", "Terminal à l’arrivée", "T1"],
        ["seat", "Siège(s)", "12A, 12B"],
        ["cabin", "Classe / tarif", "Économique Light"],
        ["baggage", "Bagages", "1 cabine + 1 soute 23 kg"],
        ["check_in", "Enregistrement", "En ligne 24 h avant"],
    ],
    train: [
        ["carrier", "Compagnie", "SNCF, Trenitalia…"],
        ["number", "N° de train", "TGV 6201"],
        ["departure_terminal", "Gare / quai de départ", "Paris Gare de Lyon · voie 7"],
        ["arrival_terminal", "Gare d’arrivée", "Lyon Part-Dieu"],
        ["coach", "Voiture", "12"],
        ["seat", "Place(s)", "45, 46"],
        ["cabin", "Classe", "2de classe"],
    ],
    bus: [
        ["carrier", "Compagnie", "FlixBus"],
        ["number", "N° de ligne", "N 702"],
        ["departure_terminal", "Arrêt de départ", "Bercy Seine"],
        ["arrival_terminal", "Arrêt d’arrivée", ""],
        ["seat", "Place(s)", ""],
        ["baggage", "Bagages", ""],
    ],
    ferry: [
        ["carrier", "Compagnie", "Corsica Ferries"],
        ["number", "Navire / traversée", ""],
        ["departure_terminal", "Port / terminal", ""],
        ["seat", "Cabine / siège", ""],
        ["baggage", "Véhicule", "Voiture < 5 m"],
    ],
    car: [
        ["carrier", "Loueur / chauffeur", "Sixt, Welcome Pickups…"],
        ["number", "Véhicule", "Catégorie C · automatique"],
        ["departure_terminal", "Prise en charge", "Aéroport, comptoir hall 2"],
        ["arrival_terminal", "Restitution", ""],
        ["baggage", "Options", "Assurance, 2e conducteur"],
    ],
};

const Label = ({ label, children, className = "" }) => (
    <label className={`block ${className}`}>
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        {children}
    </label>
);

/**
 * Enregistrer (ou modifier) une réservation faite chez un partenaire.
 * `prompt` : ouverte au retour du site partenaire, avec les infos déjà connues pré-remplies.
 */
export default function ReservationModal({ trip, draft, prompt = false, kinds, onClose }) {
    const editing = Boolean(draft?.id);
    const [data, setData] = useState({
        kind: draft?.kind || kinds?.[0] || "other",
        title: draft?.title || "",
        provider: draft?.provider || "",
        reference: draft?.reference || "",
        starts_at: draft?.starts_at?.slice(0, 16) || "",
        ends_at: draft?.ends_at?.slice(0, 16) || "",
        origin: draft?.origin || "",
        destination: draft?.destination || "",
        address: draft?.address || "",
        travelers: draft?.travelers || trip.travelers || 1,
        price: draft?.price ?? "",
        currency: draft?.currency || "EUR",
        url: draft?.url || "",
        notes: draft?.notes || "",
        details: draft?.details || null,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [confirmed, setConfirmed] = useState(!prompt);
    const meta = KIND_META[data.kind] || KIND_META.other;
    const isStay = data.kind === "stay";
    const isTransport = ["flight", "train", "bus", "car", "ferry"].includes(data.kind);

    useEffect(() => {
        const onKey = (event) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const set = (key) => (event) => setData((current) => ({ ...current, [key]: event.target.value }));
    const setDetail = (key) => (event) => setData((current) => ({ ...current, details: { ...(current.details || {}), [key]: event.target.value } }));
    const ticketFields = TICKET_FIELDS[data.kind] || [];

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        const payload = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value === "" ? null : value]));
        try {
            if (editing) await axios.put(route("trips.reservations.update", [trip.id, draft.id]), payload);
            else await axios.post(route("trips.reservations.store", trip.id), payload);
            router.reload({ only: ["trip"], preserveScroll: true });
            onClose(true);
        } catch (failure) {
            setError(firstError(failure, "La réservation n’a pas pu être enregistrée."));
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
                <header className={`flex items-start justify-between gap-4 bg-gradient-to-r px-6 py-5 text-white ${meta.gradient}`}>
                    <div className="flex items-center gap-3">
                        <span className="rounded-2xl bg-white/20 p-2.5"><meta.Icon className="h-5 w-5" /></span>
                        <div>
                            <h3 className="text-lg font-black">{prompt ? `Réservé sur ${draft?.provider || "le site partenaire"} ?` : editing ? "Modifier la réservation" : "Ajouter une réservation"}</h3>
                            <p className="text-xs text-white/80">{prompt ? "Gardez votre billet ou votre logement avec le reste du voyage." : "Billet, logement ou activité réservé ailleurs."}</p>
                        </div>
                    </div>
                    <button onClick={() => onClose()} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Fermer"><X className="h-4 w-4" /></button>
                </header>

                {!confirmed ? (
                    <div className="space-y-4 p-6">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Si vous avez finalisé l’achat, enregistrez-le ici : vous retrouverez {isStay ? "votre logement" : "votre billet"} dans l’onglet {isStay ? "Logements" : "Transports"}, avec la référence et les dates, pour vous et vos compagnons de voyage.
                        </p>
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
                            <p className="font-bold text-slate-800 dark:text-slate-100">{data.title}</p>
                            {(data.origin || data.destination) && <p className="text-slate-500">{data.origin} → {data.destination}</p>}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button onClick={() => setConfirmed(true)} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-3 text-sm font-bold text-white shadow ${meta.gradient}`}>
                                <CheckCircle2 className="h-4 w-4" /> Oui, je l’enregistre
                            </button>
                            <button onClick={() => onClose()} className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
                                Pas encore
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                        <div className="grid flex-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
                            <Label label="Type" className="sm:col-span-2">
                                <div className="flex flex-wrap gap-1.5">
                                    {(kinds || Object.keys(KIND_META)).map((key) => {
                                        const option = KIND_META[key];
                                        return (
                                            <button key={key} type="button" onClick={() => setData((current) => ({ ...current, kind: key }))} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${data.kind === key ? "bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900" : "bg-white text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"}`}>
                                                <option.Icon className="h-3.5 w-3.5" /> {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Label>
                            <Label label={isStay ? "Logement" : "Intitulé"} className="sm:col-span-2">
                                <input required value={data.title} onChange={set("title")} placeholder={isStay ? "Hôtel des Arts" : "Vol Paris → Reykjavík"} className={field} />
                            </Label>
                            <Label label="Réservé chez"><input value={data.provider} onChange={set("provider")} placeholder="Booking.com, Air France…" className={field} /></Label>
                            <Label label="N° de réservation"><input value={data.reference} onChange={set("reference")} placeholder="ABC123" className={`${field} font-mono uppercase`} /></Label>
                            {isTransport && (
                                <>
                                    <Label label="Départ de"><input value={data.origin} onChange={set("origin")} className={field} /></Label>
                                    <Label label="Arrivée à"><input value={data.destination} onChange={set("destination")} className={field} /></Label>
                                </>
                            )}
                            {ticketFields.length > 0 && (
                                <fieldset className="grid gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 sm:col-span-2 sm:grid-cols-2">
                                    <legend className="px-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Détails du billet</legend>
                                    {ticketFields.map(([key, label, placeholder]) => (
                                        <Label key={key} label={label}>
                                            <input value={data.details?.[key] || ""} onChange={setDetail(key)} placeholder={placeholder} className={field} />
                                        </Label>
                                    ))}
                                </fieldset>
                            )}
                            {(isStay || data.kind === "activity") && (
                                <Label label="Adresse" className="sm:col-span-2"><input value={data.address} onChange={set("address")} className={field} /></Label>
                            )}
                            <Label label={isStay ? "Arrivée" : "Départ"}><input type="datetime-local" value={data.starts_at} onChange={set("starts_at")} className={field} /></Label>
                            <Label label={isStay ? "Départ" : "Arrivée"}><input type="datetime-local" value={data.ends_at} min={data.starts_at || undefined} onChange={set("ends_at")} className={field} /></Label>
                            <Label label="Prix payé">
                                <div className="flex gap-2">
                                    <input type="number" min="0" step="0.01" value={data.price} onChange={set("price")} className={field} />
                                    <select value={data.currency} onChange={set("currency")} className={`${field} w-24`}>
                                        {["EUR", "USD", "GBP", "CHF", "CAD", "JPY", "ISK"].map((code) => <option key={code}>{code}</option>)}
                                    </select>
                                </div>
                            </Label>
                            <Label label="Voyageurs"><input type="number" min="1" max="99" value={data.travelers} onChange={set("travelers")} className={field} /></Label>
                            <Label label="Lien (e-billet, gestion de la réservation)" className="sm:col-span-2"><input type="url" value={data.url} onChange={set("url")} placeholder="https://" className={field} /></Label>
                            <Label label="Notes" className="sm:col-span-2"><textarea rows={2} value={data.notes} onChange={set("notes")} placeholder="Siège 12A, bagage en soute inclus…" className={field} /></Label>
                            {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
                        </div>
                        <footer className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                            <button type="button" onClick={() => onClose()} className="px-4 py-2 text-sm font-semibold text-slate-500">Annuler</button>
                            <button disabled={saving} className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-bold text-white shadow disabled:opacity-50 ${meta.gradient}`}>
                                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Enregistrer
                            </button>
                        </footer>
                    </form>
                )}
            </div>
        </div>
    );
}
