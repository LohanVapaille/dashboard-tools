import React, { useMemo, useState } from "react";
import GuestLayout from "@/Layouts/GuestLayout";
import TripCreator from "@/Components/TripCreator";
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
    ArrowUpDown,
} from "lucide-react";
import { confirmDialog } from "@/Components/ConfirmDialog";

function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

const ROLE_LABELS = { admin: "Admin", editor: "Éditeur", viewer: "Lecteur" };

function sortTrips(trips, sortBy) {
    return [...trips].sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return new Date(b.start_date || 0) - new Date(a.start_date || 0);
    });
}

function TripCard({ trip, variant, onDestroy, onLeave }) {
    const borderClass =
        variant === "owned"
            ? "border-blue-200 hover:border-blue-300"
            : "border-purple-200 hover:border-purple-300";
    // Une teinte par voyage pour distinguer les cartes d'un coup d'œil.
    const accents = [
        "from-sky-400 to-indigo-500",
        "from-violet-400 to-fuchsia-500",
        "from-emerald-400 to-teal-500",
        "from-amber-400 to-rose-500",
        "from-rose-400 to-pink-500",
    ];

    return (
        <Link
            href={route("trips.show", trip.id)}
            className={`group relative block overflow-hidden bg-white border-2 ${borderClass} rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all`}
        >
            <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accents[trip.id % accents.length]}`} />
            {variant === "owned" ? (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDestroy(trip);
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-md text-gray-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                    title="Supprimer"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            ) : (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onLeave(trip);
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-md text-gray-300 hover:text-orange-600 hover:bg-orange-50 opacity-0 group-hover:opacity-100 transition"
                    title="Quitter le voyage"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            )}

            {variant === "joined" && trip.my_role && (
                <span className="absolute top-4 left-6 text-[10px] font-bold uppercase tracking-wide text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {ROLE_LABELS[trip.my_role] || trip.my_role}
                </span>
            )}

            <h3
                className={`text-xl font-bold text-gray-900 group-hover:text-blue-600 transition pr-6 ${variant === "joined" ? "mt-4" : ""}`}
            >
                {trip.title}
            </h3>
            <p className="text-sm text-gray-500 mt-2 line-clamp-2 min-h-[2.5rem]">
                {trip.description || "Aucune description."}
            </p>
            <div className="mt-6 flex items-center justify-between text-xs text-gray-500 border-t pt-4 border-gray-100">
                <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    {formatDate(trip.start_date)}
                </span>
                <span className="flex items-center gap-1 font-medium">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    {trip.stays_count || 0} étape
                    {(trip.stays_count || 0) > 1 ? "s" : ""}
                </span>
            </div>
        </Link>
    );
}

export default function Index({ ownedTrips = [], joinedTrips = [], guestTripsRemaining = null }) {
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

            <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">
                        <Compass className="h-6 w-6 text-indigo-600" /> Vos voyages
                        <span className="text-base font-semibold text-slate-400">({ownedTrips.length + joinedTrips.length})</span>
                    </h2>
                    <button
                        onClick={() => setSortBy(sortBy === "date" ? "title" : "date")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-600"
                    >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        Trier par {sortBy === "date" ? "titre" : "date"}
                    </button>
                </div>

                <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                        Mes voyages ({sortedOwned.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {sortedOwned.length > 0 ? (
                            sortedOwned.map((trip) => <TripCard key={trip.id} trip={trip} variant="owned" onDestroy={destroy} />)
                        ) : (
                            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white py-14 text-center">
                                <Compass className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                                <p className="font-medium text-gray-500">Aucun voyage créé pour le moment.</p>
                                <p className="mt-1 text-sm text-gray-400">Remplissez le formulaire ci-dessus pour créer votre premier itinéraire.</p>
                            </div>
                        )}
                    </div>
                </section>

                {sortedJoined.length > 0 && (
                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                            <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
                            Voyages rejoints ({sortedJoined.length})
                        </h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {sortedJoined.map((trip) => <TripCard key={trip.id} trip={trip} variant="joined" onLeave={leave} />)}
                        </div>
                    </section>
                )}
            </div>
        </GuestLayout>
    );
}
