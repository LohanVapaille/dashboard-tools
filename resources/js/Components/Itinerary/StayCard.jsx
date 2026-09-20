import React from "react";
import { router } from "@inertiajs/react";
import { MapPin, Calendar, Trash2, Edit3 } from "lucide-react";
import PeriodSlot from "./PeriodSlot";
import { formatDate } from "@/Utils/formatters";

const PERIODS = ["matin", "midi", "apres_midi", "soir", "nuit"];

export default function StayCard({ stay, onEdit }) {
    const handleDeleteStay = () => {
        if (confirm(`Supprimer le séjour "${stay.location_name}" ?`)) {
            router.delete(route("stays.destroy", stay.id));
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            {/* Header du Séjour */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/30 rounded-xl">
                        <MapPin className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">
                            {stay.location_name}
                        </h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Du {formatDate(stay.arrival_date)} au{" "}
                            {formatDate(stay.departure_date)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Bouton d'édition */}
                    <button
                        onClick={onEdit}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                        title="Modifier le séjour"
                    >
                        <Edit3 className="w-5 h-5" />
                    </button>

                    {/* Bouton de suppression */}
                    <button
                        onClick={handleDeleteStay}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                        title="Supprimer le séjour"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Contenu des Jours */}
            <div className="p-6 space-y-6">
                {stay.days && stay.days.length > 0 ? (
                    stay.days.map((day, idx) => (
                        <div
                            key={day.id}
                            className="border-l-2 border-indigo-500 pl-4 space-y-3"
                        >
                            <div className="font-bold text-sm text-slate-700 dark:text-slate-200">
                                Jour {idx + 1} —{" "}
                                <span className="font-normal text-xs text-slate-500">
                                    {formatDate(day.date)}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                {PERIODS.map((period) => (
                                    <PeriodSlot
                                        key={period}
                                        periodKey={period}
                                        dayId={day.id}
                                        activities={day.activities || []}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-6 text-sm text-slate-400">
                        Aucun jour généré pour ce séjour.
                    </div>
                )}
            </div>
        </div>
    );
}
