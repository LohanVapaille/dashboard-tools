import React, { useMemo, useState } from "react";
import GuestLayout from "@/Layouts/GuestLayout";
import TripCreator from "@/Components/TripCreator";
import { COVERS } from "@/Components/Trips/PublicTripCard";
import { Head, Link, router, usePage } from "@inertiajs/react";
import {
    Plane,
    BedDouble,
    Sparkles,
    ShieldCheck,
    MapPin,
    Calendar,
    Compass,
    Trash2,
    LogOut,
    Luggage,
    Users,
    Globe,
    Hourglass,
    Flag,
    ArrowRight,
    Plus,
} from "lucide-react";
import { confirmDialog } from "@/Components/ConfirmDialog";
import { formatMoney } from "@/Utils/formatters";

const ROLE_LABELS = { admin: "Admin", editor: "Éditeur", viewer: "Lecteur" };

const toDay = (value) => {
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    return Math.round(Date.UTC(year, month - 1, day) / 86400000);
};
const shortDate = (value, withYear = false) =>
    value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }) : "";

/** Statut du voyage par rapport à aujourd'hui : compte à rebours, en cours, terminé. */
function tripStatus(trip) {
    if (!trip.start_date || !trip.end_date) return null;
    const now = new Date();
    const today = Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    const [from, to] = [toDay(trip.start_date), toDay(trip.end_date)];
    if (today < from) return { Icon: Hourglass, label: from - today === 1 ? "Demain" : `Dans ${from - today} j`, className: "bg-amber-300 text-amber-950" };
    if (today <= to) return { Icon: Sparkles, label: `En cours · J${today - from + 1}`, className: "bg-emerald-300 text-emerald-950" };
    return { Icon: Flag, label: "Terminé", className: "bg-slate-950/40 text-white backdrop-blur" };
}

function sortTrips(trips, sortBy) {
    return [...trips].sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return new Date(b.start_date || 0) - new Date(a.start_date || 0);
    });
}

