import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { CalendarDays, ChevronDown, Edit3, MapPin, Moon, Trash2 } from "lucide-react";
import DayCard from "./DayCard";
import { formatDate } from "@/Utils/formatters";
import { nightsBetween } from "@/Utils/stays";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

// Une couleur par étape, reprise dans la frise du programme.
export const STAY_PALETTE = [
    { gradient: "from-violet-400 to-fuchsia-600", soft: "bg-violet-50 dark:bg-violet-950/20", ring: "ring-violet-200 dark:ring-violet-900/60" },
    { gradient: "from-sky-400 to-indigo-600", soft: "bg-sky-50 dark:bg-sky-950/20", ring: "ring-sky-200 dark:ring-sky-900/60" },
    { gradient: "from-emerald-400 to-teal-600", soft: "bg-emerald-50 dark:bg-emerald-950/20", ring: "ring-emerald-200 dark:ring-emerald-900/60" },
    { gradient: "from-amber-400 to-orange-600", soft: "bg-orange-50 dark:bg-orange-950/20", ring: "ring-orange-200 dark:ring-orange-900/60" },
    { gradient: "from-rose-400 to-pink-600", soft: "bg-rose-50 dark:bg-rose-950/20", ring: "ring-rose-200 dark:ring-rose-900/60" },
];

export default function StayCard({ stay, index = 0, onEdit }) {
    const { canEdit } = useTripPermissions();
    const [isOpen, setIsOpen] = useState(true);
    const color = STAY_PALETTE[index % STAY_PALETTE.length];
    const nights = nightsBetween(stay.arrival_date, stay.departure_date);
    const activities = (stay.days || []).reduce((count, day) => count + (day.activities?.length || 0), 0);

    const handleDeleteStay = () => {
        if (!canEdit) return;
        if (confirm(`Supprimer l’étape « ${stay.location_name} » et tout son programme ?`)) {
            router.delete(route("stays.destroy", stay.id));
        }
    };

    return (
        <section id={`stay-${stay.id}`} className={`scroll-mt-24 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ${color.ring} dark:bg-slate-800`}>
            <header
                onClick={() => setIsOpen((value) => !value)}
                className={`relative flex cursor-pointer select-none flex-wrap items-center justify-between gap-3 bg-gradient-to-r ${color.gradient} px-5 py-4 text-white`}
            >
                <div className="flex min-w-0 items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                        <span className="text-[9px] font-bold uppercase leading-none tracking-wider text-white/80">Étape</span>
                        <span className="text-xl font-black leading-none">{index + 1}</span>
                    </span>
                    <div className="min-w-0">
                        <h3 className="flex items-center gap-1.5 truncate text-xl font-black">
                            <MapPin className="h-5 w-5 shrink-0" /> {stay.location_name.split(",")[0]}
                        </h3>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/85">
                            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Du {formatDate(stay.arrival_date)} au {formatDate(stay.departure_date)}</span>
                            <span className="inline-flex items-center gap-1"><Moon className="h-3.5 w-3.5" /> {nights} nuit{nights > 1 ? "s" : ""}</span>
                            <span>{activities} activité{activities > 1 ? "s" : ""}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                    {canEdit && (
                        <>
                            <button onClick={onEdit} className="rounded-xl p-2 text-white/80 transition hover:bg-white/20 hover:text-white" title="Modifier l’étape">
                                <Edit3 className="h-5 w-5" />
                            </button>
                            <button onClick={handleDeleteStay} className="rounded-xl p-2 text-white/80 transition hover:bg-white/20 hover:text-white" title="Supprimer l’étape">
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </>
                    )}
                    <button onClick={() => setIsOpen((value) => !value)} className="rounded-xl p-2 text-white/80 hover:bg-white/20" aria-label={isOpen ? "Replier" : "Déplier"}>
                        <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                </div>
            </header>

            {isOpen && (
                <div className={`space-y-4 p-4 sm:p-5 ${color.soft}`}>
                    {stay.days?.length ? (
                        stay.days.map((day, dayIndex) => (
                            <div key={day.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                                <DayCard day={day} dayIndex={dayIndex} />
                            </div>
                        ))
                    ) : (
                        <p className="py-6 text-center text-sm text-slate-400">Aucune journée pour cette étape.</p>
                    )}
                </div>
            )}
        </section>
    );
}
