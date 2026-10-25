import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { ChevronDown, Plus, Ticket } from "lucide-react";
import PeriodSlot from "./PeriodSlot";
import { useDayActivities } from "./ActivityBoard";
import DayBlockItem from "./DayBlockItem";
import { categoryStyle, formatEuro, PERIOD_STYLE } from "./activityMeta";
import { BLOCK_TYPES } from "@/Constants/dayBlocks";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

// Événement envoyé par le programme pour tout déplier ou tout replier.
export const DAYS_TOGGLE_EVENT = "program:toggle-days";

const DAY_ACCENTS = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500"];

export default function DayCard({ day, dayNumber, dayIndex = 0, defaultOpen = false }) {
    const { canEdit } = useTripPermissions();
    const [open, setOpen] = useState(defaultOpen);
    const [showMenu, setShowMenu] = useState(false);
    const [activities, setActivities] = useDayActivities(day);

    useEffect(() => {
        const toggle = (event) => setOpen(Boolean(event.detail?.open));
        window.addEventListener(DAYS_TOGGLE_EVENT, toggle);
        return () => window.removeEventListener(DAYS_TOGGLE_EVENT, toggle);
    }, []);

    const hiddenPeriods = day.hidden_periods || [];
    const visiblePeriods = PERIOD_STYLE.filter((period) => !hiddenPeriods.includes(period.key));
    const blocks = day.blocks || [];
    const date = new Date(`${day.date?.slice(0, 10)}T12:00:00`);
    const budget = activities.reduce((sum, activity) => sum + (Number(activity.price) || 0), 0);
    const ticketable = activities.filter((activity) => ["visite", "loisir"].includes(activity.category)).length;

    const setPeriodHidden = (period, hidden) =>
        router.patch(route("day-periods.update", day.id), { period, hidden }, { preserveScroll: true, preserveState: true });

    const addBlock = (type) => {
        setShowMenu(false);
        setOpen(true);
        router.post(route("day-blocks.store", day.id), { type }, { preserveScroll: true, preserveState: true });
    };

    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-700">
            {/* Résumé de la journée : toujours visible, cliquable pour déplier */}
            <div className="flex items-center gap-3 p-3 sm:p-4">
                <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
                    <span className="relative flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900">
                        <span className={`absolute inset-x-0 top-0 h-1 ${DAY_ACCENTS[dayIndex % DAY_ACCENTS.length]}`} />
                        <span className="text-[10px] font-bold uppercase leading-none text-slate-400">{date.toLocaleDateString("fr-FR", { month: "short" })}</span>
                        <span className="text-xl font-black leading-none text-slate-800 dark:text-white">{date.getDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-slate-900 dark:text-white">
                            Jour {dayNumber ?? day.day_number} <span className="font-semibold capitalize text-slate-400">· {date.toLocaleDateString("fr-FR", { weekday: "long" })}</span>
                        </span>
                        {activities.length ? (
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                {activities.slice(0, open ? 0 : 3).map((activity) => {
                                    const style = categoryStyle(activity.category);
                                    return (
                                        <span key={activity.id} className={`inline-flex max-w-[11rem] items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.soft}`}>
                                            <style.Icon className="h-3 w-3 shrink-0" /> <span className="truncate">{activity.title}</span>
                                        </span>
                                    );
                                })}
                                <span className="text-[11px] font-semibold text-slate-500">
                                    {!open && activities.length > 3 ? `+${activities.length - 3} · ` : ""}
                                    {activities.length} activité{activities.length > 1 ? "s" : ""}
                                    {budget > 0 && ` · ${formatEuro(budget)} / pers.`}
                                </span>
                                {ticketable > 0 && <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-orange-600"><Ticket className="h-3 w-3" /> {ticketable} à réserver</span>}
                            </span>
                        ) : (
                            <span className="mt-0.5 block text-xs text-slate-400">Journée libre</span>
                        )}
                    </span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                </button>

                {canEdit && (
                    <div className="relative shrink-0">
                        <button onClick={() => setShowMenu((value) => !value)} className="inline-flex items-center gap-1 rounded-xl bg-violet-50 px-2.5 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300" title="Composer la journée">
                            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Composer</span>
                        </button>
                        {showMenu && (
                            <>
                                <button aria-label="Fermer le menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setShowMenu(false)} />
                                <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                    <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Moments affichés</p>
                                    {PERIOD_STYLE.map(({ key, label, Icon, tint }) => (
                                        <label key={key} className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <input type="checkbox" checked={!hiddenPeriods.includes(key)} onChange={(event) => setPeriodHidden(key, !event.target.checked)} className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                                            <Icon className={`h-4 w-4 ${tint}`} />
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</span>
                                        </label>
                                    ))}
                                    <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
                                        <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Infos et outils</p>
                                        {Object.entries(BLOCK_TYPES).map(([type, { label, hint, Icon, iconClass }]) => (
                                            <button key={type} onClick={() => addBlock(type)} className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
                                                <span>
                                                    <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                                                    <span className="block text-[11px] text-slate-400">{hint}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {open && (
                <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30 sm:p-4">
                    {visiblePeriods.length ? (
                        <div className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
                            {visiblePeriods.map(({ key }) => (
                                <div key={key} className="py-3 first:pt-0 last:pb-0">
                                    <PeriodSlot
                                        periodKey={key}
                                        dayId={day.id}
                                        activities={activities}
                                        onHide={() => setPeriodHidden(key, true)}
                                        onActivityAdded={(activity) => setActivities((current) => [...current, activity])}
                                        onActivityDeleted={(id) => setActivities((current) => current.filter((activity) => activity.id !== id))}
                                        onActivityUpdated={(updated) => setActivities((current) => current.map((activity) => (activity.id === updated.id ? updated : activity)))}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-2xl border-2 border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-700">Tous les moments de la journée sont masqués (menu « Composer »).</p>
                    )}

                    {blocks.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Infos du jour</h4>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {blocks.map((block) => <DayBlockItem key={block.id} block={block} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