function TripCard({ trip, variant, onDestroy, onLeave }) {
    const status = tripStatus(trip);
    const days = trip.start_date && trip.end_date ? toDay(trip.end_date) - toDay(trip.start_date) + 1 : null;
    const cover = trip.cover_image ? (/^(https?:)?\//.test(trip.cover_image) ? trip.cover_image : `/storage/${trip.cover_image}`) : null;
    const owned = variant === "owned";

    return (
        <Link
            href={route("trips.show", trip.id)}
            className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-indigo-200 dark:bg-slate-800 dark:ring-slate-700"
        >
            <div className={`relative h-32 overflow-hidden bg-gradient-to-br ${COVERS[trip.id % COVERS.length]} p-4 text-white`}>
                {cover ? (
                    <>
                        <img src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-slate-950/10" />
                    </>
                ) : (
                    <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
                )}
                <div className="relative flex flex-wrap items-center gap-1.5 pr-9">
                    {status && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${status.className}`}>
                            <status.Icon className="h-3 w-3" /> {status.label}
                        </span>
                    )}
                    {trip.published_at && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><Globe className="h-3 w-3" /> Publié</span>
                    )}
                    {!owned && trip.my_role && (
                        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-fuchsia-700">{ROLE_LABELS[trip.my_role] || trip.my_role}</span>
                    )}
                </div>
                <button
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        owned ? onDestroy(trip) : onLeave(trip);
                    }}
                    className="absolute right-3 top-3 rounded-full bg-slate-950/30 p-2 text-white backdrop-blur transition hover:bg-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
                    title={owned ? "Supprimer" : "Quitter le voyage"}
                >
                    {owned ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                </button>
                {days && <span className="absolute bottom-3 right-4 text-3xl font-black leading-none text-white/90 drop-shadow">{days}<span className="ml-0.5 text-sm font-bold">j</span></span>}
            </div>

            <div className="flex flex-1 flex-col p-5">
                <h3 className="line-clamp-1 text-lg font-black text-slate-900 transition group-hover:text-indigo-600 dark:text-white">{trip.title}</h3>
                <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500 dark:text-slate-400">{trip.description || "Pas encore de description."}</p>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        {shortDate(trip.start_date)} → {shortDate(trip.end_date, true)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        <MapPin className="h-3 w-3" /> {trip.stays_count || 0} étape{(trip.stays_count || 0) > 1 ? "s" : ""}
                    </span>
                </div>
            </div>
        </Link>
    );
}

function SectionTitle({ icon: Icon, tone, title, count, children }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2.5 text-lg font-black text-slate-900 dark:text-white">
                <span className={`rounded-xl p-2 text-white shadow ${tone}`}><Icon className="h-4 w-4" /></span>
                {title}
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{count}</span>
            </h3>
            {children}
        </div>
    );
}

/** Invitation à découvrir la page « Parcourir », avec un aperçu des derniers voyages publiés. */
function ExploreCta({ community }) {
    const trips = community?.trips || [];

    return (
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl shadow-indigo-900/20 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-fuchsia-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
                <div>
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-200"><Compass className="h-3.5 w-3.5" /> Parcourir</p>
                    <h2 className="mt-3 text-3xl font-black leading-tight">Besoin d’inspiration ?</h2>
                    <p className="mt-2 text-sm text-indigo-100">
                        {community?.total
                            ? `${community.total} voyage${community.total > 1 ? "s" : ""} publié${community.total > 1 ? "s" : ""} par la communauté, avec leur budget. Reprenez-en un à vos dates en un clic.`
                            : "Les itinéraires publiés par les voyageurs apparaîtront ici, avec leur budget. Publiez le vôtre depuis sa page !"}
                    </p>
                    <Link href={route("explore.index")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg transition hover:bg-indigo-50">
                        Explorer les voyages <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {trips.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-3">
                        {trips.map((trip, index) => (
                            <Link
                                key={trip.id}
                                href={route("explore.index")}
                                className={`group overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur transition hover:-translate-y-1 hover:bg-white/15 ${index === 2 ? "hidden sm:block" : ""}`}
                            >
                                <div className={`relative aspect-[16/10] bg-gradient-to-br ${COVERS[trip.id % COVERS.length]}`}>
                                    {trip.cover && <img src={trip.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                                    <span className="absolute left-3 top-3 rounded-full bg-slate-950/40 px-2 py-0.5 text-[11px] font-bold backdrop-blur">{trip.days} j</span>
                                    <p className="absolute inset-x-3 bottom-2 truncate text-sm font-black">{trip.stays.map((stay) => stay.name).slice(0, 3).join(" › ")}</p>
                                </div>
                                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                                    <span className="truncate text-xs font-semibold text-indigo-100">{trip.title}</span>
                                    {trip.budget && <span className="shrink-0 text-xs font-black text-amber-300">{formatMoney(trip.budget.per_person).replace(",00", "")}</span>}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="hidden grid-cols-3 gap-4 opacity-60 sm:grid">
                        {[0, 1, 2].map((index) => <div key={index} className={`aspect-[16/10] rounded-2xl bg-gradient-to-br ${COVERS[index]} ring-1 ring-white/15`} />)}
                    </div>
                )}
            </div>
        </section>
    );
}

export default function Index({ ownedTrips = [], joinedTrips = [], guestTripsRemaining = null, community = null }) {
    const { auth } = usePage().props;
    const [sortBy, setSortBy] = useState("date");

    const sortedOwned = useMemo(() => sortTrips(ownedTrips, sortBy), [ownedTrips, sortBy]);
    const sortedJoined = useMemo(() => sortTrips(joinedTrips, sortBy), [joinedTrips, sortBy]);

    const destroy = async (trip) => {
        if (await confirmDialog({ title: "Supprimer ce voyage ?", message: `« ${trip.title} », son programme, ses photos et ses accès seront supprimés définitivement.`, confirmLabel: "Supprimer" })) {
            router.delete(route("trips.destroy", trip.id));
        }
    };

    const leave = async (trip) => {
        if (await confirmDialog({ title: "Quitter ce voyage ?", message: `Vous n’aurez plus accès à « ${trip.title} », sauf nouvelle invitation.`, confirmLabel: "Quitter", tone: "warning" })) {
            router.delete(route("trips.leave", trip.id));
        }
    };

    const scrollToCreator = () => window.scrollTo({ top: 0, behavior: "smooth" });
    const firstName = auth?.user?.name?.split(" ")[0];

    return (
        <GuestLayout>
            <Head title="Mes Voyages" />

            <section className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-indigo-600 to-fuchsia-600">
                <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl" />
                <div className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full bg-fuchsia-300/30 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-200/20 blur-3xl" />

                <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center text-white">
                        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                            <Sparkles className="h-3.5 w-3.5" /> {firstName ? `Bonjour ${firstName} !` : "Planifiez, réservez, partagez"}
                        </p>
                        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Où partez-vous ?</h1>
                        <p className="mt-3 text-base text-white/85">
                            Indiquez votre départ, vos étapes et vos dates : votre itinéraire, vos vols et vos hébergements se préparent au même endroit.
                        </p>
                    </div>

                    <div className="mt-8">
                        <TripCreator guestTripsRemaining={guestTripsRemaining} />
                    </div>

                    <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold text-white/85">
                        <span className="inline-flex items-center gap-1.5"><Plane className="h-4 w-4" /> Vols de plus de 300 compagnies</span>
                        <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4" /> Hôtels, appartements, campings…</span>
                        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Paiement sécurisé</span>
                    </div>
                </div>
            </section>

            <div className="relative mx-auto -mt-6 max-w-7xl space-y-12 px-4 pb-6 sm:px-6 lg:px-8">
                <ExploreCta community={community} />

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 px-5 py-4 shadow-lg ring-1 ring-slate-200 backdrop-blur dark:bg-slate-800/90 dark:ring-slate-700">
                    <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                        <Compass className="h-5 w-5 text-indigo-600" /> Vos voyages
                        <span className="text-sm font-semibold text-slate-400">{ownedTrips.length + joinedTrips.length}</span>
                    </h2>
                    <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-900">
                        {[["date", "Par date"], ["title", "Par nom"]].map(([key, label]) => (
                            <button key={key} onClick={() => setSortBy(key)} className={`rounded-lg px-3 py-1.5 transition ${sortBy === key ? "bg-white text-indigo-700 shadow dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <section className="space-y-5">
                    <SectionTitle icon={Luggage} tone="bg-gradient-to-br from-sky-500 to-indigo-600" title="Mes voyages" count={sortedOwned.length}>
                        {sortedOwned.length > 0 && (
                            <button onClick={scrollToCreator} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300">
                                <Plus className="h-4 w-4" /> Nouveau voyage
                            </button>
                        )}
                    </SectionTitle>
                    {sortedOwned.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {sortedOwned.map((trip) => <TripCard key={trip.id} trip={trip} variant="owned" onDestroy={destroy} />)}
                        </div>
                    ) : (
                        <button onClick={scrollToCreator} className="group flex w-full flex-col items-center rounded-3xl border-2 border-dashed border-indigo-200 bg-white/60 px-6 py-12 text-center transition hover:border-indigo-400 hover:bg-white dark:border-slate-700 dark:bg-slate-800/50">
                            <span className="rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 p-3 text-white shadow-lg transition group-hover:scale-110"><Plus className="h-6 w-6" /></span>
                            <span className="mt-3 font-black text-slate-800 dark:text-white">Créez votre premier voyage</span>
                            <span className="mt-1 text-sm text-slate-500">Choisissez vos étapes et vos dates dans le formulaire ci-dessus.</span>
                        </button>
                    )}
                </section>

                {sortedJoined.length > 0 && (
                    <section className="space-y-5">
                        <SectionTitle icon={Users} tone="bg-gradient-to-br from-violet-500 to-fuchsia-600" title="Voyages rejoints" count={sortedJoined.length} />
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {sortedJoined.map((trip) => <TripCard key={trip.id} trip={trip} variant="joined" onLeave={leave} />)}
                        </div>
                    </section>
                )}
            </div>
        </GuestLayout>
    );
}
