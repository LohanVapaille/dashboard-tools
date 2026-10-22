import { useMemo, useState } from "react";
import axios from "axios";
import { Link } from "@inertiajs/react";
import { BedDouble, ExternalLink, Loader2, MapPin, Sparkles, Trash2, Wallet, X } from "lucide-react";
import { PERIODS, transportMeta } from "@/Constants/itinerary";
import { formatDay, nightsBetween } from "@/Utils/stays";
import { formatMoney } from "@/Utils/formatters";
import DynamicIcon from "./DynamicIcon";

const periodLabel = (value) =>
    PERIODS.find((period) => period.key === value)?.label || value;

const MODE_HINTS = {
    draft: "Vos séjours sont encore vides : l'IA les garde s'ils correspondent à votre demande, ou les découpe en plusieurs étapes (une par ville où dormir) si vous voulez visiter plusieurs endroits.",
    empty: "Aucun séjour pour l'instant : l'IA construit tout le voyage. Une seule destination donne un seul séjour ; un road trip ou un circuit crée un séjour à chaque changement de lieu où dormir.",
    partial: "Vos séjours sont conservés tels quels. L'IA leur ajoute des activités et propose de nouveaux séjours pour les nuits encore sans logement.",
    full: "Toutes les nuits ont déjà un séjour : l'IA propose des activités pour ces jours, au bon endroit.",
};

