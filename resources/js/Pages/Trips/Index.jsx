import React, { useMemo, useState } from "react";
import GuestLayout from "@/Layouts/GuestLayout";
import Modal from "@/Components/Modal";
import { Head, Link, useForm, router } from "@inertiajs/react";
import {
    Plus,
    MapPin,
    Calendar,
    Compass,
    Trash2,
    LogOut,
    ArrowUpDown,
    AlertTriangle,
} from "lucide-react";

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

    return (
        <Link
            href={route("trips.show", trip.id)}
            className={`group relative block bg-white border-2 ${borderClass} rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all`}
        >
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

export default function Index({ ownedTrips = [], joinedTrips = [] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [sortBy, setSortBy] = useState("date");
    const { data, setData, post, processing, errors, reset } = useForm({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
    });

    const sortedOwned = useMemo(
        () => sortTrips(ownedTrips, sortBy),
        [ownedTrips, sortBy],
    );
    const sortedJoined = useMemo(
        () => sortTrips(joinedTrips, sortBy),
        [joinedTrips, sortBy],
    );

    const submit = (e) => {
        e.preventDefault();
        post(route("trips.store"), {
            onSuccess: () => {
                setIsOpen(false);
                reset();
            },
        });
    };

    const destroy = (trip) => {
        if (confirm(`Supprimer le voyage "${trip.title}" ?`)) {
            router.delete(route("trips.destroy", trip.id));
        }
    };

    const leave = (trip) => {
        if (
            confirm(`Quitter le voyage "${trip.title}" ? Vous perdrez l'accès.`)
        ) {
            router.delete(route("trips.leave", trip.id));
        }
    };

    const total = ownedTrips.length + joinedTrips.length;

    return (
        <GuestLayout>
            <Head title="Mes Voyages" />

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-white">
                        <div className="inline-flex items-center gap-2 text-blue-100 text-sm font-medium mb-1">
                            <Compass className="w-4 h-4" />
                            Planificateur d'itinéraires
                        </div>
                        <h1 className="text-3xl font-bold">Mes Voyages</h1>
                        <p className="text-blue-100 mt-1">
                            {total} voyage{total > 1 ? "s" : ""} accessible
                            {total > 1 ? "s" : ""}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-lg font-semibold shadow-lg transition"
                    >
                        <Plus className="w-5 h-5" />
                        Nouveau voyage
                    </button>
                </div>
            </div>

            <div className="py-8 max-w-7xl mx-auto sm:px-6 lg:px-8 px-4 space-y-10">
                <div className="flex justify-end">
                    <button
                        onClick={() =>
                            setSortBy(sortBy === "date" ? "title" : "date")
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition"
                    >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        Trier par {sortBy === "date" ? "titre" : "date"}
                    </button>
                </div>

                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        Mes voyages ({sortedOwned.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedOwned.length > 0 ? (
                            sortedOwned.map((trip) => (
                                <TripCard
                                    key={trip.id}
                                    trip={trip}
                                    variant="owned"
                                    onDestroy={destroy}
                                />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                                <Compass className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">
                                    Aucun voyage créé pour le moment.
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                    Cliquez sur "Nouveau voyage" pour créer
                                    votre premier itinéraire.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {sortedJoined.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                            Voyages rejoints ({sortedJoined.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sortedJoined.map((trip) => (
                                <TripCard
                                    key={trip.id}
                                    trip={trip}
                                    variant="joined"
                                    onLeave={leave}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <Modal show={isOpen} onClose={() => setIsOpen(false)} maxWidth="md">
                <form onSubmit={submit} className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Créer un voyage
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Titre
                        </label>
                        <input
                            type="text"
                            value={data.title}
                            onChange={(e) => setData("title", e.target.value)}
                            className="mt-1 w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Road trip en Italie"
                            required
                        />
                        {errors.title && (
                            <div className="text-red-500 text-xs mt-1">
                                {errors.title}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Description
                        </label>
                        <textarea
                            value={data.description}
                            onChange={(e) =>
                                setData("description", e.target.value)
                            }
                            className="mt-1 w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            rows="3"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Date de début
                            </label>
                            <input
                                type="date"
                                value={data.start_date}
                                onChange={(e) =>
                                    setData("start_date", e.target.value)
                                }
                                className="mt-1 w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                            {errors.start_date && (
                                <div className="text-red-500 text-xs mt-1">
                                    {errors.start_date}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Date de fin
                            </label>
                            <input
                                type="date"
                                value={data.end_date}
                                onChange={(e) =>
                                    setData("end_date", e.target.value)
                                }
                                className="mt-1 w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                            {errors.end_date && (
                                <div className="text-red-500 text-xs mt-1">
                                    {errors.end_date}
                                </div>
                            )}
                        </div>
                    </div>

                    {errors.guest_limit && (
                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-xl p-3 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                                {errors.guest_limit}{" "}
                                <Link
                                    href={route("register")}
                                    className="underline font-semibold"
                                >
                                    Créer un compte gratuit
                                </Link>
                            </span>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            Enregistrer
                        </button>
                    </div>
                </form>
            </Modal>
        </GuestLayout>
    );
}
