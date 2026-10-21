import { useEffect, useState } from "react";
import axios from "axios";
import { Head, Link, router, usePage } from "@inertiajs/react";
import {
    ArrowLeft,
    BadgeCheck,
    CircleAlert,
    ExternalLink,
    LoaderCircle,
    Plane,
    Printer,
    Receipt as ReceiptIcon,
    Ticket,
    Undo2,
    X,
} from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";
import { AirlineLogo, FlightTimeline, SegmentDetails } from "@/Components/Flights/FlightOfferCard";
import { bookingStatus, directionLabel, firstError, formatPercent, formatPrice, localDate, orderStatus, toneClasses } from "@/Utils/flights";

const StatusPill = ({ status, map }) => {
    const info = map[status] || { label: status, tone: "slate" };
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClasses[info.tone]}`}>{info.label}</span>;
};

function CancelDialog({ order, booking, onClose }) {
    const [quote, setQuote] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        axios
            .post(route("flights.bookings.cancellation-quote", [order.reference, booking.id]))
            .then((response) => setQuote(response.data.quote))
            .catch((requestError) => setError(firstError(requestError, "Impossible d’obtenir les conditions d’annulation.")))
            .finally(() => setLoading(false));
    }, []);

    const confirm = () => {
        setConfirming(true);
        router.post(route("flights.bookings.cancel", [order.reference, booking.id]), {}, {
            preserveScroll: true,
            onError: (errors) => {
                setError(Object.values(errors)[0]);
                setConfirming(false);
            },
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm print:hidden">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                <div className="flex items-start justify-between">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Annuler le vol {directionLabel(booking.direction).toLowerCase()}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                </div>
                {loading && <p className="mt-6 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Interrogation de la compagnie…</p>}
                {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                {quote && (
                    <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        {quote.refundable ? (
                            <p className="rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                La compagnie vous rembourse <strong className="text-lg">{formatPrice(quote.refund_amount, quote.currency)}</strong>.
                                Les frais de service ne sont pas remboursés en cas d’annulation à votre initiative.
                            </p>
                        ) : (
                            <p className="rounded-xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                Ce tarif n’est <strong>pas remboursable</strong>. Après annulation, vous pourrez demander le remboursement des taxes liées à l’embarquement (art. L224-66 C. conso).
                            </p>
                        )}
                        <p className="text-xs text-slate-500">Cette offre d’annulation est valable quelques minutes. L’annulation est définitive.</p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-600">Garder mon billet</button>
                            <button onClick={confirm} disabled={confirming} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">
                                {confirming && <LoaderCircle className="h-4 w-4 animate-spin" />} Confirmer l’annulation
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Receipt({ order: initialOrder, seller, feeLabel }) {
    const { props } = usePage();
    const [order, setOrder] = useState(initialOrder);
    const [cancelling, setCancelling] = useState(null);
    const pending = ["payment_pending", "processing"].includes(order.status);

    useEffect(() => setOrder(initialOrder), [initialOrder]);

    // Les billets sont émis quelques secondes après le paiement : on suit l'avancement.
    useEffect(() => {
        if (!pending) return undefined;
        let attempts = 0;
        const timer = setInterval(async () => {
            attempts += 1;
            try {
                const response = await axios.get(route("flights.orders.status", order.reference));
                setOrder(response.data.order);
                if (!["payment_pending", "processing"].includes(response.data.order.status) || attempts > 40) clearInterval(timer);
            } catch {
                clearInterval(timer);
            }
        }, 3000);
        return () => clearInterval(timer);
    }, [pending, order.reference]);

    const confirmed = ["confirmed", "partially_confirmed"].includes(order.status);

    return (
        <GuestLayout>
            <Head title={`Commande ${order.reference}`} />
            {cancelling && <CancelDialog order={order} booking={cancelling} onClose={() => setCancelling(null)} />}

            <div className={`print:hidden ${confirmed ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" : pending ? "bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600" : "bg-gradient-to-r from-slate-600 to-slate-800"}`}>
                <div className="mx-auto max-w-5xl px-4 py-10 text-white sm:px-6 lg:px-8">
                    <Link href={route("flights.orders.index")} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white">
                        <ArrowLeft className="h-4 w-4" /> Mes réservations
                    </Link>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                                {pending ? <LoaderCircle className="h-7 w-7 animate-spin" /> : confirmed ? <BadgeCheck className="h-7 w-7" /> : <CircleAlert className="h-7 w-7" />}
                            </span>
                            <div>
                                <h1 className="text-2xl font-black sm:text-3xl">
                                    {pending ? "Émission de vos billets…" : confirmed ? "Réservation confirmée" : orderStatus[order.status]?.label}
                                </h1>
                                <p className="text-sm text-white/80">
                                    {pending ? "Paiement reçu, nous confirmons vos places auprès de la compagnie. Ne fermez pas cette page." : `Commande ${order.reference} · confirmation envoyée à ${order.contact_email}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow hover:bg-slate-50">
                                <Printer className="h-4 w-4" /> Imprimer / PDF
                            </button>
                            {order.receipt_url && (
                                <a href={order.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/30">
                                    <ReceiptIcon className="h-4 w-4" /> Reçu Stripe
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 print:max-w-none print:p-0">
                <div className="hidden print:block">
                    <h1 className="text-2xl font-black">{seller.name} — Commande {order.reference}</h1>
                    <p className="text-sm">Payée le {order.paid_at ? new Date(order.paid_at).toLocaleString("fr-FR") : "—"} · {order.contact_email}</p>
                </div>

                {props.flash?.status && (
                    <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 print:hidden">
                        <BadgeCheck className="h-4 w-4" /> {props.flash.status}
                    </p>
                )}
                {order.failure_reason && (
                    <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        <CircleAlert className="h-4 w-4 shrink-0" /> {order.failure_reason}
                    </p>
                )}

                {order.bookings.map((booking) => (
                    <article key={booking.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 print:break-inside-avoid print:shadow-none">
                        <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-white ${booking.direction === "return" ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : "bg-gradient-to-r from-sky-500 to-indigo-500"}`}>
                            <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                                <Ticket className="h-4 w-4" /> {directionLabel(booking.direction)} · {localDate(booking.offer.departure, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </span>
                            <StatusPill status={booking.status} map={bookingStatus} />
                        </div>

                        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
                            <div className="space-y-5">
                                <div className="flex items-center gap-3">
                                    <AirlineLogo airline={booking.offer.airline} />
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{booking.offer.airline?.name}</p>
                                        <p className="text-xs text-slate-500">{booking.offer.cabin || "Économique"}{booking.offer.fare_brand && ` · ${booking.offer.fare_brand}`}</p>
                                    </div>
                                </div>
                                <FlightTimeline offer={booking.offer} />
                                {booking.offer.segments?.length > 0 && <SegmentDetails offer={booking.offer} />}
                            </div>

                            {/* Talon façon carte d'embarquement */}
                            <div className="flex flex-col justify-between gap-4 border-t-2 border-dashed border-slate-200 pt-5 dark:border-slate-700 md:w-56 md:border-l-2 md:border-t-0 md:pl-6 md:pt-0">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Référence compagnie</p>
                                    <p className="font-mono text-3xl font-black tracking-widest text-slate-900 dark:text-white">{booking.booking_reference || "——"}</p>
                                    {booking.ticket_numbers?.length > 0 && (
                                        <p className="mt-1 text-[11px] text-slate-500">E-billet{booking.ticket_numbers.length > 1 ? "s" : ""} : {booking.ticket_numbers.join(", ")}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Passagers</p>
                                    <ul className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                        {order.passengers.map((passenger, index) => (
                                            <li key={index}>{passenger.given_name} {passenger.family_name.toUpperCase()}</li>
                                        ))}
                                    </ul>
                                </div>
                                {booking.status === "simulated" && (
                                    <p className="rounded-lg bg-sky-50 p-2 text-[11px] text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">Mode démonstration : aucun billet réel n’a été émis.</p>
                                )}
                                {booking.failure_reason && <p className="text-xs text-rose-600">{booking.failure_reason}</p>}
                                {booking.refunded_amount > 0 && (
                                    <p className="text-xs font-semibold text-emerald-600">Remboursé : {formatPrice(booking.refunded_amount, order.currency)}</p>
                                )}
                                <div className="space-y-1.5 print:hidden">
                                    {booking.can_cancel && (
                                        <button onClick={() => setCancelling(booking)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30">
                                            <Undo2 className="h-3.5 w-3.5" /> Annuler / se faire rembourser
                                        </button>
                                    )}
                                    {["ticketed", "simulated", "cancelled"].includes(booking.status) && booking.offer.conditions?.refundable !== true && (
                                        booking.tax_refund_requested_at ? (
                                            <p className="text-[11px] text-slate-500">Remboursement des taxes demandé le {new Date(booking.tax_refund_requested_at).toLocaleDateString("fr-FR")}.</p>
                                        ) : (
                                            <button onClick={() => router.post(route("flights.bookings.tax-refund", [order.reference, booking.id]), {}, { preserveScroll: true })} className="w-full text-center text-[11px] font-semibold text-slate-500 underline hover:text-indigo-600">
                                                Vol non effectué ? Demander le remboursement des taxes
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </article>
                ))}

                <section className="grid gap-6 md:grid-cols-2 print:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                        <h2 className="mb-3 flex items-center gap-2 font-black text-slate-900 dark:text-white"><ReceiptIcon className="h-5 w-5 text-indigo-500" /> Reçu de paiement</h2>
                        <dl className="space-y-2 text-sm">
                            {order.bookings.map((booking) => (
                                <div key={booking.id} className="flex justify-between gap-3">
                                    <dt className="text-slate-600 dark:text-slate-300">{directionLabel(booking.direction)} {booking.offer.origin.code} → {booking.offer.destination.code}</dt>
                                    <dd className="tabular-nums">{formatPrice(booking.flight_amount, order.currency)}</dd>
                                </div>
                            ))}
                            <div className="flex justify-between gap-3">
                                <dt className="text-slate-600 dark:text-slate-300">{feeLabel} ({formatPercent(order.fee_percent)})</dt>
                                <dd className="tabular-nums">{formatPrice(order.fee_amount, order.currency)}</dd>
                            </div>
                            <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 font-black dark:border-slate-700">
                                <dt>Total payé</dt>
                                <dd className="tabular-nums text-indigo-600 dark:text-indigo-400">{formatPrice(order.total_amount, order.currency)}</dd>
                            </div>
                            {order.refunded_amount > 0 && (
                                <div className="flex justify-between gap-3 text-emerald-600">
                                    <dt>Remboursé</dt>
                                    <dd className="tabular-nums">− {formatPrice(order.refunded_amount, order.currency)}</dd>
                                </div>
                            )}
                        </dl>
                        <p className="mt-3 text-[11px] text-slate-500">
                            Payé le {order.paid_at ? new Date(order.paid_at).toLocaleString("fr-FR") : "—"} par carte via Stripe. Tarifs compagnie incluant les taxes aéroportuaires.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm dark:border-slate-700 dark:bg-slate-800">
                        <h2 className="mb-3 flex items-center gap-2 font-black text-slate-900 dark:text-white"><Plane className="h-5 w-5 text-indigo-500" /> Avant de partir</h2>
                        <ul className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            <li>• Enregistrez-vous en ligne sur le site de la compagnie avec la référence ci-dessus (souvent 24 à 48 h avant le départ).</li>
                            <li>• Munissez-vous d’une pièce d’identité ou d’un passeport valide, au nom exact du billet.</li>
                            <li>• Retard de plus de 3 h, annulation ou refus d’embarquement : adressez votre réclamation à la compagnie (règlement UE 261/2004), nous pouvons vous accompagner.</li>
                        </ul>
                        <p className="mt-4 text-[11px] text-slate-400">
                            {seller.name}{seller.address ? ` · ${seller.address}` : ""}{seller.email ? ` · ${seller.email}` : ""}
                            <br />
                            <Link href={route("flights.terms")} className="underline print:no-underline">Conditions de vente et remboursements</Link>
                            {" · "}Médiation : {seller.mediator}
                        </p>
                    </div>
                </section>

                <Link href={route("trips.index")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline print:hidden">
                    <ExternalLink className="h-4 w-4" /> Retour à mes voyages
                </Link>
            </div>
        </GuestLayout>
    );
}
