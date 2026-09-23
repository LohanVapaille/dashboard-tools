import React from "react";
import { router } from "@inertiajs/react";
import { Trash2, DollarSign, MapPin } from "lucide-react";
import DynamicIcon from "./DynamicIcon";

export default function ActivityItem({ activity }) {
    const handleDelete = () => {
        if (confirm("Supprimer cette activité ?")) {
            router.delete(route("activities.destroy", activity.id));
        }
    };
    return (
        <div className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm group hover:border-indigo-300 dark:hover:border-indigo-600 transition min-h-[44px]">
            {/* Partie Gauche : Icône + Textes (Centrés verticalement entre eux) */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                    <DynamicIcon
                        name={activity.category}
                        className="w-3.5 h-3.5"
                    />
                </div>

                <div className="min-w-0 flex-1 my-auto">
                    <h4
                        className="font-semibold text-xs text-slate-800 dark:text-slate-100 leading-snug break-words"
                        title={activity.title}
                    >
                        {activity.title}
                    </h4>

                    {activity.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-tight break-words">
                            {activity.description}
                        </p>
                    )}

                    {activity.location_name && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate max-w-full">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                                {activity.location_name}
                            </span>
                        </span>
                    )}
                </div>
            </div>

            {/* Partie Droite : Prix & Action (Centrés verticalement par rapport à la carte) */}
            <div className="flex items-center gap-1.5 shrink-0 my-auto">
                {activity.price > 0 && (
                    <span className="inline-flex items-center font-bold text-[10px] leading-none bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40 whitespace-nowrap">
                        {activity.price} €
                    </span>
                )}

                <button
                    onClick={handleDelete}
                    title="Supprimer l'activité"
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
