import { useState } from "react";
import axios from "axios";
import { Link } from "@inertiajs/react";
import { Sparkles, X, ExternalLink, Loader2 } from "lucide-react";
import { PERIODS } from "@/Constants/itinerary";

const periodLabel = (value) =>
    PERIODS.find((period) => period.key === value)?.label || value;

export default function AIItineraryModal({ trip, onClose, onStored, authenticated }) {
    const [interests, setInterests] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [storing, setStoring] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const generate = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        try {
            const response = await axios.post(
                route("trips.ai-itinerary.generate", trip.id),
                { interests },
            );
            setSuggestions(response.data.days || []);
        } catch (requestError) {
            setError(
                (requestError.response?.status === 429
                    ? "Vous avez atteint vos 3 générations gratuites du jour. Revenez demain ou choisissez l'offre Premium."
                    : null) ||
                    requestError.response?.data?.message ||
                    "La génération de l'itinéraire a échoué.",
            );
        } finally {
            setLoading(false);
        }
    };

    const store = async () => {
        setStoring(true);
        setError("");
        setSuccess("");
        try {
            const response = await axios.post(route("trips.ai-itinerary.store", trip.id), {
                days: suggestions,
            });
            if (!response.data.created) {
                throw new Error("Aucune activité valide n'a été reçue.");
            }
            setSuccess(`${response.data.created} activité(s) ajoutée(s) au voyage.`);
            setTimeout(onStored, 500);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                    requestError.message ||
                    "Impossible d'enregistrer les activités.",
            );
        } finally {
            setStoring(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                            <Sparkles className="h-5 w-5 text-indigo-500" />
                            Suggérer un itinéraire avec l'IA
                        </h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Les suggestions seront vérifiées avant d'être ajoutées.
                        </p>
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                            <strong>Attention :</strong> pensez à créer vos séjours
                            avec les dates et les destinations correctement associées.
                            Si votre voyage comporte plusieurs destinations, vérifiez
                            bien les dates de chaque séjour afin que les activités
                            soient proposées au bon endroit et au bon moment.
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {!authenticated ? (
                    <div className="p-8 text-center">
                        <Sparkles className="mx-auto h-10 w-10 text-indigo-500" />
                        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                            Créez un compte gratuit pour utiliser l&apos;IA
                        </h3>
                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
                            La génération d&apos;itinéraire est réservée aux membres connectés.
                            Vous disposez ensuite de 3 générations gratuites par jour, tous voyages confondus.
                        </p>
                        <div className="mt-5 flex justify-center gap-3">
                            <Link href={route("register")} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
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
                            Vos centres d'intérêt et contraintes
                            <textarea
                                value={interests}
                                onChange={(event) => setInterests(event.target.value)}
                                rows={3}
                                maxLength={3000}
                                placeholder="Ex : gastronomie locale, musées, randonnées faciles, activités avec enfants, budget modéré..."
                                className="mt-1 w-full rounded-lg border-slate-300 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {loading ? "Génération..." : "Générer des suggestions"}
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

                    {suggestions.length > 0 && (
                        <div className="mt-6 space-y-4">
                            <h3 className="font-bold text-slate-900 dark:text-white">
                                Prévisualisation
                            </h3>
                            {suggestions.map((day) => (
                                <section key={day.day_id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                                        {day.date} · {day.location}
                                    </h4>
                                    <div className="mt-2 space-y-2">
                                        {day.activities.map((activity, index) => (
                                            <div key={`${day.day_id}-${index}`} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                                                            {activity.title}
                                                        </p>
                                                        <p className="text-xs text-indigo-600 dark:text-indigo-400">
                                                            {periodLabel(activity.period)} · {activity.category}
                                                        </p>
                                                    </div>
                                                    {activity.source_url && (
                                                        <a href={activity.source_url} target="_blank" rel="noreferrer" className="text-indigo-600">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                                {activity.description && (
                                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                        {activity.description}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
                )}

                {suggestions.length > 0 && (
                    <div className="flex justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-700">
                        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600">
                            Annuler
                        </button>
                        <button
                            onClick={store}
                            disabled={storing}
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
