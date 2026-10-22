import { useEffect, useState } from "react";
import axios from "axios";
import { Link, router, usePage } from "@inertiajs/react";
import { BedDouble, Check, ChevronDown, Clock3, ExternalLink, Globe, LoaderCircle, Lock, MapPin, Phone, ShieldCheck, ShieldX, ShoppingCart, X } from "lucide-react";
import { firstError, formatPrice } from "@/Utils/flights";
import { amenityMeta, formatDay, partnerMeta, typeMeta } from "@/Utils/stays";
import { PropertyCover, Stars } from "@/Components/Stays/StayPropertyCard";

const bedLabel = { single: "lit simple", double: "lit double", queen: "lit queen", king: "lit king", sofabed: "canapé-lit", twin: "lit jumeau" };

function RateRow({ rate, onBook, state }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{rate.board_label}{rate.name ? ` · ${rate.name}` : ""}</p>
                    {rate.free_cancellation_until ? (
                        <p className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" /> Annulation gratuite jusqu’au {new Date(rate.free_cancellation_until).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
                    ) : rate.refundable ? (
                        <p className="flex items-center gap-1 text-xs font-semibold text-amber-600"><ShieldCheck className="h-3.5 w-3.5" /> Remboursement partiel possible</p>
                    ) : (
                        <p className="flex items-center gap-1 text-xs font-semibold text-rose-600"><ShieldX className="h-3.5 w-3.5" /> Non remboursable</p>
                    )}
                    {rate.due_at_property && (
                        <p className="text-[11px] text-slate-500">+ {formatPrice(rate.due_at_property.amount, rate.due_at_property.currency)} à régler sur place (taxe de séjour…)</p>
                    )}
                    {(rate.conditions?.length > 0 || rate.cancellation_timeline?.length > 0) && (
                        <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                            Conditions détaillées <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
                        </button>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-slate-900 dark:text-white">{formatPrice(rate.total_amount, rate.currency)}</p>
                    <p className="text-[11px] text-slate-500">{formatPrice(rate.per_night, rate.currency)} / nuit · taxes et frais inclus</p>
                    <button
                        type="button"
                        disabled={state === "loading"}
                        onClick={() => onBook(rate)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-bold text-white shadow disabled:opacity-50"
                    >
                        {state === "loading" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : state === "added" ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                        {state === "added" ? "Dans le panier" : "Ajouter au panier"}
                    </button>
                </div>
            </div>
            {open && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    {rate.cancellation_timeline?.map((step, index) => (
                        <p key={index}>Annulation avant le {new Date(step.before).toLocaleString("fr-FR")} : remboursement de {formatPrice(step.refund_amount, rate.currency)}</p>
                    ))}
                    {rate.conditions?.map((condition, index) => (
                        <p key={`c-${index}`}><strong>{condition.title}</strong> — {condition.description}</p>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function StayDetailModal({ property, trip, search, onClose }) {
    // Contexte de la recherche : nécessaire pour recharger les tarifs (dates, voyageurs).
    const context = search
        ? { latitude: search.latitude, longitude: search.longitude, check_in: search.check_in, check_out: search.check_out, adults: search.adults, rooms: search.rooms }
        : null;
    const { props } = usePage();
    const user = props.auth?.user;
    const [details, setDetails] = useState(null);
    const [error, setError] = useState("");
    const [bookState, setBookState] = useState({});
    const [cartError, setCartError] = useState("");
    const type = typeMeta[property.type] || typeMeta.hotel;

    useEffect(() => {
        const close = (event) => event.key === "Escape" && onClose();
        document.addEventListener("keydown", close);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", close);
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        if (!property.bookable) return;
        axios
            .get(route("stays.rates", property.id), { params: context || {} })
            .then((response) => setDetails(response.data))
            .catch((requestError) => setError(firstError(requestError, "Impossible de charger les chambres disponibles.")));
    }, [property.id]);

    const book = async (rate) => {
        setCartError("");
        setBookState((current) => ({ ...current, [rate.id]: "loading" }));
        try {
            await axios.post(route("stays.cart.store"), { trip_id: trip.id, search_result_id: property.id, rate_id: rate.id, ...(context ? { context } : {}) });
            setBookState((current) => ({ ...current, [rate.id]: "added" }));
            router.reload({ only: ["cart"] });
        } catch (requestError) {
            setBookState((current) => ({ ...current, [rate.id]: null }));
            setCartError(firstError(requestError, "Impossible d’ajouter cet hébergement au panier."));
        }
    };

    const anyAdded = Object.values(bookState).includes("added");

    return (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
                <div className="relative">
                    {property.photos?.length > 1 ? (
                        <div className="grid h-64 grid-cols-4 grid-rows-2 gap-1">
                            {property.photos.slice(0, 5).map((photo, index) => (
                                <img key={photo} src={photo} alt="" className={`h-full w-full object-cover ${index === 0 ? "col-span-2 row-span-2" : ""}`} />
                            ))}
                        </div>
                    ) : (
                        <PropertyCover property={property} className="h-56" />
                    )}
                    <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/95 p-2 text-slate-700 shadow-lg hover:bg-white" aria-label="Fermer">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-6 overflow-y-auto p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">{type.label}{property.brand ? ` · ${property.brand}` : ""}</p>
                            <h3 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">{property.name} <Stars count={property.stars} className="h-4 w-4" /></h3>
                            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" /> {property.address || property.city} · {property.distance_km} km du centre</p>
                        </div>
                        {property.rating && (
                            <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-center dark:bg-emerald-950/40">
                                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{property.rating.toFixed(1)}</p>
                                <p className="text-[11px] text-emerald-700/70">{property.reviews_count ? `${property.reviews_count} avis` : "Note voyageurs"}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                            <Clock3 className="h-3.5 w-3.5" /> {formatDay(property.check_in_date, { weekday: "short", day: "numeric", month: "short" })} → {formatDay(property.check_out_date, { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                        {property.check_in && <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">Arrivée dès {property.check_in}</span>}
                        {property.check_out && <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">Départ avant {property.check_out}</span>}
                        {property.phone && <a href={`tel:${property.phone}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800"><Phone className="h-3.5 w-3.5" /> {property.phone}</a>}
                        {property.website && <a href={property.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800"><Globe className="h-3.5 w-3.5" /> Site web</a>}
                    </div>

                    {property.description && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{property.description}</p>}

                    {property.amenities?.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-sm font-black text-slate-900 dark:text-white">Équipements</h4>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {property.amenities.filter((key) => amenityMeta[key]).map((key) => {
                                    const Icon = amenityMeta[key].icon;
                                    return <span key={key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><Icon className="h-4 w-4 text-emerald-600" /> {amenityMeta[key].label}</span>;
                                })}
                            </div>
                        </div>
                    )}

                    {property.bookable && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">Chambres disponibles</h4>
                            {!details && !error && <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Interrogation de l’hébergement…</p>}
                            {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                            {cartError && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{cartError}</p>}
                            {details?.rooms.map((room) => (
                                <div key={room.name} className="space-y-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                                    <div className="flex items-center gap-3">
                                        {room.photos?.[0] ? <img src={room.photos[0]} alt="" className="h-14 w-20 rounded-lg object-cover" /> : <span className="flex h-14 w-20 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><BedDouble className="h-6 w-6" /></span>}
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{room.name}</p>
                                            <p className="text-xs text-slate-500">{room.beds.map((bed) => `${bed.count} ${bedLabel[bed.type] || bed.type}`).join(" · ")}</p>
                                        </div>
                                    </div>
                                    {user ? (
                                        room.rates.map((rate) => <RateRow key={rate.id} rate={rate} onBook={book} state={bookState[rate.id]} />)
                                    ) : (
                                        <Link href={route("login")} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"><Lock className="h-4 w-4" /> Se connecter pour réserver</Link>
                                    )}
                                </div>
                            ))}
                            {anyAdded && (
                                <Link href={route("flights.cart.index", { section: "stays" })} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg">
                                    <ShoppingCart className="h-4 w-4" /> Finaliser la réservation
                                </Link>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">{property.bookable ? "Comparer ailleurs" : "Voir les prix et réserver chez"}</h4>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(property.links || {}).map(([key, url]) => (
                                <a key={key} href={url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 ${partnerMeta[key]?.color || "bg-slate-100"}`}>
                                    {partnerMeta[key]?.label || key} <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            ))}
                        </div>
                        {!property.bookable && (
                            <p className="text-[11px] text-slate-500">Dates et nombre de voyageurs pré-remplis. Le prix, la disponibilité et les conditions sont ceux du site partenaire, qui reste votre interlocuteur pour cette réservation.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