export default function AIItineraryModal({ trip, onClose, onStored, authenticated }) {
    const [interests, setInterests] = useState("");
    const [stays, setStays] = useState([]);
    const [replaced, setReplaced] = useState([]);
    const [loading, setLoading] = useState(false);
    const [storing, setStoring] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const travelers = trip.travelers || 1;

    const mode = useMemo(() => {
        const existing = trip.stays || [];
        if (!existing.length) return "empty";
        const isEmptyStay = (stay) => (stay.days || []).every((day) => !day.activities?.length && !day.blocks?.length);
        if (existing.every(isEmptyStay)) return "draft";
        const nights = nightsBetween(trip.start_date, trip.end_date);
        const covered = new Set();
        existing.forEach((stay) => {
            const date = new Date(`${stay.arrival_date}T00:00:00Z`);
            const end = new Date(`${stay.departure_date}T00:00:00Z`);
            for (; date < end; date.setUTCDate(date.getUTCDate() + 1)) covered.add(date.toISOString().slice(0, 10));
        });
        return covered.size >= nights ? "full" : "partial";
    }, [trip]);

    const estimate = useMemo(() => {
        const activities = stays.reduce((sum, stay) => sum + stay.days.reduce((daySum, day) => daySum + day.activities.reduce((total, activity) => total + (Number(activity.price) || 0), 0), 0), 0) * travelers;
        const lodging = stays.reduce((sum, stay) => sum + (Number(stay.accommodation_cost) || 0), 0);
        const transport = stays.reduce((sum, stay) => sum + (Number(stay.transport_from_previous?.cost) || 0), 0);
        return { activities, lodging, transport, total: activities + lodging + transport };
    }, [stays, travelers]);

    const activityCount = stays.reduce((sum, stay) => sum + stay.days.reduce((count, day) => count + day.activities.length, 0), 0);
    const newStays = stays.filter((stay) => stay.is_new).length;

    const generate = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");
        try {
            const response = await axios.post(
                route("trips.ai-itinerary.generate", trip.id),
                { interests },
            );
            setStays(response.data.stays || []);
            setReplaced(response.data.replaced || []);
            if (!response.data.stays?.length) setError("L'IA n'a rien proposé d'exploitable. Précisez votre demande puis réessayez.");
        } catch (requestError) {
            const status = requestError.response?.status;
            const serverMessage = requestError.response?.data?.message || "";
            const readableError = status === 503
                ? "Le service IA est momentanément très sollicité. Réessayez dans quelques instants."
                : status === 429
                    ? "La limite de génération a été atteinte. Réessayez plus tard ou choisissez l'offre Premium."
                    : status >= 500
                        ? "Le service IA rencontre un problème temporaire. Réessayez dans quelques instants."
                        : serverMessage && !serverMessage.toLowerCase().includes("http request")
                            ? serverMessage
                            : "Impossible de générer le programme pour le moment. Vérifiez votre connexion puis réessayez.";
            setError(
                status === 429 && !requestError.response?.data?.message
                    ? "Vous avez atteint vos 3 générations gratuites du jour. Revenez demain ou choisissez l'offre Premium."
                    : readableError,
            );
        } finally {
            setLoading(false);
        }
    };

    const removeStay = (stayIndex) => setStays((current) => current.filter((_, index) => index !== stayIndex));

    const removeActivity = (stayIndex, date, activityIndex) =>
        setStays((current) => current.map((stay, index) => index !== stayIndex ? stay : {
            ...stay,
            days: stay.days
                .map((day) => day.date !== date ? day : { ...day, activities: day.activities.filter((_, i) => i !== activityIndex) })
                .filter((day) => day.activities.length),
        }));

    const store = async () => {
        setStoring(true);
        setError("");
        setSuccess("");
        try {
            const response = await axios.post(route("trips.ai-itinerary.store", trip.id), { stays });
            if (!response.data.created && !response.data.stays) {
                throw new Error("Aucune proposition valide n'a été reçue.");
            }
            setSuccess(
                [
                    response.data.stays ? `${response.data.stays} séjour(s)` : null,
                    `${response.data.created} activité(s)`,
                ].filter(Boolean).join(" et ") + " ajouté(s) au voyage.",
            );
            setTimeout(onStored, 500);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    requestError.message ||
                    "Impossible d'enregistrer le programme.",
            );
        } finally {
            setStoring(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl dark:bg-slate-800">
                <div className="relative flex items-center justify-between border-b border-slate-200 p-5 pr-16 dark:border-slate-700">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                            <Sparkles className="h-5 w-5 text-violet-500" />
                            Suggérer un programme avec l&apos;IA
                        </h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Les suggestions seront vérifiées avant d'être ajoutées.
                        </p>
                        <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200">
                            {MODE_HINTS[mode]}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer la fenêtre"
                        className="absolute right-5 top-5 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {!authenticated ? (
                    <div className="p-8 text-center">
                        <Sparkles className="mx-auto h-10 w-10 text-violet-500" />
                        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                            Créez un compte gratuit pour utiliser l&apos;IA
                        </h3>
                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
                            La génération d&apos;itinéraire est réservée aux membres connectés.
                            Vous disposez ensuite de 3 générations gratuites par jour, tous voyages confondus.
                        </p>
                        <div className="mt-5 flex justify-center gap-3">
                            <Link href={route("register")} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
                                Créer un compte
                            </Link>
                            <Link href={route("login")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200">
                                Se connecter
                            </Link>
                        </div>
                    </div>
                ) : (
                <div className="overflow-y-auto p-5">
                    <form onSubmit={generate} className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            Votre envie de voyage, vos centres d'intérêt et contraintes
                            <textarea
                                value={interests}
                                onChange={(event) => setInterests(event.target.value)}
                                rows={3}
                                maxLength={3000}
                                placeholder={mode === "full"
                                    ? "Ex : gastronomie locale, musées, randonnées faciles, activités avec enfants, budget modéré..."
                                    : "Ex : un road trip pour visiter le Portugal en voiture, ou une semaine tranquille à Rome. Gastronomie, plages, budget modéré..."}
                                className="mt-1 w-full rounded-lg border-slate-300 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {loading ? "Génération..." : stays.length ? "Proposer autre chose" : "Suggérer un programme avec l'IA"}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                            <p>{error}</p>
                            {error.includes("3 générations") && (
                                <Link
                                    href={route("billing.show")}
                                    className="mt-2 inline-block font-bold underline"
                                >
                                    Voir l'offre Premium à 5 €/mois
                                </Link>
                            )}
                        </div>
                    )}
                    {success && (
                        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {success}
                        </p>
                    )}

                    {stays.length > 0 && (
                        <div className="mt-6 space-y-4">
                            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
                                <p className="flex items-center gap-2 text-sm font-bold text-orange-800 dark:text-orange-200">
                                    <Wallet className="h-4 w-4" /> Budget estimé de cette proposition : {formatMoney(estimate.total)}
                                </p>
                                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-orange-900/80 dark:text-orange-100/80">
                                    <span>Activités : <strong>{formatMoney(estimate.activities)}</strong></span>
                                    <span>Logements : <strong>{formatMoney(estimate.lodging)}</strong></span>
                                    <span>Trajets : <strong>{formatMoney(estimate.transport)}</strong></span>
                                </div>
                                <p className="mt-2 text-[11px] text-orange-900/60 dark:text-orange-100/60">
                                    Estimations indicatives pour {travelers} voyageur{travelers > 1 ? "s" : ""}, modifiables ensuite dans l'onglet Budget.
                                </p>
                            </div>

                            <h3 className="font-bold text-slate-900 dark:text-white">
                                Prévisualisation
                            </h3>
                            {replaced.length > 0 && stays.some((stay) => stay.is_new) && (
                                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                                    Remplace {replaced.length > 1 ? "les séjours" : "le séjour"} vide{replaced.length > 1 ? "s" : ""}{" "}
                                    <strong>{replaced.map((stay) => stay.location_name).join(", ")}</strong> par les étapes ci-dessous.
                                    {replaced.some((stay) => stay.accommodation_cost != null) && " Le coût de logement saisi sur ce séjour sera remplacé par les estimations des nouvelles étapes."}
                                </p>
                            )}
                            {stays.map((stay, stayIndex) => (
                                <section key={`${stay.id ?? "new"}-${stay.arrival_date}`} className={`rounded-xl border p-4 ${stay.is_new ? "border-violet-300 dark:border-violet-800" : "border-slate-200 dark:border-slate-700"}`}>
                                    {stay.transport_from_previous && (
                                        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                                            <DynamicIcon name={stay.transport_from_previous.mode} className="h-3.5 w-3.5" />
                                            {transportMeta(stay.transport_from_previous.mode).label}
                                            {stay.transport_from_previous.duration_minutes && ` · ${Math.floor(stay.transport_from_previous.duration_minutes / 60)} h ${String(stay.transport_from_previous.duration_minutes % 60).padStart(2, "0")}`}
                                            {stay.transport_from_previous.cost != null && ` · ${formatMoney(stay.transport_from_previous.cost)}`}
                                        </p>
                                    )}
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${stay.is_new ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                                                {stay.is_new ? "Nouveau séjour" : "Séjour existant"}
                                            </span>
                                            <h4 className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                                                <MapPin className="h-4 w-4 text-violet-500" /> {stay.location_name}
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                                {formatDay(stay.arrival_date)} → {formatDay(stay.departure_date)} · {nightsBetween(stay.arrival_date, stay.departure_date)} nuit(s)
                                            </p>
                                            {(stay.accommodation_type || stay.accommodation_cost != null) && (
                                                <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                                                    <BedDouble className="h-3.5 w-3.5" />
                                                    {stay.accommodation_type}
                                                    {stay.accommodation_cost != null && <strong> · ~{formatMoney(stay.accommodation_cost)}</strong>}
                                                </p>
                                            )}
                                        </div>
                                        {stay.is_new && (
                                            <button type="button" onClick={() => removeStay(stayIndex)} title="Retirer ce séjour" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-3 space-y-3">
                                        {stay.days.map((day) => (
                                            <div key={day.date}>
                                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{formatDay(day.date)}</p>
                                                <div className="mt-1 space-y-2">
                                                    {day.activities.map((activity, index) => (
                                                        <div key={`${day.date}-${index}`} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                                                                        {activity.title}
                                                                    </p>
                                                                    <p className="text-xs text-violet-600 dark:text-violet-400">
                                                                        {periodLabel(activity.period)} · {activity.category}
                                                                        {activity.price != null && ` · ${activity.price > 0 ? `${formatMoney(activity.price)} / pers.` : "gratuit"}`}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    {activity.source_url && (
                                                                        <a href={activity.source_url} target="_blank" rel="noreferrer" className="p-1 text-violet-600">
                                                                            <ExternalLink className="h-4 w-4" />
                                                                        </a>
                                                                    )}
                                                                    <button type="button" onClick={() => removeActivity(stayIndex, day.date, index)} title="Retirer cette activité" className="rounded p-1 text-slate-400 hover:text-rose-600">
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {activity.description && (
                                                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                                    {activity.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {!stay.days.length && <p className="text-xs italic text-slate-400">Aucune activité proposée pour ce séjour.</p>}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
                )}

                {stays.length > 0 && (
                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-700">
                        <p className="mr-auto text-xs text-slate-500">
                            {newStays > 0 && `${newStays} séjour(s) · `}{activityCount} activité(s)
                        </p>
                        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600">
                            Annuler
                        </button>
                        <button
                            onClick={store}
                            disabled={storing || (!activityCount && !newStays)}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {storing ? "Enregistrement..." : "Ajouter au voyage"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
