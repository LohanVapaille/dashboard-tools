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
        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm group hover:border-indigo-400 transition">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-md">
                    <DynamicIcon name={activity.category} className="w-4 h-4" />
                </div>
                <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                        {activity.title}
                    </div>
                    {activity.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {activity.description}
                        </p>
                    )}
                    {activity.location_name && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                            <MapPin className="w-3 h-3" />{" "}
                            {activity.location_name}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {activity.price > 0 && (
                    <span className="inline-flex items-center font-bold text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-full">
                        {activity.price} €
                    </span>
                )}
                <button
                    onClick={handleDelete}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition p-1"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
