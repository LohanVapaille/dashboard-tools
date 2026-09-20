import React, { useState } from "react";
import GuestLayout from "@/Layouts/GuestLayout";
import Modal from "@/Components/Modal";
import { Head, Link, useForm, router } from "@inertiajs/react";
import { Plus, MapPin, Calendar, Compass, Trash2 } from "lucide-react";

function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function Index({ auth, trips = [] }) {
    const [isOpen, setIsOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("trips.store"), {
            onSuccess: () => {
                setIsOpen(false);
                reset();
            },
        });
    };

    const destroy = (e, trip) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Supprimer le voyage "${trip.title}" ?`)) {
            router.delete(route("trips.destroy", trip.id));
        }
    };

    return (
        <GuestLayout>
            <Head title="Mes Voyages" />

            {/* Bandeau d'en-tête */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-white">
                        <div className="inline-flex items-center gap-2 text-blue-100 text-sm font-medium mb-1">
                            <Compass className="w-4 h-4" />
                            Planificateur d'itinéraires
                        </div>
                        <h1 className="text-3xl font-bold">Mes Voyages</h1>
                        <p className="text-blue-100 mt-1">
                            {trips.length} voyage{trips.length > 1 ? "s" : ""}{" "}
                            enregistré{trips.length > 1 ? "s" : ""}
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

            <div className="py-8 max-w-7xl mx-auto sm:px-6 lg:px-8 px-4 space-y-6">
                {/* Grille des voyages */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trips.length > 0 ? (
                        trips.map((trip) => (
                            <Link
                                key={trip.id}
                                href={route("trips.show", trip.id)}
                                className="group relative block bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                                <button
                                    onClick={(e) => destroy(e, trip)}
                                    className="absolute top-4 right-4 p-1.5 rounded-md text-gray-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition pr-6">
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
                        ))
                    ) : (
                        <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                            <Compass className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">
                                Aucun voyage pour le moment.
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                                Cliquez sur "Nouveau voyage" pour créer votre
                                premier itinéraire.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de création */}
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
