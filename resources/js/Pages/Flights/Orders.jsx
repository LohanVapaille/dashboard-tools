import { Head, Link } from "@inertiajs/react";
import { ChevronRight, Plane, Ticket } from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";
import { AirlineLogo } from "@/Components/Flights/FlightOfferCard";
import { directionLabel, formatPrice, localDate, localTime, orderStatus, toneClasses } from "@/Utils/flights";

export default function Orders({ orders }) {
    return (
        <GuestLayout>
            <Head title="Mes réservations" />
            <div className="bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600">
                <div className="mx-auto max-w-5xl px-4 py-10 text-white sm:px-6 lg:px-8">
                    <p className="flex items-center gap-2 text-sm font-medium text-indigo-100"><Ticket className="h-4 w-4" /> Billets d’avion</p>
                    <h1 className="text-3xl font-black">Mes réservations</h1>
                    <p className="mt-1 text-sm text-indigo-100">Retrouvez vos billets, reçus et options d’annulation.</p>
                </div>
            </div>

            <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
                {!orders.length && (
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
                        <Plane className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-3 font-semibold text-slate-600 dark:text-slate-300">Aucune réservation pour le moment.</p>
                        <Link href={route("trips.index")} className="mt-4 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">Préparer un voyage</Link>
                    </div>
                )}

                {orders.map((order) => {
                    const status = orderStatus[order.status] || { label: order.status, tone: "slate" };
                    return (
                        <Link
                            key={order.reference}
                            href={route("flights.orders.show", order.reference)}
                            className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
                                <span className="font-mono text-sm font-black text-slate-900 dark:text-white">{order.reference}</span>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClasses[status.tone]}`}>{status.label}</span>
                            </div>
                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className="flex-1 space-y-3">
                                    {order.bookings.map((booking) => (
                                        <div key={booking.id} className="flex items-center gap-3 text-sm">
                                            <AirlineLogo airline={booking.offer.airline} size="h-8 w-8" />
                                            <span className={`w-16 rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold uppercase text-white ${booking.direction === "return" ? "bg-violet-500" : "bg-sky-500"}`}>
                                                {directionLabel(booking.direction)}
                                            </span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                                                {booking.offer.origin.city || booking.offer.origin.code} → {booking.offer.destination.city || booking.offer.destination.code}
                                            </span>
                                            <span className="hidden text-slate-500 sm:inline">
                                                {localDate(booking.offer.departure)} · {localTime(booking.offer.departure)}
                                            </span>
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
                    );
                })}
            </div>
        </GuestLayout>
    );
}
