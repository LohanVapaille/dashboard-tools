import React from "react";
import { MapPin, Plus, Sparkles } from "lucide-react";
import StayCard from "@/Components/Itinerary/StayCard";
import TransitionCard from "@/Components/Itinerary/TransitionCard";

export default function ProgramTab({
    trip,
    canEdit,
    onOpenAI,
    onOpenAddStay,
    onEditStay,
}) {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Programme du voyage
                </h2>
                <button
                    onClick={onOpenAI}
                    disabled={!canEdit}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Sparkles className="h-4 w-4" />
                    Suggérer un programme avec l&apos;IA
                </button>
            </div>

            {trip.stays && trip.stays.length > 0 ? (
                trip.stays.map((stay, index) => {
                    const transition = trip.transitions?.find(
                        (item) => item.from_stay_id === stay.id,
                    );

                    return (
                        <React.Fragment key={stay.id}>
                            <StayCard
                                stay={stay}
                                index={index}
                                onEdit={() => onEditStay(stay)}
                            />
                            {transition && (
                                <TransitionCard transition={transition} />
                            )}
                        </React.Fragment>
                    );
                })
            ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-800">
                    <MapPin className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                        Aucun séjour planifié
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
                        Commencez à construire votre itinéraire en ajoutant
                        votre première destination.
                    </p>
                    {canEdit && (
                        <button
                            onClick={onOpenAddStay}
                            className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                            <Plus className="h-4 w-4" />
                            Ajouter une destination
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
