import { useState } from "react";
import { Link } from "@inertiajs/react";
import { CalendarDays, ChevronDown, ChevronRight, Copy, Eye, MapPin, Sparkles, Users } from "lucide-react";
import PublicBudget from "@/Components/Trips/PublicBudget";
import FavoriteButton from "@/Components/Trips/FavoriteButton";
import { formatMoney } from "@/Utils/formatters";

// Sans image d'aperçu choisie par l'auteur : dégradé stable par voyage (l'album photo reste privé).
export const COVERS = ["from-sky-500 via-indigo-500 to-violet-600", "from-emerald-500 via-teal-500 to-sky-600", "from-amber-400 via-orange-500 to-rose-500", "from-fuchsia-500 via-purple-500 to-indigo-600", "from-rose-500 via-pink-500 to-fuchsia-600", "from-teal-400 via-cyan-500 to-blue-600"];

const initials = (name) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

export function Author({ author }) {
    return (
        <span className="flex min-w-0 items-center gap-2">
            {author.avatar ? (
                <img src={author.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-800" />
            ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-[10px] font-black text-white">{initials(author.name)}</span>
            )}
            <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{author.name}</span>
        </span>
    );
}

/** Couverture rectangle d'un voyage publié : image de l'auteur ou dégradé, avec durée, pays et parcours. */
export function TripCover({ trip, children }) {
    const cities = trip.stays.map((stay) => stay.name);

    return (
        <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${COVERS[trip.id % COVERS.length]} text-white`}>
            <Link href={route("trips.show", trip.id)} className="group absolute inset-0 block p-4">
                {trip.cover ? (
                    <>
                        <img src={trip.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-slate-950/30" />
                    </>
                ) : (
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                )}
                <div className="relative flex h-full flex-col justify-between">
                    <div className="flex flex-wrap gap-1.5 pr-10">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/25 px-2.5 py-1 text-[11px] font-bold backdrop-blur"><CalendarDays className="h-3 w-3" /> {trip.days} jour{trip.days > 1 ? "s" : ""}</span>
                        {trip.countries.slice(0, 2).map((country) => <span key={country} className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur">{country}</span>)}
                    </div>
                    <p className="flex flex-wrap items-center gap-1 text-sm font-black drop-shadow">
                        {cities.slice(0, 4).map((city, index) => (
                            <span key={`${city}-${index}`} className="flex items-center gap-1">{index > 0 && <ChevronRight className="h-3.5 w-3.5 text-white/70" />}{city}</span>
                        ))}
                        {cities.length > 4 && <span className="text-white/80">+{cities.length - 4}</span>}
                    </p>
                </div>
            </Link>
            {children}
        </div>
    );
}

/** Carte d'un voyage publié (Parcourir, favoris) : aperçu, budget, « Voir plus », favori et reprise. */
export default function PublicTripCard({ trip, onDuplicate, onFavoriteChange }) {
    const [open, setOpen] = useState(false);

    return (
        <article className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-xl dark:bg-slate-800 dark:ring-slate-700">
            <TripCover trip={trip}>
                <div className="absolute right-3 top-3">
                    <FavoriteButton tripId={trip.id} favorited={trip.favorited} onChange={(value) => onFavoriteChange?.(trip, value)} />
                </div>
            </TripCover>

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <h2 className="line-clamp-2 font-black leading-tight text-slate-900 dark:text-white"><Link href={route("trips.show", trip.id)} className="hover:text-indigo-600">{trip.title}</Link></h2>
                    {trip.budget && (
                        <span className="shrink-0 rounded-xl bg-orange-50 px-2.5 py-1 text-right dark:bg-orange-950/40">
                            <span className="block text-sm font-black text-orange-700 dark:text-orange-300">{formatMoney(trip.budget.per_person)}</span>
                            <span className="block text-[10px] font-semibold text-orange-600/80">/ personne</span>
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between gap-2">
                    <Author author={trip.author} />
                    <span className="flex shrink-0 items-center gap-3 text-[11px] font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {trip.stays.length}</span>
                        <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> {trip.activities}</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {trip.travelers || 1}</span>
                    </span>
                </div>

                {open && (
                    <div className="space-y-4 border-t border-slate-100 pt-3 dark:border-slate-700">
                        {trip.description && <p className="text-sm text-slate-600 dark:text-slate-300">{trip.description}</p>}
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Étapes</p>
                            <ol className="space-y-1.5">
                                {trip.stays.map((stay, index) => (
                                    <li key={`${stay.place}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                                        <span className="flex min-w-0 items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{index + 1}</span><span className="truncate font-semibold text-slate-800 dark:text-slate-100">{stay.name}</span>{stay.country && <span className="truncate text-xs text-slate-400">{stay.country}</span>}</span>
                                        <span className="shrink-0 text-xs text-slate-500">{stay.nights} nuit{stay.nights > 1 ? "s" : ""}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                        <PublicBudget budget={trip.budget} travelers={trip.travelers} compact />
                        {trip.copies > 0 && <p className="text-xs text-slate-500">Déjà repris par {trip.copies} voyageur{trip.copies > 1 ? "s" : ""}.</p>}
                    </div>
                )}

                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
                        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} /> {open ? "Voir moins" : "Voir plus"}
                    </button>
                    <Link href={route("trips.show", trip.id)} className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100"><Eye className="h-3.5 w-3.5" /> Voir</Link>
                    {onDuplicate && <button onClick={() => onDuplicate(trip)} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"><Copy className="h-3.5 w-3.5" /> Reprendre</button>}
                </div>
            </div>
        </article>
    );
}
