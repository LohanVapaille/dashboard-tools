import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, router, usePage } from "@inertiajs/react";
import {
    ArrowLeftRight,
    BadgeCheck,
    Check,
    CircleAlert,
    ExternalLink,
    LoaderCircle,
    LocateFixed,
    Lock,
    MapPin,
    Plane,
    PlaneLanding,
    PlaneTakeoff,
    Search,
    ShieldCheck,
    ShoppingCart,
    TrainFront,
    Users,
} from "lucide-react";
import { useAffiliateLinks } from "@/Utils/affiliate";
import TransitionCard from "@/Components/Itinerary/TransitionCard";
import DateRangePicker from "@/Components/DateRangePicker";
import AirportCombobox from "@/Components/AirportCombobox";
import FlightResults, { ResultsSkeleton } from "@/Components/Flights/FlightResults";
import { AirlineLogo, FlightTimeline, OfferBadges, PriceBreakdown } from "@/Components/Flights/FlightOfferCard";
import BaggageSelector, { baggagePayload, baggageTotal } from "@/Components/Flights/BaggageSelector";
import { firstError, formatPrice, localDate, placeLabel } from "@/Utils/flights";
import { flightPartnerLinks, groundPartnerLinks } from "@/Utils/partners";
import TripReservations, { usePartnerBooking } from "@/Components/Reservations/TripReservations";
import { TRANSPORT_KINDS } from "@/Components/Reservations/kinds";

const HOME_KEY = "travelplanner.flights.home";
const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const futureOrEmpty = (date) => (date && date >= today() ? date : "");

const readHome = () => {
    try {
        return JSON.parse(localStorage.getItem(HOME_KEY)) || null;
    } catch {
        return null;
    }
};

const nearest = async (lat, lng) => {
    const response = await axios.get(route("flights.airports.nearest"), { params: { lat, lng } });
    return response.data.airports || [];
};

const cabins = {
    economy: "Économique",
    premium_economy: "Premium éco.",
    business: "Affaires",
    first: "Première",
};

