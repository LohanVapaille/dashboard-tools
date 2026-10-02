import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { DragDropContext } from "@hello-pangea/dnd";
import axios from "axios";
import {
    Plus,
    Check,
    EyeOff,
    Sunrise,
    Sun,
    Coffee,
    Sunset,
    Moon,
} from "lucide-react";
import PeriodSlot from "./PeriodSlot";
import DayBlockItem from "./DayBlockItem";
import { BLOCK_TYPES } from "@/Constants/dayBlocks";
import { formatDate } from "@/Utils/formatters";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

const DAY_BORDER_COLORS = [
    "border-l-indigo-500",
    "border-l-emerald-500",
    "border-l-amber-500",
    "border-l-rose-500",
    "border-l-cyan-500",
    "border-l-purple-500",
    "border-l-orange-500",
];

const PERIODS = [
    { key: "matin", label: "Matin", Icon: Sunrise },
    { key: "midi", label: "Midi", Icon: Sun },
    { key: "apres_midi", label: "Après-midi", Icon: Coffee },
    { key: "soir", label: "Soir", Icon: Sunset },
    { key: "nuit", label: "Nuit", Icon: Moon },
];

export default function DayCard({ day, dayNumber, dayIndex = 0 }) {
    const [showMenu, setShowMenu] = useState(false);
    const [activities, setActivities] = useState(day.activities || []);

    const hiddenPeriods = day.hidden_periods || [];
    const blocks = day.blocks || [];
    const visiblePeriods = PERIODS.filter(
        (p) => !hiddenPeriods.includes(p.key),
    );
    const { canEdit } = useTripPermissions();

    const borderColorClass =
        DAY_BORDER_COLORS[dayIndex % DAY_BORDER_COLORS.length];

    const setPeriodHidden = (period, hidden) => {
        router.patch(
            route("day-periods.update", day.id),
            { period, hidden },
            { preserveScroll: true, preserveState: true },
        );
    };

    const addBlock = (type) => {
        setShowMenu(false);
        router.post(
            route("day-blocks.store", day.id),
            { type },
            { preserveScroll: true, preserveState: true },
        );
    };

    // Gestion du Drag & Drop global pour la journée
    const handleDragEnd = (result) => {
        if (!canEdit) return;
        const { destination, source, draggableId } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const newPeriod = destination.droppableId;
        const activityId = parseInt(draggableId);

        // 1. Mise à jour instantanée de l'état local (UI fluide)
        setActivities((prevActivities) =>
            prevActivities.map((act) =>
                act.id === activityId ? { ...act, period: newPeriod } : act,
            ),
        );

        // 2. Sauvegarde en base de données en arrière-plan via Axios
        axios
            .patch(route("activities.update-period", activityId), {
                period: newPeriod,
            })
            .catch((error) => {
                console.error(
                    "Erreur lors du déplacement de l'activité :",
                    error,
                );
            });
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className={`border-l-2 ${borderColorClass} pl-4 space-y-3`}>
                {/* En-tête de la journée */}
                <div className="flex items-center justify-between gap-3">
                    <div className="font-bold text-sm text-slate-700 dark:text-slate-200">
                        Jour {dayNumber ?? day.day_number} —{" "}
                        <span className="font-normal text-xs text-slate-500">
                            {formatDate(day.date)}
                        </span>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => canEdit && setShowMenu((v) => !v)}
                            disabled={!canEdit}
                            title={
                                canEdit
                                    ? "Composer la journée"
                                    : "Lecture seule"
                            }
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${
                                canEdit
                                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                            }`}
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter
                        </button>

                        {showMenu && (
                            <>
                                <button
                                    aria-label="Fermer le menu"
                                    className="fixed inset-0 z-10 cursor-default"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-20 py-2">
                                    <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Parties de la journée
                                    </div>
                                    {PERIODS.map(({ key, label, Icon }) => {
                                        const visible =
                                            !hiddenPeriods.includes(key);
                                        return (
                                            <button
                                                onClick={() =>
                                                    canEdit &&
                                                    setPeriodHidden(key, true)
                                                }
                                                disabled={!canEdit}
                                                className={`absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-center transition-opacity md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 ${
                                                    canEdit
                                                        ? "text-slate-400 hover:text-red-500"
                                                        : "text-slate-300 cursor-not-allowed"
                                                }`}
                                            >
                                                <EyeOff className="w-3 h-3" />
                                            </button>
                                        );
                                    })}

                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Infos & outils
                                        </div>
                                        {Object.entries(BLOCK_TYPES).map(
                                            ([
                                                type,
                                                {
                                                    label,
                                                    hint,
                                                    Icon,
                                                    iconClass,
                                                },
                                            ]) => (
                                                <button
                                                    key={type}
                                                    onClick={() =>
                                                        addBlock(type)
                                                    }
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-start gap-3"
                                                >
                                                    <Icon
                                                        className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`}
                                                    />
                                                    <span>
                                                        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                            {label}
                                                        </span>
                                                        <span className="block text-[11px] text-slate-400">
                                                            {hint}
                                                        </span>
                                                    </span>
                                                </button>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Grille des périodes */}
                {visiblePeriods.length > 0 ? (
                    <div className="flex flex-col md:flex-row gap-3">
                        {visiblePeriods.map(({ key, label }) => (
                            <div
                                key={key}
                                className="group relative flex flex-col flex-1 min-w-0"
                            >
                                <PeriodSlot
                                    periodKey={key}
                                    dayId={day.id}
                                    activities={activities}
                                    onActivityAdded={(newAct) =>
                                        setActivities([...activities, newAct])
                                    }
                                    onActivityDeleted={(id) =>
                                        setActivities(
                                            activities.filter(
                                                (a) => a.id !== id,
                                            ),
                                        )
                                    }
                                />

                                <button
                                    onClick={() => setPeriodHidden(key, true)}
                                    title={`Masquer « ${label} »`}
                                    className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-red-500 shadow-sm flex items-center justify-center transition-opacity md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                                >
                                    <EyeOff className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                        Aucune partie de la journée affichée.
                    </div>
                )}

                {/* Boîtes libres / Infos du jour */}
                {blocks.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Infos du jour
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {blocks.map((block) => (
                                <DayBlockItem key={block.id} block={block} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DragDropContext>
    );
}
