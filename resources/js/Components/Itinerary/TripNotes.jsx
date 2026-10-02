import React from "react";
import { router } from "@inertiajs/react";
import { ChevronDown, Plus, StickyNote } from "lucide-react";
import { BLOCK_TYPES } from "@/Constants/dayBlocks";
import DayBlockItem from "./DayBlockItem";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

export default function TripNotes({ trip }) {
    const { canEdit } = useTripPermissions();
    const notes = trip.notes || [];

    const addNote = (type) => {
        router.post(
            route("trip-notes.store", trip.id),
            { type },
            { preserveScroll: true },
        );
    };

    return (
        <details className="group overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm transition-shadow open:shadow-md dark:border-slate-700 dark:bg-slate-800">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:bg-slate-700/60 sm:px-5 sm:py-4">
                <span className="flex min-w-0 items-center gap-3">
                    <span className="rounded-xl bg-blue-600 p-2 text-white shadow-sm shadow-blue-600/20">
                        <StickyNote className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">
                            Notes du voyage
                        </span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                            Infos pratiques, réservations et dépenses
                        </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-900">
                        {notes.length}
                    </span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 transition-colors group-hover:bg-blue-100 dark:bg-slate-700 dark:text-blue-300 dark:ring-slate-600">
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </span>
            </summary>

            <div className="border-t border-blue-100 bg-slate-50/70 px-4 pb-4 pt-4 dark:border-slate-700 dark:bg-slate-900/30 sm:px-5 sm:pb-5">
                <div className="mb-4 flex flex-wrap gap-2">
                    {canEdit &&
                        Object.entries(BLOCK_TYPES).map(([type, config]) => {
                            const { Icon } = config;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => addNote(type)}
                                    title={`Ajouter : ${config.label}`}
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-900 dark:text-blue-300 dark:hover:border-blue-700 dark:hover:bg-slate-800"
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">
                                        {type === "budget"
                                            ? "Budget du voyage"
                                            : config.label}
                                    </span>
                                    <Plus className="h-3 w-3" />
                                </button>
                            );
                        })}
                </div>

                {notes.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {notes.map((note) => (
                            <DayBlockItem
                                key={note.id}
                                block={note}
                                routePrefix="trip-notes"
                                sticky
                            />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-blue-300 px-4 py-5 text-center dark:border-slate-600">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {canEdit
                                ? "Ajoutez un pense-bête, un lien, une checklist ou un suivi de dépenses."
                                : "Aucune note globale pour le moment."}
                        </p>
                    </div>
                )}
            </div>
        </details>
    );
}
