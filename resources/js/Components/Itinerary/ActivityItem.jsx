import { useState } from "react";
import axios from "axios";
import { usePage } from "@inertiajs/react";
import { Clock3, Edit3, ExternalLink, GripVertical, MapPin, Ticket, Trash2 } from "lucide-react";
import { useDayPlace } from "./ActivityBoard";
import ActivityForm from "./ActivityForm";
import ActivitySheet from "./ActivitySheet";
import { categoryStyle, formatEuro, periodStyle } from "./activityMeta";
import { activityPartnerLinks, isTicketable } from "@/Utils/activities";
import { usePartnerBooking } from "@/Components/Reservations/TripReservations";
import { confirmDialog } from "@/Components/ConfirmDialog";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

const PARTNER_STYLE = {
    getyourguide: "bg-[#ff5533] text-white",
    viator: "bg-[#00aa6c] text-white",
    tiqets: "bg-[#0a3d62] text-white",
    klook: "bg-[#ff5b00] text-white",
    kkday: "bg-[#26bec9] text-white",
};

/** Détail d'une activité : infos, réservation chez les partenaires, modification, suppression. */
function ActivityDetails({ activity, place, links, onEdit, onDelete, onClose }) {
    const { canEdit } = useTripPermissions();
    const { trip } = usePage().props;
    const partner = usePartnerBooking(trip, ["activity"]);
    const style = categoryStyle(activity.category);
    const period = periodStyle(activity.period);
    const day = place?.date ? new Date(`${place.date.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : null;

    const book = (link) =>
        partner.open(link.url, {
            kind: "activity",
            title: activity.title,
            provider: link.label,
            address: activity.location_name || place?.city || "",
            starts_at: place?.date ? `${place.date.slice(0, 10)}T${activity.start_time?.slice(0, 5) || "09:00"}` : "",
            price: activity.price > 0 ? activity.price * (trip?.travelers || 1) : "",
        });

    return (
        <>
            <ActivitySheet
                title={activity.title}
                subtitle={[style.label, period.label, day].filter(Boolean).join(" · ")}
                Icon={style.Icon}
                gradient={style.gradient}
                onClose={onClose}
                footer={canEdit && (
                    <div className="flex gap-2">
                        <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/40">
                            <Trash2 className="h-4 w-4" /> Supprimer
                        </button>
                        <button onClick={onEdit} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                            <Edit3 className="h-4 w-4" /> Modifier
                        </button>
                    </div>
                )}
            >
                <div className="space-y-5">
                    <div className="flex flex-wrap gap-2 text-sm">
                        {activity.start_time && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Clock3 className="h-4 w-4" /> {activity.start_time.slice(0, 5)}</span>}
                        {activity.price > 0 && <span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{formatEuro(activity.price)} / pers.</span>}
                        {activity.location_name && (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activity.location_name} ${place?.city || ""}`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                                <MapPin className="h-4 w-4 text-rose-500" /> {activity.location_name}
                            </a>
                        )}
                    </div>

                    {activity.description ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{activity.description}</p>
                    ) : (
                        <p className="text-sm text-slate-400">Aucune information complémentaire.</p>
                    )}

                    {activity.source_url && (
                        <a href={activity.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-violet-600 hover:underline dark:text-violet-400">
                            <ExternalLink className="h-4 w-4" /> Site officiel ou réservation
                        </a>
                    )}

                    {links.length > 0 && (
                        <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900/60 dark:bg-orange-950/20">
                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><Ticket className="h-4 w-4 text-orange-500" /> Réserver des billets</h4>
                            <p className="mt-1 text-xs text-slate-500">Comparez les visites et billets coupe-file, puis enregistrez votre réservation dans le voyage.</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {links.map((link) => (
                                    <button key={link.key} type="button" onClick={() => book(link)} className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow ${PARTNER_STYLE[link.key] || "bg-slate-800 text-white"}`}>
                                        {link.label} <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                ))}
                            </div>
                            <p className="mt-2 text-[11px] text-slate-400">Réservation et paiement chez le partenaire. Nous pouvons percevoir une commission, sans surcoût pour vous.</p>
                        </section>
                    )}
                </div>
            </ActivitySheet>
            {partner.element}
        </>
    );
}

export default function ActivityItem({ activity, onDelete, onUpdated, dragHandle }) {
    const { canEdit } = useTripPermissions();
    const [view, setView] = useState(null);
    const place = useDayPlace(activity.day_id);
    const partners = usePage().props.commerce?.activities;
    const links = place ? activityPartnerLinks(partners, `${activity.title} ${place.city}`, place.date) : [];
    const bookable = isTicketable(activity) && links.length > 0;
    const style = categoryStyle(activity.category);

    const remove = async () => {
        const confirmed = await confirmDialog({ title: "Supprimer cette activité ?", message: `« ${activity.title} » sera retirée du programme.`, confirmLabel: "Supprimer" });
        if (!confirmed) return;
        await axios.delete(route("activities.destroy", activity.id));
        setView(null);
        onDelete?.(activity.id);
    };

    return (
        <>
            <article
                onClick={() => setView("details")}
                onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setView("details")}
                role="button"
                tabIndex={0}
                className="group relative flex cursor-pointer items-stretch gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-600"
            >
                {canEdit && dragHandle && (
                    <span {...dragHandle} onClick={(event) => event.stopPropagation()} className="-ml-1 flex cursor-grab items-center text-slate-300 hover:text-slate-500 active:cursor-grabbing" title="Glisser pour déplacer">
                        <GripVertical className="h-4 w-4" />
                    </span>
                )}
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${style.gradient}`}>
                    <style.Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 dark:text-white">{activity.title}</h4>
                    {activity.description && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{activity.description}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        {activity.start_time && <span className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300"><Clock3 className="h-3 w-3" /> {activity.start_time.slice(0, 5)}</span>}
                        {activity.location_name && <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{activity.location_name}</span></span>}
                        {activity.price > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{formatEuro(activity.price)}</span>}
                    </div>
                </div>
                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                    {bookable ? (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setView("details");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:from-orange-600 hover:to-rose-600"
                        >
                            <Ticket className="h-3.5 w-3.5" /> Réserver
                        </button>
                    ) : <span />}
                    {canEdit && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                remove();
                            }}
                            title="Supprimer"
                            className="rounded-lg p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-rose-950/40"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </article>

            {view === "details" && (
                <ActivityDetails activity={activity} place={place} links={isTicketable(activity) ? links : []} onClose={() => setView(null)} onEdit={() => setView("edit")} onDelete={remove} />
            )}
            {view === "edit" && (
                <ActivitySheet title="Modifier l’activité" subtitle={activity.title} Icon={Edit3} gradient={style.gradient} onClose={() => setView(null)}>
                    <ActivityForm
                        dayId={activity.day_id}
                        activity={activity}
                        onCancel={() => setView("details")}
                        onSaved={(updated) => {
                            onUpdated?.(updated);
                            setView(null);
                        }}
                    />
                </ActivitySheet>
            )}
        </>
    );
}
