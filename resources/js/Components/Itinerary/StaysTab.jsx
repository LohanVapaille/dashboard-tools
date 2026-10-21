import { useState } from "react";
import axios from "axios";
import { BedDouble, ExternalLink, Search } from "lucide-react";
import { formatDate } from "@/Utils/formatters";
import DateRangePicker from "@/Components/DateRangePicker";

const providerMeta = {
    "Booking.com": "https://cdn.simpleicons.org/bookingdotcom/003580",
    Airbnb: "https://cdn.simpleicons.org/airbnb/FF385C",
    Expedia: "https://cdn.simpleicons.org/expedia/FFCC00",
    "Google Hotels": "https://cdn.simpleicons.org/google/4285F4",
};

export default function StaysTab({ trip }) {
    const [form, setForm] = useState({
        destination: trip.stays?.[0]?.location_name || "",
        check_in: trip.start_date || "",
        check_out: trip.end_date || "",
        guests: 1,
        budget: "",
    });
    const [providers, setProviders] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
    const search = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        try {
            const response = await axios.post(route("trips.travel-search.lodgings", trip.id), form);
            setProviders(response.data.providers || []);
        } catch (searchError) {
            setError(
                searchError.response?.data?.errors?.destination?.[0]
                || searchError.response?.data?.message
                || "La recherche de logements a échoué.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                    <BedDouble className="h-5 w-5 text-indigo-600" />
                    Logements et séjours
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Retrouvez les hébergements associés à votre itinéraire.
                </p>
            </div>
            <form onSubmit={search} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Destination
                        <input required value={form.destination} onChange={(event) => update("destination", event.target.value)} placeholder="Ville ou destination" className="mt-1 w-full rounded-lg border-slate-300 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nombre de voyageurs
                        <input required type="number" min="1" max="20" value={form.guests} onChange={(event) => update("guests", event.target.value)} className="mt-1 w-full rounded-lg border-slate-300 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Budget maximum par nuit <span className="font-normal">(facultatif)</span>
                        <input type="number" min="0" value={form.budget} onChange={(event) => update("budget", event.target.value)} placeholder="Ex. 150" className="mt-1 w-full rounded-lg border-slate-300 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                    </label>
                    <DateRangePicker startDate={form.check_in} endDate={form.check_out} onChange={(check_in, check_out) => setForm((current) => ({ ...current, check_in, check_out }))} />
                    <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                        <Search className="h-4 w-4" /> Rechercher des logements
                    </button>
                </div>
            </form>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
            {providers.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Les disponibilités et les prix sont vérifiés directement chez chaque fournisseur.
                </div>
            )}
            {providers.length > 0 && <h3 className="text-lg font-bold text-slate-900 dark:text-white">Rechercher chez un fournisseur</h3>}
            {providers.length > 0 && <div className="grid gap-4 sm:grid-cols-2">
                {providers.map((provider) => (
                    <a key={provider.name} href={provider.url} target="_blank" rel="noreferrer" className="group flex min-h-36 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-900">
                            <img src={providerMeta[provider.name]} alt="" className="h-8 w-8 object-contain" />
                        </span>
                        <span className="mt-3 font-bold text-slate-900 dark:text-white">{provider.name}</span>
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-normal text-slate-500">Voir les disponibilités <ExternalLink className="h-3 w-3" /></span>
                    </a>
                ))}
            </div>}
            {trip.stays?.length ? (
                trip.stays.map((stay) => (
                    <div
                        key={stay.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                    >
                        <p className="font-bold text-slate-900 dark:text-white">
                            {stay.location_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Du {formatDate(stay.arrival_date)} au{" "}
                            {formatDate(stay.departure_date)}
                        </p>
                        {stay.notes && (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                {stay.notes}
                            </p>
                        )}
                    </div>
                ))
            ) : (
                <p className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400 dark:border-slate-700">
                    Aucun logement enregistré.
                </p>
            )}
        </div>
    );
}
