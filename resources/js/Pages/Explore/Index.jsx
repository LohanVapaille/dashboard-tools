import { useState } from "react";
import axios from "axios";
import { Head, router } from "@inertiajs/react";
import { Compass, LoaderCircle, Search, X } from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";
import PublicTripCard from "@/Components/Trips/PublicTripCard";
import DuplicateTripModal from "@/Components/Trips/DuplicateTripModal";
import { formatMoney } from "@/Utils/formatters";

const DURATIONS = [
    { label: "Week-end", min: 1, max: 3 },
    { label: "4 à 7 j", min: 4, max: 7 },
    { label: "8 à 14 j", min: 8, max: 14 },
    { label: "15 j et +", min: 15, max: null },
];
const BUDGETS = [300, 600, 1000, 2000];
const SORTS = { recent: "Plus récents", popular: "Plus repris", budget: "Budget croissant", days: "Plus courts" };

function Chip({ active, onClick, children }) {
    return (
        <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${active ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"}`}>
            {children}
        </button>
    );
}

export default function ExplorePage(props) {
    // Nouveaux filtres = nouvelle grille (on repart de la première page).
    return <Explore key={JSON.stringify(props.filters)} {...props} />;
}

function Explore({ trips: initialTrips, next: initialNext, total, filters }) {
    const [trips, setTrips] = useState(initialTrips);
    const [next, setNext] = useState(initialNext);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState(filters.q || "");
    const [daysMin, setDaysMin] = useState(filters.days_min ?? "");
    const [daysMax, setDaysMax] = useState(filters.days_max ?? "");
    const [budgetMax, setBudgetMax] = useState(filters.budget_max ?? "");
    const [duplicating, setDuplicating] = useState(null);

    const apply = (changes) => {
        const params = { q: search || undefined, days_min: daysMin || undefined, days_max: daysMax || undefined, budget_max: budgetMax || undefined, sort: filters.sort !== "recent" ? filters.sort : undefined, ...changes };
        const query = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== "" && value !== null).map(([key, value]) => [key, String(value)]));
        const current = Object.fromEntries(Object.entries({ ...filters, sort: filters.sort !== "recent" ? filters.sort : undefined }).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => [key, String(value)]));
        // Champ quitté sans changement : pas de rechargement.
        if (JSON.stringify(query, Object.keys(query).sort()) === JSON.stringify(current, Object.keys(current).sort())) return;
        router.get(route("explore.index"), query, { preserveScroll: true });
    };

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const { data } = await axios.get(next, { headers: { Accept: "application/json" } });
            setTrips((current) => [...current, ...data.trips]);
            setNext(data.next);
        } finally {
            setLoadingMore(false);
        }
    };

    const activeDuration = DURATIONS.find((range) => String(range.min) === String(filters.days_min ?? "") && String(range.max ?? "") === String(filters.days_max ?? ""));
    const hasFilters = filters.q || filters.days_min || filters.days_max || filters.budget_max;

    return (
        <GuestLayout>
            <Head title="Parcourir les voyages" />
            {duplicating && <DuplicateTripModal trip={duplicating} days={duplicating.days} onClose={() => setDuplicating(null)} />}

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 p-6 text-white shadow-xl sm:p-8">
                    <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
                    <div className="relative max-w-2xl">
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-200"><Compass className="h-4 w-4" /> Parcourir</p>
                        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Des voyages tout prêts, à vos dates</h1>
                        <p className="mt-2 text-sm text-indigo-100">Itinéraires publiés par la communauté, avec leur budget. Reprenez-en un : étapes, activités et trajets sont copiés dans votre propre voyage.</p>
                    </div>
                    <form onSubmit={(event) => { event.preventDefault(); apply({}); }} className="relative mt-5 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-1.5 pl-4 shadow-lg">
                        <Search className="h-4 w-4 shrink-0 text-slate-400" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Destination, ville, titre…" className="min-w-0 flex-1 border-0 bg-transparent p-1.5 text-sm text-slate-900 focus:ring-0" />
                        <button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Rechercher</button>
                    </form>
                </section>

                <section className="space-y-3 rounded-2xl bg-white/60 p-4 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="w-20 text-xs font-black uppercase tracking-wider text-slate-500">Durée</span>
                        <Chip active={!filters.days_min && !filters.days_max} onClick={() => { setDaysMin(""); setDaysMax(""); apply({ days_min: undefined, days_max: undefined }); }}>Toutes</Chip>
                        {DURATIONS.map((range) => (
                            <Chip key={range.label} active={activeDuration === range} onClick={() => { setDaysMin(range.min); setDaysMax(range.max ?? ""); apply({ days_min: range.min, days_max: range.max ?? undefined }); }}>{range.label}</Chip>
                        ))}
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            <input type="number" min={1} value={daysMin} onChange={(event) => setDaysMin(event.target.value)} onBlur={() => apply({})} placeholder="min" className="w-16 rounded-lg border-slate-200 py-1 text-xs dark:border-slate-700 dark:bg-slate-900" />
                            à
                            <input type="number" min={1} value={daysMax} onChange={(event) => setDaysMax(event.target.value)} onBlur={() => apply({})} placeholder="max" className="w-16 rounded-lg border-slate-200 py-1 text-xs dark:border-slate-700 dark:bg-slate-900" />
                            jours
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="w-20 text-xs font-black uppercase tracking-wider text-slate-500">Budget</span>
                        <Chip active={!filters.budget_max} onClick={() => { setBudgetMax(""); apply({ budget_max: undefined }); }}>Tous</Chip>
                        {BUDGETS.map((amount) => (
                            <Chip key={amount} active={String(filters.budget_max) === String(amount)} onClick={() => { setBudgetMax(amount); apply({ budget_max: amount }); }}>≤ {formatMoney(amount).replace(",00", "")}</Chip>
                        ))}
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            max <input type="number" min={0} value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} onBlur={() => apply({})} placeholder="€" className="w-20 rounded-lg border-slate-200 py-1 text-xs dark:border-slate-700 dark:bg-slate-900" /> € / pers.
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                        <p className="text-xs text-slate-500">
                            {total} voyage{total > 1 ? "s" : ""} publié{total > 1 ? "s" : ""}
                            {hasFilters && (
                                <button onClick={() => router.get(route("explore.index"))} className="ml-2 inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"><X className="h-3 w-3" /> Effacer les filtres</button>
                            )}
                        </p>
                        <select value={filters.sort} onChange={(event) => apply({ sort: event.target.value === "recent" ? undefined : event.target.value })} className="rounded-xl border-slate-200 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-900">
                            {Object.entries(SORTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                    </div>
                </section>

                {trips.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
                        <Compass className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-3 font-bold text-slate-700 dark:text-slate-200">Aucun voyage ne correspond</p>
                        <p className="text-sm text-slate-500">Élargissez la durée ou le budget, ou publiez le vôtre depuis sa page avec « Publier sur le site ».</p>
                    </div>
                ) : (
                    <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {trips.map((trip) => <PublicTripCard key={trip.id} trip={trip} onDuplicate={setDuplicating} />)}
                    </div>
                )}

                {next && (
                    <div className="flex justify-center">
                        <button onClick={loadMore} disabled={loadingMore} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                            {loadingMore && <LoaderCircle className="h-4 w-4 animate-spin" />} Voir plus de voyages
                        </button>
                    </div>
                )}
            </div>
        </GuestLayout>
    );
}
