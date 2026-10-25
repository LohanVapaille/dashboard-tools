import { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import { BedDouble, CalendarDays, ChevronRight, ExternalLink, MapPin, Plane, Ticket } from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";
import { AirlineLogo } from "@/Components/Flights/FlightOfferCard";
import { PropertyCover } from "@/Components/Stays/StayPropertyCard";
import { directionLabel, formatPrice, localDate, localTime, orderStatus, toneClasses } from "@/Utils/flights";
import { formatDay } from "@/Utils/stays";
import { KIND_META, TRANSPORT_KINDS } from "@/Components/Reservations/kinds";

const when = (value) => (value ? new Date(value).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null);

/** Réservation faite chez un partenaire (Aviasales, Booking…) et enregistrée dans un voyage. */
function PartnerReservation({ reservation }) {
    const meta = KIND_META[reservation.kind] || KIND_META.other;
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
                <span className="flex items-center gap-2 text-sm">
                    {reservation.reference ? <span className="font-mono font-black text-slate-900 dark:text-white">{reservation.reference}</span> : <span className="text-slate-400">Sans référence</span>}
                    {reservation.provider && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.tone}`}>Réservé sur {reservation.provider}</span>}
                </span>
                {reservation.trip && (
                    <Link href={route("trips.show", reservation.trip.id)} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400">
                        {reservation.trip.title} <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                )}
            </div>
            <div className="flex items-center gap-4 px-5 py-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow ${meta.gradient}`}><meta.Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">{reservation.title}</p>
                    {(reservation.origin || reservation.destination) && <p className="text-sm text-slate-600 dark:text-slate-300">{reservation.origin} → {reservation.destination}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {reservation.starts_at && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {when(reservation.starts_at)}{reservation.ends_at && ` → ${when(reservation.ends_at)}`}</span>}
                        {reservation.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {reservation.address}</span>}
                    </div>
                    {reservation.url && (
                        <a href={reservation.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400">
                            Gérer la réservation <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>
                {reservation.price != null && <p className="text-lg font-black text-slate-900 dark:text-white">{formatPrice(reservation.price, reservation.currency)}</p>}
            </div>
        </div>
    );
}

const Status = ({ status }) => {
    const info = orderStatus[status] || { label: status, tone: "slate" };
    return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClasses[info.tone]}`}>{info.label}</span>;
};

const Empty = ({ icon: Icon, text }) => (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
        <Icon className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-600 dark:text-slate-300">{text}</p>
        <Link href={route("trips.index")} className="mt-4 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">Préparer un voyage</Link>
    </div>
);

export default function ReservationsIndex({ flightOrders, stayOrders, partnerReservations = [] }) {
    const transports = partnerReservations.filter((reservation) => TRANSPORT_KINDS.includes(reservation.kind));
    const lodgings = partnerReservations.filter((reservation) => reservation.kind === "stay");
    const others = partnerReservations.filter((reservation) => !TRANSPORT_KINDS.includes(reservation.kind) && reservation.kind !== "stay");
    const counts = { flights: flightOrders.length + transports.length, stays: stayOrders.length + lodgings.length, others: others.length };
    const [tab, setTab] = useState(!counts.flights && counts.stays ? "stays" : "flights");

    return (
        <GuestLayout>
            <Head title="Mes réservations" />
            <div className="bg-gradient-to-r from-sky-500 via-indigo-600 to-emerald-500">
                <div className="mx-auto max-w-5xl px-4 pt-10 text-white sm:px-6 lg:px-8">
                    <p className="flex items-center gap-2 text-sm font-medium text-white/80"><Ticket className="h-4 w-4" /> Billets et séjours</p>
                    <h1 className="text-3xl font-black">Mes réservations</h1>
                    <p className="mt-1 text-sm text-white/80">Retrouvez vos billets, confirmations, reçus et options d’annulation.</p>
                    <div className="mt-6 flex gap-2">
                        {[["flights", "Transports", Plane, counts.flights], ["stays", "Hébergements", BedDouble, counts.stays], ...(counts.others ? [["others", "Activités et autres", Ticket, counts.others]] : [])].map(([key, label, Icon, count]) => (
                            <button key={key} type="button" onClick={() => setTab(key)} className={`flex items-center gap-2 rounded-t-2xl px-5 py-3 text-sm font-black transition ${tab === key ? "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-white" : "bg-white/15 text-white hover:bg-white/25"}`}>
                                <Icon className="h-4 w-4" /> {label} ({count})
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
                {tab === "flights" && !counts.flights && <Empty icon={Plane} text="Aucun billet pour le moment." />}
                {tab === "stays" && !counts.stays && <Empty icon={BedDouble} text="Aucun hébergement réservé pour le moment." />}

                {tab === "flights" && transports.map((reservation) => <PartnerReservation key={reservation.id} reservation={reservation} />)}
                {tab === "stays" && lodgings.map((reservation) => <PartnerReservation key={reservation.id} reservation={reservation} />)}
                {tab === "others" && others.map((reservation) => <PartnerReservation key={reservation.id} reservation={reservation} />)}

                {tab === "flights" && flightOrders.map((order) => (
                    <Link key={order.reference} href={route("flights.orders.show", order.reference)} className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
                            <span className="font-mono text-sm font-black text-slate-900 dark:text-white">{order.reference}</span>
                            <Status status={order.status} />
                        </div>
                        <div className="flex items-center gap-4 px-5 py-4">
                            <div className="flex-1 space-y-3">
                                {order.bookings.map((booking) => (
                                    <div key={booking.id} className="flex items-center gap-3 text-sm">
                                        <AirlineLogo airline={booking.offer.airline} size="h-8 w-8" />
                                        <span className={`w-16 rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold uppercase text-white ${booking.direction === "return" ? "bg-violet-500" : "bg-sky-500"}`}>{directionLabel(booking.direction)}</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-100">{booking.offer.origin.city || booking.offer.origin.code} → {booking.offer.destination.city || booking.offer.destination.code}</span>
                                        <span className="hidden text-slate-500 sm:inline">{localDate(booking.offer.departure)} · {localTime(booking.offer.departure)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{formatPrice(order.total_amount, order.currency)}</p>
                                <p className="text-[11px] text-slate-500">{order.passengers.length} passager{order.passengers.length > 1 ? "s" : ""}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500" />
                        </div>
                    </Link>
                ))}

                {tab === "stays" && stayOrders.map((order) => (
                    <Link key={order.reference} href={route("stays.orders.show", order.reference)} className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
                            <span className="font-mono text-sm font-black text-slate-900 dark:text-white">{order.reference}</span>
                            <Status status={order.status} />
                        </div>
                        <div className="flex items-center gap-4 px-5 py-4">
                            <div className="flex-1 space-y-3">
                                {order.bookings.map((booking) => (
                                    <div key={booking.id} className="flex items-center gap-3 text-sm">
                                        <div className="w-16 overflow-hidden rounded-lg"><PropertyCover property={booking.property} className="h-10" /></div>
                                        <span className="font-semibold text-slate-800 dark:text-slate-100">{booking.property.name}</span>
                                        <span className="hidden text-slate-500 sm:inline">{formatDay(booking.check_in)} → {formatDay(booking.check_out)} · {booking.nights} nuit{booking.nights > 1 ? "s" : ""}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-lg font-black text-emerald-600">{formatPrice(order.total_amount, order.currency)}</p>
                            <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-500" />
                        </div>
                    </Link>
                ))}
            </div>
        </GuestLayout>
    );
}
