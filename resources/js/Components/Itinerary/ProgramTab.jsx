import React from "react";
import { CalendarDays, MapPin, Moon, Plus, Sparkles, Ticket } from "lucide-react";
import StayCard, { STAY_PALETTE } from "@/Components/Itinerary/StayCard";
import TransitionCard from "@/Components/Itinerary/TransitionCard";
import { ActivityBoard } from "@/Components/Itinerary/ActivityBoard";
import { formatDay, nightsBetween } from "@/Utils/stays";

export default function ProgramTab({ trip, canEdit, onOpenAI, onOpenAddStay, onEditStay }) {
    const stays = trip.stays || [];
    const days = stays.reduce((sum, stay) => sum + (stay.days?.length || 0), 0);
    const activities = stays.reduce((sum, stay) => sum + (stay.days || []).reduce((count, day) => count + (day.activities?.length || 0), 0), 0);
    const nights = nightsBetween(trip.start_date, trip.end_date);

    const scrollTo = (id) => document.getElementById(`stay-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-violet-600 to-purple-700 p-6 text-white shadow-xl shadow-violet-500/20">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-2xl" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-2xl font-black"><CalendarDays className="h-6 w-6" /> Votre programme</h2>
                        <p className="mt-1 text-sm text-violet-100">Organisez chaque journée : activités, horaires, repas et bons plans, étape par étape.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onOpenAI}
                            disabled={!canEdit}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-700 shadow-lg transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Sparkles className="h-4 w-4" /> Suggérer avec l’IA
                        </button>
                        {canEdit && (
                            <button onClick={onOpenAddStay} className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30">
                                <Plus className="h-4 w-4" /> Ajouter une étape
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        [MapPin, stays.length, stays.length > 1 ? "étapes" : "étape"],
                        [Moon, nights, nights > 1 ? "nuits" : "nuit"],
                        [CalendarDays, days, days > 1 ? "journées" : "journée"],
                        [Ticket, activities, activities > 1 ? "activités" : "activité"],
                    ].map(([Icon, value, label]) => (
                        <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                            <Icon className="h-5 w-5 text-violet-100" />
                            <div>
                                <p className="text-xl font-black leading-none">{value}</p>
                                <p className="text-[11px] text-violet-100">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {stays.length > 1 && (
                <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Étapes du voyage">
                    {stays.map((stay, index) => {
                        const color = STAY_PALETTE[index % STAY_PALETTE.length];
                        return (
                            <React.Fragment key={stay.id}>
                                {index > 0 && <span className="mt-5 h-px w-6 shrink-0 bg-slate-300 dark:bg-slate-600" />}
                                <button
                                    type="button"
                                    onClick={() => scrollTo(stay.id)}
                                    className="group flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                                >
                                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${color.gradient} text-sm font-black text-white`}>{index + 1}</span>
                                    <span>
                                        <span className="block max-w-[10rem] truncate text-sm font-bold text-slate-800 dark:text-slate-100">{stay.location_name.split(",")[0]}</span>
                                        <span className="block text-[11px] text-slate-500">{formatDay(stay.arrival_date)} → {formatDay(stay.departure_date)}</span>
                                    </span>
                                </button>
                            </React.Fragment>
                        );
                    })}
                </nav>
            )}

            {stays.length > 0 ? (
                <ActivityBoard stays={stays}>
                <div className="space-y-6">
                    {stays.map((stay, index) => {
                        const transition = trip.transitions?.find((item) => item.from_stay_id === stay.id);
                        return (
                            <React.Fragment key={stay.id}>
                                <StayCard stay={stay} index={index} onEdit={() => onEditStay(stay)} />
                                {transition && <TransitionCard transition={transition} />}
                            </React.Fragment>
                        );
                    })}
                </div>
                </ActivityBoard>
            ) : (
                <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-white py-16 text-center dark:border-violet-900/50 dark:bg-slate-800">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white">
                        <MapPin className="h-7 w-7" />
                    </span>
                    <h3 className="mt-4 text-lg font-black text-slate-800 dark:text-slate-100">Aucune étape pour le moment</h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Ajoutez votre première destination, ou laissez l’IA vous proposer un programme jour par jour.</p>
                    {canEdit && (
                        <div className="mt-5 flex justify-center gap-2">
                            <button onClick={onOpenAddStay} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-700 px-4 py-2.5 text-sm font-bold text-white shadow-md">
                                <Plus className="h-4 w-4" /> Ajouter une destination
                            </button>
                            <button onClick={onOpenAI} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-2.5 text-sm font-bold text-violet-700 dark:border-violet-900">
                                <Sparkles className="h-4 w-4" /> Avec l’IA
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
