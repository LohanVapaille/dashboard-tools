import React, { useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import { CalendarDays, ChevronsDownUp, ChevronsUpDown, Crown, Eraser, FileDown, LoaderCircle, MapPin, Moon, Plus, Sparkles, Ticket } from "lucide-react";
import { DAYS_TOGGLE_EVENT } from "@/Components/Itinerary/DayCard";
import { confirmDialog, notify } from "@/Components/ConfirmDialog";
import StayCard, { STAY_PALETTE } from "@/Components/Itinerary/StayCard";
import TransitionCard from "@/Components/Itinerary/TransitionCard";
import { ActivityBoard } from "@/Components/Itinerary/ActivityBoard";
import { useAffiliateLinks } from "@/Utils/affiliate";
import { formatDay, nightsBetween } from "@/Utils/stays";
import TravelEssentials from "@/Components/Trips/TravelEssentials";

export default function ProgramTab({ trip, canEdit, onOpenAI, onOpenAddStay, onEditStay, readOnly = false }) {
    useAffiliateLinks();
    const stays = trip.stays || [];
    const days = stays.reduce((sum, stay) => sum + (stay.days?.length || 0), 0);
    const activities = stays.reduce((sum, stay) => sum + (stay.days || []).reduce((count, day) => count + (day.activities?.length || 0), 0), 0);
    const nights = nightsBetween(trip.start_date, trip.end_date);

    const scrollTo = (id) => document.getElementById(`stay-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    const toggleDays = (open) => window.dispatchEvent(new CustomEvent(DAYS_TOGGLE_EVENT, { detail: { open } }));
    const [clearing, setClearing] = useState(false);

    const clearProgram = async () => {
        const confirmed = await confirmDialog({
            title: "Vider tout le programme ?",
            message: `Les ${activities} activité${activities > 1 ? "s" : ""} prévue${activities > 1 ? "s" : ""} sur toutes les journées seront supprimées. Les étapes, les dates, les infos du jour et les réservations sont conservées.`,
            confirmLabel: "Tout supprimer",
            typeToConfirm: "SUPPRIMER",
        });
        if (!confirmed) return;
        setClearing(true);
        try {
            await axios.delete(route("trips.activities.destroy-all", trip.id));
            router.reload({ only: ["trip"], preserveScroll: true });
        } catch {
            notify({ title: "Suppression impossible", message: "Le programme n’a pas pu être vidé. Réessayez dans un instant.", tone: "warning" });
        } finally {
            setClearing(false);
        }
    };

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-violet-600 to-purple-700 p-6 text-white shadow-xl shadow-violet-500/20">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-2xl" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-2xl font-black"><CalendarDays className="h-6 w-6" /> {readOnly ? "Le programme" : "Votre programme"}</h2>
                        <p className="mt-1 text-sm text-violet-100">{readOnly ? "Activités, horaires et bons plans de ce voyage, étape par étape." : "Organisez chaque journée : activités, horaires, repas et bons plans, étape par étape."}</p>
                    </div>
                    <div className={`flex flex-wrap gap-2 ${readOnly ? "hidden" : ""}`}>
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
                        {stays.length > 0 && (
                            <a
                                href={trip.premium ? route("trips.print", trip.id) : route("billing.show")}
                                title={trip.premium ? "Imprimer ou enregistrer le carnet de voyage en PDF" : "Fonction Premium"}
                                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30"
                            >
                                <FileDown className="h-4 w-4" /> Carnet PDF
                                {!trip.premium && <Crown className="h-3.5 w-3.5 text-amber-300" />}
                            </a>
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

            {stays.length > 0 && <TravelEssentials trip={trip} />}

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

            {stays.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                        <button onClick={() => toggleDays(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
                            <ChevronsUpDown className="h-4 w-4" /> Tout déplier
                        </button>
                        <button onClick={() => toggleDays(false)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
                            <ChevronsDownUp className="h-4 w-4" /> Tout replier
                        </button>
                    </div>
                    {canEdit && activities > 0 && (
                        <button onClick={clearProgram} disabled={clearing} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/40">
                            {clearing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />} Vider le programme
                        </button>
                    )}
                </div>
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
