import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { MapPin, Calendar, Trash2, Edit3, ChevronDown } from "lucide-react";
import DayCard from "./DayCard"; // Ou le nom de ton composant de jour (ex: DayContainer)
import { formatDate } from "@/Utils/formatters";

// Liste de couleurs Tailwind pour alterner les bordures gauches des jours
const DAY_BORDER_COLORS = [
    "border-l-indigo-500",
    "border-l-emerald-500",
    "border-l-amber-500",
    "border-l-rose-500",
    "border-l-cyan-500",
    "border-l-purple-500",
    "border-l-orange-500",
];

export default function StayCard({ stay, onEdit }) {
    const [isOpen, setIsOpen] = useState(true);

    const handleDeleteStay = () => {
        if (confirm(`Supprimer le séjour "${stay.location_name}" ?`)) {
            router.delete(route("stays.destroy", stay.id));
        }
    };

    return (
        <details
            open={isOpen}
            onToggle={(e) => setIsOpen(e.currentTarget.open)}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg transition-all duration-200 group"
        >
            {/* Header du Séjour (Summary cliquable) */}
            <summary className="bg-slate-900 text-white rounded-2xl p-5 flex justify-between items-center cursor-pointer list-none select-none">
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

                <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
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

                    {/* Icône flèche pour l'accordéon */}
                    <div
                        className={`p-2 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    >
                        <ChevronDown className="w-5 h-5" />
                    </div>
                </div>
            </summary>

            {/* Contenu des Jours */}
            <div className="p-6 space-y-6 border-t border-slate-100 dark:border-slate-700/50">
                {stay.days && stay.days.length > 0 ? (
                    stay.days.map((day, idx) => (
                        <div
                            key={day.id}
                            className="pl-4 space-y-3 transition-all"
                        >
                            <DayCard day={day} dayIndex={idx} />
                        </div>
                    ))
                ) : (
                    <div className="text-center py-6 text-sm text-slate-400">
                        Aucun jour généré pour ce séjour.
                    </div>
                )}
            </div>
        </details>
    );
}
