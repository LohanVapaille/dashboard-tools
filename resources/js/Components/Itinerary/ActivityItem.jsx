import React, { useState } from "react";
import axios from "axios";
import { Trash2, MapPin, ExternalLink, Edit3, X } from "lucide-react";
import DynamicIcon from "./DynamicIcon";
import ActivityForm from "./ActivityForm";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

export default function ActivityItem({ activity, onDelete }) {
    const { canEdit } = useTripPermissions();
    const [currentActivity, setCurrentActivity] = useState(activity);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const handleDelete = () => {
        if (confirm("Supprimer cette activité ?")) {
            // 1. Supprime en BDD via Axios en arrière-plan
            axios
                .delete(route("activities.destroy", activity.id))
                .then(() => {
                    // 2. Met à jour l'affichage parent instantanément sans recharger
                    setIsDetailsOpen(false);
                    if (onDelete) onDelete(activity.id);
                })
                .catch((error) => {
                    console.error(
                        "Erreur lors de la suppression de l'activité :",
                        error,
                    );
                });
        }
    };

    return (
        <>
        <div
            onClick={() => setIsDetailsOpen(true)}
            className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm group hover:border-indigo-300 dark:hover:border-indigo-600 transition min-h-[44px] cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    setIsDetailsOpen(true);
                }
            }}
        >
            {/* Partie Gauche : Icône + Textes (Centrés verticalement entre eux) */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                    <DynamicIcon
                        name={currentActivity.category}
                        className="w-3.5 h-3.5"
                    />
                </div>

                <div className="min-w-0 flex-1 my-auto">
                    <h4
                        className="font-semibold text-xs text-slate-800 dark:text-slate-100 leading-snug break-words"
                        title={currentActivity.title}
                    >
                        {currentActivity.title}
                    </h4>

                    {currentActivity.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-tight break-words">
                            {currentActivity.description}
                        </p>
                    )}

                    {currentActivity.location_name && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate max-w-full">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                                {currentActivity.location_name}
                            </span>
                        </span>
                    )}
                    {currentActivity.source_url && (
                        <a
                                onClick={(event) => event.stopPropagation()}
                            href={currentActivity.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:underline dark:text-indigo-400 mt-1"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Site / réservation
                        </a>
                    )}
                </div>
            </div>

            {/* Partie Droite : Prix & Action (Centrés verticalement par rapport à la carte) */}
            <div className="flex items-center gap-1.5 shrink-0 my-auto">
                {currentActivity.price > 0 && (
                    <span className="inline-flex items-center font-bold text-[10px] leading-none bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40 whitespace-nowrap">
                        {currentActivity.price} €
                    </span>
                )}

                {canEdit && (
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            handleDelete();
                        }}
                        title="Supprimer l'activité"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
        {isDetailsOpen && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
                onClick={() => setIsDetailsOpen(false)}
            >
                <div
                    className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                <DynamicIcon name={currentActivity.category} className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {currentActivity.title}
                                </h3>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                                    {currentActivity.category} · {currentActivity.period}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-slate-700">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {!isEditing ? (
                        <>
                            <div className="mt-5 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                                {currentActivity.description && (
                                    <p className="whitespace-pre-wrap">{currentActivity.description}</p>
                                )}
                                {currentActivity.location_name && (
                                    <p className="flex items-start gap-2">
                                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                                        {currentActivity.location_name}
                                    </p>
                                )}
                                {currentActivity.start_time && <p>Heure : {currentActivity.start_time.slice(0, 5)}</p>}
                                {currentActivity.price > 0 && <p>Prix : {currentActivity.price} €</p>}
                                {currentActivity.source_url && (
                                    <a href={currentActivity.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-indigo-600 hover:underline">
                                        <ExternalLink className="h-4 w-4" />
                                        Ouvrir le site ou la réservation
                                    </a>
                                )}
                                {!currentActivity.description && !currentActivity.location_name && !currentActivity.source_url && (
                                    <p className="text-slate-400">Aucune information complémentaire.</p>
                                )}
                            </div>
                            {canEdit && (
                                <div className="mt-6 flex justify-end gap-2">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                        Modifier
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Supprimer
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="mt-4">
                            <ActivityForm
                                dayId={currentActivity.day_id}
                                period={currentActivity.period}
                                activity={currentActivity}
                                onClose={() => {
                                    setIsEditing(false);
                                }}
                                onUpdated={(updatedActivity) => {
                                    setCurrentActivity(updatedActivity);
                                    setIsEditing(false);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        )}
        </>
    );
}