function Stepper({ step, roundtrip, selection, onStep, free = false }) {
    const steps = [
        { key: "outbound", label: "Vol aller", done: Boolean(selection.outbound) },
        ...(roundtrip ? [{ key: "return", label: "Vol retour", done: Boolean(selection.return) }] : []),
        ...(free ? [] : [{ key: "review", label: "Récapitulatif", done: false }]),
    ];
    const reachable = (key) => key === "outbound" || (key === "return" && (free || selection.outbound)) || (key === "review" && selection.outbound && (!roundtrip || selection.return));

    return (
        <ol className="flex items-center gap-2 overflow-x-auto">
            {steps.map((item, index) => {
                const active = item.key === step;
                return (
                    <li key={item.key} className="flex items-center gap-2">
                        {index > 0 && <span className="h-px w-6 bg-slate-300 dark:bg-slate-600 sm:w-10" />}
                        <button
                            type="button"
                            disabled={!reachable(item.key)}
                            onClick={() => onStep(item.key)}
                            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed ${
                                active
                                    ? "bg-white text-indigo-700 shadow-md"
                                    : item.done
                                      ? "bg-white/20 text-white hover:bg-white/30"
                                      : "bg-white/10 text-white/70"
                            }`}
                        >
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${active ? "bg-indigo-600 text-white" : item.done ? "bg-emerald-400 text-white" : "bg-white/20"}`}>
                                {item.done && !active ? <Check className="h-3 w-3" /> : index + 1}
                            </span>
                            {item.label}
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}

function SelectedFlight({ label, offer, onChange, tone = "sky" }) {
    const tones = {
        sky: "from-sky-500 to-indigo-500",
        violet: "from-violet-500 to-fuchsia-500",
    };
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className={`flex items-center justify-between bg-gradient-to-r ${tones[tone]} px-4 py-2 text-white`}>
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <BadgeCheck className="h-4 w-4" /> {label} · {localDate(offer.departure, { weekday: "long", day: "numeric", month: "long" })}
                </span>
                {onChange && (
                    <button type="button" onClick={onChange} className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/30">
                        Modifier
                    </button>
                )}
            </div>
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 sm:w-44">
                    <AirlineLogo airline={offer.airline} size="h-9 w-9" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{offer.airline?.name}</p>
                        <p className="text-xs text-slate-500">{offer.segments?.map((segment) => segment.flight_number).join(" · ")}</p>
                    </div>
                </div>
                <FlightTimeline offer={offer} size="sm" />
                <p className="text-right text-lg font-black text-indigo-600 dark:text-indigo-400 sm:w-32">{formatPrice(offer.total_amount, offer.currency)}</p>
            </div>
        </div>
    );
}

const cityName = (place) => (place || "").split(",")[0].trim();

const CityField = ({ label, icon: Icon, value, onChange }) => (
    <label className="block">
        <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><Icon className="h-3.5 w-3.5" /> {label}</span>
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Ville" className="w-full rounded-xl border-slate-300 text-sm font-semibold focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
    </label>
);

/** Trajets train / bus / covoiturage : réservés chez les partenaires, rangés ensuite dans le voyage. */
function GroundSearch({ trip, onOpen }) {
    const stays = trip.stays || [];
    // Trajets du voyage : départ → 1re étape, étape → étape, dernière étape → retour.
    const legs = useMemo(() => {
        const points = [
            ...(trip.origin_name ? [{ name: trip.origin_name, date: null }] : []),
            ...stays.map((stay) => ({ name: stay.location_name, date: stay.arrival_date, leave: stay.departure_date })),
        ];
        const list = points.slice(1).map((point, index) => ({ from: points[index].name, to: point.name, date: points[index].leave || point.date }));
        if (trip.origin_name && stays.length) list.push({ from: stays[stays.length - 1].location_name, to: trip.origin_name, date: stays[stays.length - 1].departure_date });
        return list.filter((leg) => cityName(leg.from) && cityName(leg.from) !== cityName(leg.to));
    }, [trip]);

    const [form, setForm] = useState(() => ({
        from: cityName(legs[0]?.from || trip.origin_name),
        to: cityName(legs[0]?.to || stays[0]?.location_name),
        date: futureOrEmpty(legs[0]?.date || trip.start_date),
        passengers: Math.min(9, trip.travelers || 1),
    }));
    const links = groundPartnerLinks(form);
    const draft = (provider) => ({
        kind: "train",
        title: `${form.from} → ${form.to}`,
        provider,
        origin: form.from,
        destination: form.to,
        starts_at: form.date ? `${form.date}T08:00` : "",
        travelers: form.passengers,
    });

    return (
        <div className="space-y-4 rounded-3xl bg-white p-5 dark:bg-slate-800">
            {legs.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Trajets du voyage</span>
                    {legs.map((leg, index) => {
                        const active = cityName(leg.from) === form.from && cityName(leg.to) === form.to;
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => setForm((current) => ({ ...current, from: cityName(leg.from), to: cityName(leg.to), date: futureOrEmpty(leg.date) || current.date }))}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${active ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-indigo-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"}`}
                            >
                                {cityName(leg.from)} → {cityName(leg.to)}
                            </button>
                        );
                    })}
                </div>
            )}
            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_auto] md:items-end">
                <CityField label="Départ" icon={TrainFront} value={form.from} onChange={(from) => setForm((current) => ({ ...current, from }))} />
                <button type="button" onClick={() => setForm((current) => ({ ...current, from: current.to, to: current.from }))} title="Inverser" className="mx-auto mb-1 rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:rotate-180 hover:text-indigo-600 dark:border-slate-600 dark:bg-slate-900">
                    <ArrowLeftRight className="h-4 w-4" />
                </button>
                <CityField label="Arrivée" icon={MapPin} value={form.to} onChange={(to) => setForm((current) => ({ ...current, to }))} />
                <DateRangePicker single label="Date" startPlaceholder="Choisir" minDate={today()} startDate={form.date} onChange={(date) => setForm((current) => ({ ...current, date }))} />
                <label className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-600">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Voyageurs</span>
                    <select value={form.passengers} onChange={(event) => setForm((current) => ({ ...current, passengers: Number(event.target.value) }))} className="block w-full min-w-[4rem] border-0 bg-transparent py-0 pl-0 pr-7 text-sm font-bold text-slate-800 focus:ring-0 dark:text-white">
                        {Array.from({ length: 9 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
                    </select>
                </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {links.map((link) => (
                    <button
                        key={link.key}
                        type="button"
                        onClick={() => onOpen(link.url, draft(link.label))}
                        className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700"
                    >
                        <span>
                            <span className={`inline-block rounded-lg px-2.5 py-1 text-sm font-black ${link.color}`}>{link.label}</span>
                            <span className="mt-1.5 block text-xs text-slate-500">{link.hint}</span>
                        </span>
                        <ExternalLink className="h-4 w-4 text-slate-300 transition group-hover:text-indigo-500" />
                    </button>
                ))}
            </div>
            <p className="text-[11px] text-slate-400">
                Omio et BlaBlaCar s’ouvrent avec votre trajet pré-rempli. Le partenaire vend le billet et encaisse le paiement ; nous pouvons percevoir une commission, sans surcoût pour vous.
            </p>
        </div>
    );
}

export default function TransportTab({ trip }) {
    useAffiliateLinks();
    const { props } = usePage();
    const user = props.auth?.user;
    const stays = trip.stays || [];
    const firstStay = stays[0];
    const lastStay = stays[stays.length - 1];
    const defaultPassengers = Math.min(9, trip.travelers || 1 + (trip.avatars?.length || 0));

    const [roundtrip, setRoundtrip] = useState(true);
    const [origin, setOrigin] = useState(readHome);
    const [destination, setDestination] = useState(null);
    const [returnFrom, setReturnFrom] = useState(null);
    const [returnTo, setReturnTo] = useState(null);
    const [dates, setDates] = useState({
        outbound: futureOrEmpty(firstStay?.arrival_date || trip.start_date),
        return: futureOrEmpty(lastStay?.departure_date || trip.end_date),
    });
    const [passengers, setPassengers] = useState(defaultPassengers);
    const [cabin, setCabin] = useState("economy");
    const [suggestions, setSuggestions] = useState({ home: [], destination: [], returnFrom: [] });
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState("");

    const [step, setStep] = useState("outbound");
    const [results, setResults] = useState({ outbound: null, return: null });
    const [loading, setLoading] = useState({ outbound: false, return: false });
    const [errors, setErrors] = useState({});
    const [selection, setSelection] = useState({ outbound: null, return: null });
    const [cart, setCart] = useState({ loading: false, added: false, error: "" });
    const [bags, setBags] = useState({ outbound: {}, return: {} });
    const [mode, setMode] = useState("flight");
    const direct = Boolean(props.commerce?.direct_booking);
    const partner = usePartnerBooking(trip, TRANSPORT_KINDS);

    // Pré-remplissage : aéroports les plus proches des séjours du voyage.
    useEffect(() => {
        if (firstStay?.latitude && firstStay?.longitude) {
            nearest(firstStay.latitude, firstStay.longitude)
                .then((airports) => {
                    setSuggestions((current) => ({ ...current, destination: airports }));
                    setDestination((current) => current || airports[0] || null);
                })
                .catch(() => {});
        }
        if (lastStay?.latitude && lastStay?.longitude && lastStay.id !== firstStay?.id) {
            nearest(lastStay.latitude, lastStay.longitude)
                .then((airports) => {
                    setSuggestions((current) => ({ ...current, returnFrom: airports }));
                    setReturnFrom((current) => current || airports[0] || null);
                })
                .catch(() => {});
        }
    }, [firstStay?.id, lastStay?.id]);

    const locate = (silent = false) => {
        if (!navigator.geolocation) {
            if (!silent) setLocationError("La géolocalisation n’est pas disponible sur ce navigateur.");
            return;
        }
        setLocating(true);
        setLocationError("");
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                try {
                    const airports = await nearest(coords.latitude, coords.longitude);
                    setSuggestions((current) => ({ ...current, home: airports }));
                    if (airports[0]) {
                        // La position actuelle prime sur l'aéroport mémorisé.
                        setOrigin((current) => (silent && current && current.code !== readHome()?.code ? current : airports[0]));
                        localStorage.setItem(HOME_KEY, JSON.stringify(airports[0]));
                    }
                } catch {
                    if (!silent) setLocationError("Impossible de trouver un aéroport proche de vous.");
                } finally {
                    setLocating(false);
                }
            },
            () => {
                setLocating(false);
                if (!silent) setLocationError("Autorisez la localisation dans votre navigateur, ou choisissez votre aéroport de départ.");
            },
            { timeout: 10000, maximumAge: 30 * 60 * 1000 },
        );
    };

    // Départ : la ville indiquée à la création du voyage prime, sinon la position actuelle.
    useEffect(() => {
        if (trip.origin_latitude && trip.origin_longitude) {
            nearest(trip.origin_latitude, trip.origin_longitude)
                .then((airports) => {
                    setSuggestions((current) => ({ ...current, home: airports }));
                    if (airports[0]) setOrigin(airports[0]);
                })
                .catch(() => locate(true));
        } else {
            locate(true);
        }
    }, []);

    const legParams = {
        outbound: { origin, destination, date: dates.outbound },
        return: { origin: returnFrom || destination, destination: returnTo || origin, date: dates.return },
    };

    const searchKey = (leg, date) => {
        const params = legParams[leg];
        return [params.origin?.code, params.destination?.code, date || params.date, passengers, cabin].join("|");
    };

    // `date` : relance depuis le calendrier des prix, sans attendre la mise à jour de l'état.
    const search = async (leg, date) => {
        const params = { ...legParams[leg], ...(date ? { date } : {}) };
        if (!params.origin || !params.destination || !params.date) {
            setErrors((current) => ({ ...current, [leg]: "Choisissez les aéroports et la date du vol." }));
            return;
        }
        setLoading((current) => ({ ...current, [leg]: true }));
        setErrors((current) => ({ ...current, [leg]: "" }));
        try {
            const response = await axios.post(route("trips.travel-search.flights", trip.id), {
                origin: params.origin.code,
                destination: params.destination.code,
                date: params.date,
                passengers,
                cabin,
            });
            setResults((current) => ({ ...current, [leg]: { ...response.data, key: searchKey(leg, params.date) } }));
        } catch (error) {
            setResults((current) => ({ ...current, [leg]: null }));
            setErrors((current) => ({ ...current, [leg]: firstError(error, "La recherche de vols a échoué. Réessayez.") }));
        } finally {
            setLoading((current) => ({ ...current, [leg]: false }));
        }
    };

    // Changer le nombre de passagers ou la classe invalide les vols déjà choisis.
    useEffect(() => {
        setSelection({ outbound: null, return: null });
        setResults({ outbound: null, return: null });
        setStep("outbound");
        setCart({ loading: false, added: false, error: "" });
    }, [passengers, cabin]);

    const goTo = (next) => {
        setStep(next);
        if (next === "return" && !loading.return && results.return?.key !== searchKey("return")) {
            search("return");
        }
    };

    const selectOutbound = (offer) => {
        setSelection((current) => ({ ...current, outbound: offer }));
        setBags((current) => ({ ...current, outbound: {} }));
        setCart({ loading: false, added: false, error: "" });
        goTo(roundtrip ? "return" : "review");
        window.scrollTo({ top: document.getElementById("transport-top")?.offsetTop ?? 0, behavior: "smooth" });
    };

    const selectReturn = (offer) => {
        if (selection.outbound && offer.departure.slice(0, 16) <= selection.outbound.arrival.slice(0, 16)) {
            setErrors((current) => ({ ...current, return: "Ce vol retour part avant l’arrivée de votre vol aller. Choisissez un vol plus tardif." }));
            return;
        }
        setErrors((current) => ({ ...current, return: "" }));
        setSelection((current) => ({ ...current, return: offer }));
        setBags((current) => ({ ...current, return: {} }));
        setCart({ loading: false, added: false, error: "" });
        setStep("review");
        window.scrollTo({ top: document.getElementById("transport-top")?.offsetTop ?? 0, behavior: "smooth" });
    };

    const leg = step === "return" ? "return" : "outbound";
    const chosen = [selection.outbound, roundtrip ? selection.return : null].filter(Boolean);
    const bagsTotal = baggageTotal(bags.outbound) + (roundtrip ? baggageTotal(bags.return) : 0);
    const total = chosen.reduce((sum, offer) => sum + offer.total_amount, 0) + bagsTotal;
    const currency = chosen[0]?.currency || "EUR";
    const currencyMismatch = chosen.length === 2 && chosen[0].currency !== chosen[1].currency;

    const addToCart = async () => {
        setCart({ loading: true, added: false, error: "" });
        try {
            await axios.post(route("flights.cart.store"), {
                trip_id: trip.id,
                items: roundtrip
                    ? [
                          { offer_id: selection.outbound.id, direction: "outbound", services: baggagePayload(bags.outbound) },
                          { offer_id: selection.return.id, direction: "return", services: baggagePayload(bags.return) },
                      ]
                    : [{ offer_id: selection.outbound.id, direction: "oneway", services: baggagePayload(bags.outbound) }],
            });
            setCart({ loading: false, added: true, error: "" });
            router.reload({ only: ["cart"] });
        } catch (error) {
            setCart({ loading: false, added: false, error: firstError(error, "Impossible d’ajouter ces vols au panier.") });
        }
    };

    const offerDraft = (offer) => ({
        kind: "flight",
        title: `${offer.airline?.name || "Vol"} · ${offer.origin?.city || offer.origin?.code} → ${offer.destination?.city || offer.destination?.code}`,
        provider: offer.partner_label || offer.provider_label,
        origin: placeLabel(offer.origin),
        destination: placeLabel(offer.destination),
        starts_at: offer.departure?.slice(0, 16),
        ends_at: offer.arrival?.slice(0, 16),
        price: offer.total_amount,
        currency: offer.currency,
        travelers: offer.passengers_count,
        details: {
            carrier: offer.airline?.name || "",
            number: offer.segments?.map((segment) => segment.flight_number).filter(Boolean).join(" · ") || offer.flight_number || "",
            ...(offer.cabin ? { cabin: offer.cabin } : {}),
        },
    });
    const openOffer = direct
        ? undefined
        : (offer) => {
              partner.open(offer.external_url, offerDraft(offer));
              if (step === "outbound" && roundtrip) goTo("return");
          };
    const comparators = flightPartnerLinks({
        origin: legParams[leg]?.origin?.code,
        destination: legParams[leg]?.destination?.code,
        date: legParams[leg]?.date,
        passengers,
        marker: props.affiliate?.marker,
        project: props.affiliate?.project_id,
    });

    const swap = () => {
        setOrigin(destination);
        setDestination(origin);
        setSelection({ outbound: null, return: null });
    };

    const formReady = useMemo(() => Boolean(origin && destination && dates.outbound && (!roundtrip || dates.return)), [origin, destination, dates, roundtrip]);

    return (
        <div className="space-y-6" id="transport-top">
            <section className="relative z-20 rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-600 shadow-xl shadow-indigo-500/20">
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-4 pt-6 text-white">
                    <div>
                        <h2 className="flex items-center gap-2 text-2xl font-black">
                            {mode === "flight" ? <PlaneTakeoff className="h-6 w-6" /> : <TrainFront className="h-6 w-6" />} {mode === "flight" ? "Trouver vos vols" : "Trains, bus et covoiturage"}
                        </h2>
                        <p className="mt-1 text-sm text-indigo-100">
                            {props.commerce?.direct_booking
                                ? "Plus de 300 compagnies comparées · prix taxes et frais inclus · paiement sécurisé"
                                : "Plus de 300 compagnies comparées · achat chez notre partenaire Aviasales, sans frais ajoutés"}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex rounded-xl bg-white/15 p-1 backdrop-blur">
                            {[["flight", Plane, "Avion"], ["ground", TrainFront, "Train & bus"]].map(([key, Icon, label]) => (
                                <button key={key} type="button" onClick={() => setMode(key)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${mode === key ? "bg-white text-indigo-700 shadow" : "text-white/80 hover:text-white"}`}>
                                    <Icon className="h-3.5 w-3.5" /> {label}
                                </button>
                            ))}
                        </div>
                        {mode === "flight" && <Stepper step={step} roundtrip={roundtrip} selection={selection} onStep={goTo} free={!direct} />}
                    </div>
                </div>

                {mode === "ground" && <GroundSearch trip={trip} onOpen={partner.open} />}

                {mode === "flight" && step === "outbound" && (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            search("outbound");
                        }}
                        className="space-y-4 rounded-3xl bg-white p-5 dark:bg-slate-800"
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
                                {[
                                    [true, "Aller-retour"],
                                    [false, "Aller simple"],
                                ].map(([value, label]) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => {
                                            setRoundtrip(value);
                                            setSelection((current) => ({ ...current, return: null }));
                                        }}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${roundtrip === value ? "bg-white text-indigo-700 shadow dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <label className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                <Users className="h-4 w-4 text-indigo-500" />
                                <select value={passengers} onChange={(event) => setPassengers(Number(event.target.value))} className="border-0 bg-transparent p-0 pr-6 text-xs font-bold focus:ring-0">
                                    {Array.from({ length: 9 }, (_, index) => index + 1).map((count) => (
                                        <option key={count} value={count}>{count} adulte{count > 1 ? "s" : ""}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                <select value={cabin} onChange={(event) => setCabin(event.target.value)} className="border-0 bg-transparent p-0 pr-6 text-xs font-bold focus:ring-0">
                                    {Object.entries(cabins).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                </select>
                            </label>
                            {defaultPassengers > 1 && (
                                <span className="text-[11px] text-slate-400">{defaultPassengers} voyageurs prévus pour ce voyage</span>
                            )}
                        </div>

                        <div className="grid items-start gap-4 lg:grid-cols-[1fr_auto_1fr]">
                            <AirportCombobox
                                label="Départ"
                                icon={PlaneTakeoff}
                                value={origin}
                                onChange={(airport) => {
                                    setOrigin(airport);
                                    localStorage.setItem(HOME_KEY, JSON.stringify(airport));
                                }}
                                suggestions={suggestions.home}
                                suggestionsLabel={trip.origin_name ? `Près de ${trip.origin_name.split(",")[0]} :` : "Près de vous :"}
                                required
                            />
                            <button type="button" onClick={swap} title="Inverser" className="mx-auto mt-6 rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:rotate-180 hover:text-indigo-600 dark:border-slate-600 dark:bg-slate-900">
                                <ArrowLeftRight className="h-4 w-4" />
                            </button>
                            <AirportCombobox
                                label="Destination"
                                icon={PlaneLanding}
                                value={destination}
                                onChange={setDestination}
                                suggestions={suggestions.destination}
                                suggestionsLabel={firstStay ? `Près de ${firstStay.location_name.split(",")[0]} :` : undefined}
                                required
                            />
                        </div>

                        <div className="grid items-end gap-4 md:grid-cols-[1fr_auto]">
                            <DateRangePicker
                                single={!roundtrip}
                                label={roundtrip ? "Dates aller → retour" : "Date du vol"}
                                startPlaceholder="Date de l’aller"
                                endPlaceholder="la date du retour"
                                minDate={today()}
                                startDate={dates.outbound}
                                endDate={roundtrip ? dates.return : ""}
                                onChange={(outbound, back) => setDates((current) => ({ outbound, return: roundtrip ? back : current.return }))}
                            />
                            <button
                                disabled={loading.outbound || !formReady}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading.outbound ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                Rechercher les vols aller
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                            <button type="button" onClick={() => locate(false)} disabled={locating} className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-400">
                                {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                                {locating ? "Localisation…" : "Utiliser ma position actuelle"}
                            </button>
                            {locationError && <span className="text-amber-600">{locationError}</span>}
                            {(firstStay || trip.start_date) && (
                                <span className="text-slate-400">Dates et destination pré-remplies depuis votre voyage.</span>
                            )}
                        </div>
                    </form>
                )}

                {mode === "flight" && step === "return" && (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            search("return");
                        }}
                        className="space-y-4 rounded-3xl bg-white p-5 dark:bg-slate-800"
                    >
                        {selection.outbound ? (
                            <SelectedFlight label="Aller choisi" offer={selection.outbound} onChange={() => setStep("outbound")} />
                        ) : (
                            <button type="button" onClick={() => setStep("outbound")} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400">
                                <PlaneTakeoff className="h-3.5 w-3.5" /> Revenir aux vols aller
                            </button>
                        )}
                        <div className="grid items-end gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                            <AirportCombobox
                                label="Retour depuis"
                                icon={PlaneTakeoff}
                                value={legParams.return.origin}
                                onChange={setReturnFrom}
                                suggestions={suggestions.returnFrom.length ? suggestions.returnFrom : suggestions.destination}
                                suggestionsLabel={lastStay ? `Près de ${lastStay.location_name.split(",")[0]} :` : undefined}
                            />
                            <AirportCombobox label="Arrivée" icon={PlaneLanding} value={legParams.return.destination} onChange={setReturnTo} suggestions={suggestions.home} suggestionsLabel="Près de chez vous :" />
                            <DateRangePicker
                                single
                                label="Date du retour"
                                startPlaceholder="Choisir"
                                minDate={dates.outbound || today()}
                                startDate={dates.return}
                                onChange={(value) => setDates((current) => ({ ...current, return: value }))}
                            />
                            <button disabled={loading.return} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 disabled:opacity-50">
                                {loading.return ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                Actualiser
                            </button>
                        </div>
                    </form>
                )}

                {mode === "flight" && step === "review" && (
                    <div className="space-y-4 rounded-3xl bg-white p-5 dark:bg-slate-800">
                        <SelectedFlight label={roundtrip ? "Aller" : "Aller simple"} offer={selection.outbound} onChange={() => setStep("outbound")} />
                        {roundtrip && selection.return && (
                            <SelectedFlight label="Retour" tone="violet" offer={selection.return} onChange={() => goTo("return")} />
                        )}
                    </div>
                )}
            </section>

            {mode === "flight" && step !== "review" && (
                <section className="space-y-4">
                    <h3 className="flex flex-wrap items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-bold uppercase text-white ${leg === "return" ? "bg-violet-500" : "bg-sky-500"}`}>
                            {leg === "return" ? "Étape 2 · Retour" : "Étape 1 · Aller"}
                        </span>
                        {!direct && roundtrip && (
                            <button
                                type="button"
                                onClick={() => goTo(leg === "return" ? "outbound" : "return")}
                                className="order-last ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                                {leg === "return" ? <PlaneTakeoff className="h-3.5 w-3.5" /> : <PlaneLanding className="h-3.5 w-3.5" />}
                                {leg === "return" ? "Voir les vols aller" : "Voir les vols retour"}
                            </button>
                        )}
                        {legParams[leg].origin && legParams[leg].destination && (
                            <span>
                                {placeLabel(legParams[leg].origin)} → {placeLabel(legParams[leg].destination)}
                                {legParams[leg].date && <span className="ml-2 text-sm font-medium text-slate-500">{localDate(legParams[leg].date, { weekday: "long", day: "numeric", month: "long" })}</span>}
                            </span>
                        )}
                    </h3>

                    {!direct && comparators.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                            <span className="mr-1 text-xs font-bold uppercase tracking-wide text-slate-500">Comparer ce trajet sur</span>
                            {comparators.map((link) => (
                                <button
                                    key={link.key}
                                    type="button"
                                    onClick={() => partner.open(link.url, { kind: "flight", title: `${placeLabel(legParams[leg].origin)} → ${placeLabel(legParams[leg].destination)}`, provider: link.label, origin: placeLabel(legParams[leg].origin), destination: placeLabel(legParams[leg].destination), starts_at: legParams[leg].date ? `${legParams[leg].date}T08:00` : "", travelers: passengers })}
                                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition hover:-translate-y-0.5 ${link.color}`}
                                >
                                    {link.label} <ExternalLink className="h-3 w-3" />
                                </button>
                            ))}
                        </div>
                    )}

                    {errors[leg] && (
                        <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {errors[leg]}
                        </p>
                    )}
                    {loading[leg] && <ResultsSkeleton />}
                    {!loading[leg] && results[leg] && (
                        <FlightResults
                            key={results[leg].key}
                            result={results[leg]}
                            onSelect={leg === "return" ? selectReturn : selectOutbound}
                            onPartner={openOffer}
                            actionLabel={leg === "return" ? "Choisir ce retour" : roundtrip ? "Choisir cet aller" : "Choisir ce vol"}
                            date={legParams[leg].date}
                            onDateChange={(date) => {
                                setDates((current) => ({ ...current, [leg]: date }));
                                search(leg, date);
                            }}
                            onSearchAll={(url) =>
                                partner.open(url, {
                                    kind: "flight",
                                    title: `${placeLabel(legParams[leg].origin)} → ${placeLabel(legParams[leg].destination)}`,
                                    provider: "Aviasales",
                                    origin: placeLabel(legParams[leg].origin),
                                    destination: placeLabel(legParams[leg].destination),
                                    starts_at: legParams[leg].date ? `${legParams[leg].date}T08:00` : "",
                                    travelers: passengers,
                                })
                            }
                        />
                    )}
                    {!loading[leg] && !results[leg] && !errors[leg] && leg === "outbound" && (
                        <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-slate-700">
                            Lancez la recherche pour comparer les vols aller.
                        </p>
                    )}
                </section>
            )}

            {mode === "flight" && step === "review" && selection.outbound && (
                <section className="grid gap-5 lg:grid-cols-[1fr_22rem]">
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                        <h3 className="font-black text-slate-900 dark:text-white">Bagages et conditions de vos billets</h3>
                        {chosen.map((offer, index) => {
                            const leg = index === 0 ? "outbound" : "return";
                            return (
                                <div key={offer.id} className="space-y-3 border-b border-slate-100 pb-4 last:border-0 dark:border-slate-700">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{roundtrip ? (index === 0 ? "Aller" : "Retour") : "Vol"} · {offer.airline?.name}</p>
                                    <OfferBadges offer={offer} />
                                    <BaggageSelector offer={offer} value={bags[leg]} onChange={(value) => setBags((current) => ({ ...current, [leg]: value }))} />
                                    <PriceBreakdown offer={offer} />
                                </div>
                            );
                        })}
                        <p className="text-xs leading-relaxed text-slate-500">
                            Les billets sont nominatifs. Le remboursement et la modification dépendent du tarif ci-dessus. En cas d’annulation ou de retard important par la compagnie, vous bénéficiez des droits du règlement européen 261/2004.{" "}
                            <Link href={route("legal.terms")} className="font-semibold text-indigo-600 hover:underline">Conditions de vente</Link>
                        </p>
                    </div>

                    <aside className="h-fit space-y-4 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-5 shadow-sm dark:border-indigo-900 dark:from-indigo-950/40 dark:to-slate-800 lg:sticky lg:top-24">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Total {roundtrip ? "aller-retour" : ""}</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">{formatPrice(total, currency)}</p>
                            <p className="text-xs text-slate-500">pour {passengers} passager{passengers > 1 ? "s" : ""}, taxes et frais inclus</p>
                            {bagsTotal > 0 && <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">dont bagages supplémentaires : {formatPrice(bagsTotal, currency)}</p>}
                        </div>

                        {currencyMismatch && (
                            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Ces deux vols sont proposés dans des devises différentes et ne peuvent pas être payés ensemble. Choisissez un autre vol retour.</p>
                        )}
                        {cart.error && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{cart.error}</p>}

                        {cart.added ? (
                            <div className="space-y-3">
                                <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    <Check className="h-4 w-4" /> Vols ajoutés au panier
                                </p>
                                <Link href={route("flights.cart.index")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg">
                                    <ShoppingCart className="h-4 w-4" /> Finaliser la réservation
                                </Link>
                            </div>
                        ) : user ? (
                            <button
                                type="button"
                                onClick={addToCart}
                                disabled={cart.loading || currencyMismatch}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
                            >
                                {cart.loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                                {cart.loading ? "Vérification du tarif…" : roundtrip ? "Ajouter l’aller-retour au panier" : "Ajouter au panier"}
                            </button>
                        ) : (
                            <Link href={route("login")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                                <Lock className="h-4 w-4" /> Se connecter pour réserver
                            </Link>
                        )}

                        <ul className="space-y-1.5 text-xs text-slate-500">
                            <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Prix revérifié auprès de la compagnie avant paiement</li>
                            <li className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-emerald-500" /> Paiement sécurisé par Stripe</li>
                            <li className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Remboursement automatique si un billet n’est pas émis</li>
                        </ul>
                    </aside>
                </section>
            )}

            <TripReservations
                trip={trip}
                kinds={TRANSPORT_KINDS}
                title="Mes billets"
                accent="text-sky-700 dark:text-sky-300"
                empty="Aucun billet enregistré. Après un achat chez un partenaire, retrouvez-le ici avec sa référence."
            />
            {partner.element}

            <section className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-700">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Trajets du voyage</h3>
                {firstStay && lastStay && firstStay.id !== lastStay.id && (
                    <a className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(firstStay.location_name)}&destination=${encodeURIComponent(lastStay.location_name)}`}>
                        <ExternalLink className="h-4 w-4" /> Voir l’itinéraire terrestre sur Google Maps
                    </a>
                )}
                {trip.transitions?.length ? (
                    trip.transitions.map((transition) => <TransitionCard key={transition.id} transition={transition} />)
                ) : (
                    <p className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                        Aucun trajet entre étapes enregistré.
                    </p>
                )}
            </section>
        </div>
    );
}
