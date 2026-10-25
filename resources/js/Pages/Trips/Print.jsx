import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Printer } from "lucide-react";
import { PERIODS, categoryMeta, transportMeta } from "@/Constants/itinerary";
import { formatMoney } from "@/Utils/formatters";
import { formatDay, nightsBetween } from "@/Utils/stays";

const GROUPS = [
    ["logement", "Logements"],
    ["transport", "Transports"],
    ["activites", "Activités"],
    ["repas", "Repas"],
];

const longDay = (date) => formatDay(date, { weekday: "long", day: "numeric", month: "long" });

// Carnet de voyage pensé pour l'impression : le navigateur permet aussi de l'enregistrer en PDF.
export default function Print({ trip, budget }) {
    const stays = trip.stays || [];
    const transitionAfter = (stayId) => (trip.transitions || []).find((transition) => transition.from_stay_id === stayId);

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <Head title={`Carnet · ${trip.title}`} />

            <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between px-4 print:hidden">
                <Link href={route("trips.show", trip.id)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4" /> Retour au voyage
                </Link>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-violet-700">
                    <Printer className="h-4 w-4" /> Imprimer / enregistrer en PDF
                </button>
            </div>

            <article className="mx-auto max-w-3xl bg-white px-10 py-12 text-slate-800 shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none">
                <header className="border-b-4 border-violet-600 pb-6">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Carnet de voyage</p>
                    <h1 className="mt-2 text-4xl font-black text-slate-900">{trip.title}</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        {longDay(trip.start_date)} → {longDay(trip.end_date)} · {nightsBetween(trip.start_date, trip.end_date)} nuits · {trip.travelers || 1} voyageur{(trip.travelers || 1) > 1 ? "s" : ""}
                        {trip.origin_name && ` · départ de ${trip.origin_name.split(",")[0]}`}
                    </p>
                    {trip.description && <p className="mt-3 text-sm italic text-slate-500">{trip.description}</p>}
                    {stays.length > 0 && (
                        <p className="mt-4 text-sm font-semibold text-slate-700">
                            {stays.map((stay) => stay.location_name.split(",")[0]).join("  →  ")}
                        </p>
                    )}
                </header>

                {stays.map((stay, index) => {
                    const transition = transitionAfter(stay.id);
                    return (
                        <section key={stay.id} className="mt-8 break-inside-avoid-page">
                            <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 pb-2">
                                <h2 className="text-2xl font-black text-slate-900">
                                    <span className="text-violet-600">{index + 1}.</span> {stay.location_name}
                                </h2>
                                <p className="shrink-0 text-xs text-slate-500">
                                    {formatDay(stay.arrival_date)} → {formatDay(stay.departure_date)} · {nightsBetween(stay.arrival_date, stay.departure_date)} nuit(s)
                                </p>
                            </div>
                            {(stay.notes || stay.accommodation_cost != null) && (
                                <p className="mt-2 text-xs text-slate-500">
                                    {stay.notes}
                                    {stay.accommodation_cost != null && ` · Logement : ${formatMoney(stay.accommodation_cost)}`}
                                </p>
                            )}

                            <div className="mt-4 space-y-4">
                                {(stay.days || []).map((day) => (
                                    <div key={day.id} className="break-inside-avoid">
                                        <h3 className="text-sm font-bold capitalize text-slate-900">{longDay(day.date)}</h3>
                                        {day.activities?.length ? (
                                            <ul className="mt-1 space-y-1.5 border-l-2 border-violet-200 pl-4">
                                                {PERIODS.flatMap((period) => day.activities.filter((activity) => activity.period === period.key).map((activity) => (
                                                    <li key={activity.id} className="text-sm">
                                                        <span className="inline-block w-24 text-xs font-semibold uppercase text-slate-400">
                                                            {activity.start_time ? activity.start_time.slice(0, 5) : period.label}
                                                        </span>
                                                        <span className="font-semibold">{activity.title}</span>
                                                        <span className="text-xs text-slate-500">
                                                            {" "}· {categoryMeta(activity.category).label}
                                                            {activity.location_name && ` · ${activity.location_name}`}
                                                            {activity.price > 0 && ` · ${formatMoney(activity.price)} / pers.`}
                                                        </span>
                                                        {activity.description && <p className="ml-24 text-xs text-slate-500">{activity.description}</p>}
                                                    </li>
                                                )))}
                                            </ul>
                                        ) : (
                                            <p className="mt-1 pl-4 text-xs italic text-slate-400">Journée libre</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {transition && (
                                <p className="mt-5 rounded-lg bg-slate-50 px-4 py-2 text-xs text-slate-600 print:border print:border-slate-200">
                                    Trajet vers l’étape suivante : {transportMeta(transition.transport_mode).label}
                                    {transition.duration_minutes && ` · ${Math.floor(transition.duration_minutes / 60)} h ${String(transition.duration_minutes % 60).padStart(2, "0")}`}
                                    {transition.cost > 0 && ` · ${formatMoney(transition.cost)}`}
                                </p>
                            )}
                        </section>
                    );
                })}

                <section className="mt-10 break-inside-avoid border-t-4 border-orange-500 pt-6">
                    <h2 className="text-2xl font-black text-slate-900">Budget</h2>
                    <table className="mt-4 w-full text-sm">
                        <tbody>
                            {GROUPS.map(([key, label]) => {
                                const total = budget.planned.filter((line) => line.group === key).reduce((sum, line) => sum + line.amount, 0);
                                return total > 0 ? (
                                    <tr key={key} className="border-b border-slate-100">
                                        <td className="py-1.5">{label}</td>
                                        <td className="py-1.5 text-right font-semibold">{formatMoney(total)}</td>
                                    </tr>
                                ) : null;
                            })}
                            <tr className="font-black">
                                <td className="pt-3">Total prévu</td>
                                <td className="pt-3 text-right">{formatMoney(budget.planned_total)}</td>
                            </tr>
                            <tr className="text-slate-500">
                                <td>Par personne</td>
                                <td className="text-right">{formatMoney(budget.planned_total / budget.travelers)}</td>
                            </tr>
                            {budget.spent_total > 0 && (
                                <tr className="text-slate-500">
                                    <td>Déjà dépensé</td>
                                    <td className="text-right">{formatMoney(budget.spent_total)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {budget.settlements.length > 0 && (
                        <div className="mt-4 text-sm">
                            <p className="font-bold">Pour être quittes</p>
                            <ul className="mt-1 list-disc pl-5 text-slate-600">
                                {budget.settlements.map((transfer, index) => {
                                    const name = (id) => budget.members.find((member) => member.id === id)?.name;
                                    return <li key={index}>{name(transfer.from)} doit {formatMoney(transfer.amount)} à {name(transfer.to)}</li>;
                                })}
                            </ul>
                        </div>
                    )}
                </section>
            </article>
        </div>
    );
}
