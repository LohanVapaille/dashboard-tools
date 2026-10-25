import { useEffect, useState } from "react";
import axios from "axios";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { ArrowLeft, BadgeCheck, BedDouble, CircleAlert, LoaderCircle, MapPin, Phone, Printer, Receipt as ReceiptIcon, Undo2, X } from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";
import { PropertyCover, Stars } from "@/Components/Stays/StayPropertyCard";
import { formatPercent, formatPrice, orderStatus, toneClasses } from "@/Utils/flights";
import { formatDay } from "@/Utils/stays";

const bookingStatus = {
    pending: { label: "En attente", tone: "amber" },
    confirmed: { label: "Confirmée", tone: "emerald" },
    failed: { label: "Non confirmée · remboursée", tone: "rose" },
    cancelled: { label: "Annulée", tone: "slate" },
    expired: { label: "Expirée", tone: "slate" },
};

function CancelDialog({ order, booking, onClose }) {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");
    const confirm = () => {
        setProcessing(true);
        router.post(route("stays.bookings.cancel", [order.reference, booking.id]), {}, {
            preserveScroll: true,
            onError: (errors) => {
                setError(Object.values(errors)[0]);
                setProcessing(false);
            },
            onSuccess: onClose,
        });
    };
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm print:hidden">
            <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                <div className="flex items-start justify-between">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Annuler {booking.property.name}</h3>
                    <button onClick={onClose} className="text-slate-400"><X className="h-5 w-5" /></button>
                </div>
                {booking.refund_if_cancelled > 0 ? (
                    <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">L’hébergement vous rembourse <strong className="text-lg">{formatPrice(booking.refund_if_cancelled, order.currency)}</strong>.{order.fee_amount > 0 && " Les frais de service ne sont pas remboursés en cas d’annulation à votre initiative."}</p>
                ) : (
                    <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Selon les conditions de ce tarif, <strong>aucun remboursement</strong> n’est prévu si vous annulez maintenant.</p>
                )}
                {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Garder ma réservation</button>
                    <button onClick={confirm} disabled={processing} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />} Confirmer l’annulation
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function StayReceipt({ order: initialOrder, seller, feeLabel }) {
    const { props } = usePage();
    const [order, setOrder] = useState(initialOrder);
    const [cancelling, setCancelling] = useState(null);
    const pending = ["payment_pending", "processing"].includes(order.status);
    const confirmed = ["confirmed", "partially_confirmed"].includes(order.status);

    useEffect(() => setOrder(initialOrder), [initialOrder]);
    useEffect(() => {
        if (!pending) return undefined;
        let attempts = 0;
        const timer = setInterval(async () => {
            attempts += 1;
            try {
                const response = await axios.get(route("stays.orders.status", order.reference));
                setOrder(response.data.order);
                if (!["payment_pending", "processing"].includes(response.data.order.status) || attempts > 40) clearInterval(timer);
            } catch {
                clearInterval(timer);
            }
        }, 3000);
        return () => clearInterval(timer);
    }, [pending, order.reference]);

    return (
        <GuestLayout>
            <Head title={`Hébergement ${order.reference}`} />
            {cancelling && <CancelDialog order={order} booking={cancelling} onClose={() => setCancelling(null)} />}

            <div className={`print:hidden ${confirmed ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" : pending ? "bg-gradient-to-r from-teal-500 to-sky-600" : "bg-gradient-to-r from-slate-600 to-slate-800"}`}>
                <div className="mx-auto max-w-5xl px-4 py-10 text-white sm:px-6 lg:px-8">
                    <Link href={route("flights.orders.index")} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white"><ArrowLeft className="h-4 w-4" /> Mes réservations</Link>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                                {pending ? <LoaderCircle className="h-7 w-7 animate-spin" /> : confirmed ? <BadgeCheck className="h-7 w-7" /> : <CircleAlert className="h-7 w-7" />}
                            </span>
                            <div>
                                <h1 className="text-2xl font-black sm:text-3xl">{pending ? "Confirmation en cours…" : confirmed ? "Séjour réservé" : orderStatus[order.status]?.label}</h1>
                                <p className="text-sm text-white/80">{pending ? "Paiement reçu, nous confirmons votre chambre auprès de l’hébergement." : `Commande ${order.reference} · confirmation envoyée à ${order.contact_email}`}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow"><Printer className="h-4 w-4" /> Imprimer / PDF</button>
                            {order.receipt_url && <a href={order.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-bold text-white"><ReceiptIcon className="h-4 w-4" /> Reçu Stripe</a>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {props.flash?.status && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 print:hidden"><BadgeCheck className="h-4 w-4" /> {props.flash.status}</p>}
                {order.failure_reason && <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"><CircleAlert className="h-4 w-4" /> {order.failure_reason}</p>}

                {order.bookings.map((booking) => {
                    const status = bookingStatus[booking.status] || { label: booking.status, tone: "slate" };
                    return (
                        <article key={booking.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 print:break-inside-avoid">
                            <div className="grid md:grid-cols-[18rem_1fr]">
                                <PropertyCover property={booking.property} className="h-56 md:h-full" />
                                <div className="space-y-4 p-6">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">{booking.property.name} <Stars count={booking.property.stars} /></h2>
                                            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" /> {booking.property.address}</p>
                                            {booking.property.phone && <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><Phone className="h-4 w-4" /> {booking.property.phone}</p>}
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClasses[status.tone]}`}>{status.label}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-900/50 sm:grid-cols-4">
                                        <div><p className="text-[11px] font-bold uppercase text-slate-400">Arrivée</p><p className="font-bold">{formatDay(booking.check_in, { weekday: "short", day: "numeric", month: "short" })}</p>{booking.property.check_in && <p className="text-xs text-slate-500">dès {booking.property.check_in}</p>}</div>
                                        <div><p className="text-[11px] font-bold uppercase text-slate-400">Départ</p><p className="font-bold">{formatDay(booking.check_out, { weekday: "short", day: "numeric", month: "short" })}</p>{booking.property.check_out && <p className="text-xs text-slate-500">avant {booking.property.check_out}</p>}</div>
                                        <div><p className="text-[11px] font-bold uppercase text-slate-400">Séjour</p><p className="font-bold">{booking.nights} nuit{booking.nights > 1 ? "s" : ""}</p><p className="text-xs text-slate-500">{booking.guests} voyageur{booking.guests > 1 ? "s" : ""}</p></div>
                                        <div><p className="text-[11px] font-bold uppercase text-slate-400">Référence</p><p className="font-mono font-black">{booking.reference || "—"}</p></div>
                                    </div>
                                    <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><BedDouble className="h-4 w-4 text-emerald-600" /> {booking.room.name} · {booking.rate.board_label}</p>
                                    {booking.rate.due_at_property && <p className="text-xs text-amber-700">À régler sur place : {formatPrice(booking.rate.due_at_property.amount, booking.rate.due_at_property.currency)} (taxe de séjour, taxes locales)</p>}
                                    {booking.failure_reason && <p className="text-xs text-rose-600">{booking.failure_reason}</p>}
                                    {booking.refunded_amount > 0 && <p className="text-xs font-semibold text-emerald-600">Remboursé : {formatPrice(booking.refunded_amount, order.currency)}</p>}
                                    {booking.can_cancel && (
                                        <button onClick={() => setCancelling(booking)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 print:hidden">
                                            <Undo2 className="h-3.5 w-3.5" /> Annuler{booking.refund_if_cancelled > 0 ? ` (remboursement ${formatPrice(booking.refund_if_cancelled, order.currency)})` : ""}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </article>
                    );
                })}

                <section className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                        <h2 className="mb-3 flex items-center gap-2 font-black text-slate-900 dark:text-white"><ReceiptIcon className="h-5 w-5 text-emerald-600" /> Reçu de paiement</h2>
                        <dl className="space-y-2 text-sm">
                            {order.bookings.map((booking) => (
                                <div key={booking.id} className="flex justify-between gap-3"><dt className="text-slate-600 dark:text-slate-300">{booking.property.name}</dt><dd className="tabular-nums">{formatPrice(booking.stay_amount, order.currency)}</dd></div>
                            ))}
                            {order.fee_amount > 0 && <div className="flex justify-between gap-3"><dt className="text-slate-600 dark:text-slate-300">{feeLabel} ({formatPercent(order.fee_percent)})</dt><dd className="tabular-nums">{formatPrice(order.fee_amount, order.currency)}</dd></div>}
                            <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 font-black dark:border-slate-700"><dt>Total payé</dt><dd className="tabular-nums text-emerald-600">{formatPrice(order.total_amount, order.currency)}</dd></div>
                            {order.refunded_amount > 0 && <div className="flex justify-between gap-3 text-emerald-600"><dt>Remboursé</dt><dd>− {formatPrice(order.refunded_amount, order.currency)}</dd></div>}
                        </dl>
                        <p className="mt-3 text-[11px] text-slate-500">Payé le {order.paid_at ? new Date(order.paid_at).toLocaleString("fr-FR") : "—"} {order.payment_method === "liteapi_sdk" ? "à Nuitée (LiteAPI), vendeur de cette réservation, qui gère aussi les remboursements" : "via Stripe"}. Prix des hébergements taxes incluses (hors taxe de séjour perçue sur place le cas échéant).</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <h2 className="mb-3 text-sm font-black text-slate-900 dark:text-white">À votre arrivée</h2>
                        <ul className="space-y-2 leading-relaxed">
                            <li>• Présentez une pièce d’identité au nom du voyageur principal ({order.guests?.[0]?.given_name} {order.guests?.[0]?.family_name}).</li>
                            <li>• Prévenez l’hébergement en cas d’arrivée tardive.</li>
                            <li>• Un problème sur place ? Contactez l’hébergement puis notre service client{seller.email ? ` (${seller.email})` : ""}.</li>
                        </ul>
                        <p className="mt-4 text-[11px] text-slate-400"><Link href={route("legal.terms")} className="underline">Conditions de vente</Link> · Médiation : {seller.mediator}</p>
                    </div>
                </section>
            </div>
        </GuestLayout>
    );
}
