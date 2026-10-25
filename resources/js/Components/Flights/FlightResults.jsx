import { useMemo, useState } from "react";
import { ArrowUpDown, Briefcase, CircleAlert, Clock3, ExternalLink, Luggage, Plane, ShieldCheck, SlidersHorizontal } from "lucide-react";
import FlightOfferCard from "@/Components/Flights/FlightOfferCard";
import { formatPrice } from "@/Utils/flights";

const timeSlots = {
    all: "Toute la journée",
    morning: "Matin (avant 12 h)",
    afternoon: "Après-midi (12 h – 18 h)",
    evening: "Soir (après 18 h)",
};

const inSlot = (offer, slot) => {
    const hour = Number(offer.departure?.slice(11, 13));
    if (slot === "morning") return hour < 12;
    if (slot === "afternoon") return hour >= 12 && hour < 18;
    if (slot === "evening") return hour >= 18;
    return true;
};

const Select = ({ icon: Icon, label, value, onChange, children }) => (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {Icon && <Icon className="h-4 w-4 text-indigo-500" />}
        <span className="sr-only">{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} className="border-0 bg-transparent p-0 pr-6 text-sm font-medium text-slate-700 outline-none focus:ring-0 dark:bg-slate-800 dark:text-slate-200">
            {children}
        </select>
    </label>
);

export function ResultsSkeleton() {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="Recherche en cours">
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-violet-50 p-4 text-sm font-medium text-indigo-700 dark:from-sky-950/30 dark:via-indigo-950/30 dark:to-violet-950/30 dark:text-indigo-300">
                <Plane className="h-5 w-5 animate-bounce" />
                Nous interrogeons les compagnies aériennes… cela peut prendre jusqu’à 20 secondes.
            </div>
            {[0, 1, 2].map((index) => (
                <div key={index} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
            ))}
        </div>
    );
}

/** Meilleur prix Aviasales de chaque jour du mois : un clic relance la recherche à cette date. */
function PriceCalendar({ calendar, date, onDateChange }) {
    if (!calendar?.length) return null;
    const cheapest = Math.min(...calendar.map((day) => day.price));

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-500">Meilleurs prix constatés sur Aviasales ce mois-ci · par personne</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
                {calendar.map((day) => {
                    const active = day.date === date;
                    const low = day.price === cheapest;
                    const label = new Date(`${day.date}T12:00:00`);
                    return (
                        <button
                            key={day.date}
                            type="button"
                            onClick={() => !active && onDateChange?.(day.date)}
                            className={`flex w-[4.75rem] shrink-0 flex-col items-center rounded-xl px-2 py-2 text-center ring-1 transition ${active ? "bg-indigo-600 text-white ring-indigo-600" : low ? "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900" : "bg-white text-slate-700 ring-slate-200 hover:bg-indigo-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"}`}
                        >
                            <span className={`text-[10px] font-bold uppercase ${active ? "text-indigo-100" : "text-slate-400"}`}>{label.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                            <span className="text-sm font-black">{label.getDate()} {label.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}</span>
                            <span className="text-xs font-bold">{formatPrice(day.price, day.currency)}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function FlightResults({ result, onSelect, actionLabel, onPartner, date, onDateChange, onSearchAll }) {
    const [airline, setAirline] = useState("all");
    const [stops, setStops] = useState("all");
    const [slot, setSlot] = useState("all");
    const [sort, setSort] = useState("best");
    const [visible, setVisible] = useState(10);
    const [toggles, setToggles] = useState({ checked: false, carryOn: false, refundable: false });

    const offers = result?.offers || [];
    // Offres détaillées (réservables ici ou chez le partenaire) ; les prix indicatifs du comparateur à part.
    // Sans offre détaillée (mode partenaires), les vols Aviasales constituent la liste principale.
    const detailed = offers.filter((offer) => offer.bookable || offer.provider !== "travelpayouts");
    const bookable = detailed.length ? detailed : offers;
    const partners = detailed.length ? offers.filter((offer) => !offer.bookable && offer.provider === "travelpayouts") : [];
    const viaPartner = bookable.length > 0 && bookable.every((offer) => !offer.bookable);
    const airlines = useMemo(() => [...new Set(bookable.map((offer) => offer.airline?.name))].sort(), [bookable]);
    const priceBounds = useMemo(() => {
        const prices = bookable.map((offer) => offer.total_amount);
        return prices.length ? [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))] : [0, 0];
    }, [bookable]);
    const [maxPrice, setMaxPrice] = useState(null);
    const priceLimit = maxPrice ?? priceBounds[1];
    const currency = bookable[0]?.currency || "EUR";

    const cheapest = Math.min(...bookable.map((offer) => offer.total_amount));
    const fastest = Math.min(...bookable.map((offer) => offer.duration_minutes ?? Infinity));
    // « Meilleur choix » : compromis prix / durée, comme sur les comparateurs.
    const score = (offer) => offer.total_amount / cheapest + (offer.duration_minutes ?? fastest * 2) / fastest;

    const filtered = bookable
        .filter((offer) => airline === "all" || offer.airline?.name === airline)
        .filter((offer) => stops === "all" || offer.stops <= Number(stops))
        .filter((offer) => inSlot(offer, slot))
        .filter((offer) => !toggles.checked || offer.baggage?.checked > 0)
        .filter((offer) => !toggles.carryOn || offer.baggage?.carry_on > 0)
        .filter((offer) => !toggles.refundable || offer.conditions?.refundable === true)
        .filter((offer) => offer.total_amount <= priceLimit)
        .sort((a, b) => {
            if (sort === "price") return a.total_amount - b.total_amount;
            if (sort === "duration") return (a.duration_minutes ?? 1e9) - (b.duration_minutes ?? 1e9);
            if (sort === "departure") return a.departure.localeCompare(b.departure);
            return score(a) - score(b);
        });

    const bestId = bookable.length ? [...bookable].sort((a, b) => score(a) - score(b))[0].id : null;
    const highlightFor = (offer) => {
        if (offer.id === bestId) return { label: "Meilleur choix", className: "bg-gradient-to-r from-indigo-600 to-violet-600" };
        if (offer.total_amount === cheapest) return { label: "Le moins cher", className: "bg-emerald-500" };
        if (offer.duration_minutes === fastest) return { label: "Le plus rapide", className: "bg-sky-500" };
        return null;
    };

    const reset = (setter) => (value) => {
        setter(value);
        setVisible(10);
    };

    const aviasalesButton = result.aviasales_url && (
        <button
            type="button"
            onClick={() => onSearchAll?.(result.aviasales_url)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:from-orange-600 hover:to-rose-600"
        >
            Voir tous les vols du jour sur Aviasales <ExternalLink className="h-4 w-4" />
        </button>
    );

    return (
        <div className="space-y-4">
            <PriceCalendar calendar={result.calendar} date={date} onDateChange={onDateChange} />

            {viaPartner && result.aviasales_url && (
                <div className="flex flex-col gap-3 rounded-2xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900/60 dark:bg-orange-950/20 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                        <strong>Prix constatés récemment sur Aviasales.</strong> Le tarif exact, en temps réel, s’affiche sur Aviasales au moment de réserver.
                    </p>
                    {aviasalesButton}
                </div>
            )}

            {result.warnings?.length > 0 && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {result.warnings.join(" · ")}
                </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="text-lg font-black text-slate-900 dark:text-white">{filtered.length}</span> vol{filtered.length > 1 ? "s" : ""} {viaPartner ? "trouvé" : "réservable"}{filtered.length > 1 ? "s" : ""}
                    {result.providers?.length > 0 && (
                        <span className="ml-2 text-xs text-slate-400">via {result.providers.map((provider) => provider.label).join(", ")}</span>
                    )}
                </p>
                <div className="flex flex-wrap gap-2">
                    <Select icon={SlidersHorizontal} label="Compagnie" value={airline} onChange={reset(setAirline)}>
                        <option value="all">Toutes les compagnies</option>
                        {airlines.map((name) => <option key={name} value={name}>{name}</option>)}
                    </Select>
                    <Select label="Escales" value={stops} onChange={reset(setStops)}>
                        <option value="all">Toutes les escales</option>
                        <option value="0">Direct uniquement</option>
                        <option value="1">1 escale max.</option>
                    </Select>
                    <Select icon={Clock3} label="Heure de départ" value={slot} onChange={reset(setSlot)}>
                        {Object.entries(timeSlots).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </Select>
                    <Select icon={ArrowUpDown} label="Trier" value={sort} onChange={reset(setSort)}>
                        <option value="best">Meilleur choix</option>
                        <option value="price">Prix le plus bas</option>
                        <option value="duration">Durée la plus courte</option>
                        <option value="departure">Heure de départ</option>
                    </Select>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                {[
                    ["checked", Luggage, "Bagage soute inclus"],
                    ["carryOn", Briefcase, "Bagage cabine inclus"],
                    ["refundable", ShieldCheck, "Remboursable"],
                ].map(([key, Icon, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => {
                            setToggles((current) => ({ ...current, [key]: !current[key] }));
                            setVisible(10);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${toggles[key] ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-indigo-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"}`}
                    >
                        <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                ))}
                {priceBounds[1] > priceBounds[0] && (
                    <label className="ml-auto flex min-w-[14rem] items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Prix max
                        <input
                            type="range"
                            min={priceBounds[0]}
                            max={priceBounds[1]}
                            value={priceLimit}
                            onChange={(event) => {
                                setMaxPrice(Number(event.target.value));
                                setVisible(10);
                            }}
                            className="flex-1 accent-indigo-600"
                        />
                        <span className="w-20 text-right tabular-nums text-indigo-600 dark:text-indigo-400">{formatPrice(priceLimit, currency)}</span>
                    </label>
                )}
            </div>

            {viaPartner && (
                <p className="rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-950/30 dark:text-sky-200">
                    Les billets s’achètent chez notre partenaire Aviasales, qui vous redirige vers la compagnie ou l’agence vendeuse : c’est elle qui
                    encaisse le paiement et gère changements et annulations. Prix indicatifs, confirmés sur le site du vendeur. Nous pouvons percevoir une commission, sans surcoût pour vous.
                </p>
            )}

            {filtered.slice(0, visible).map((offer) => (
                <FlightOfferCard key={offer.id} offer={offer} onSelect={onSelect} onPartner={onPartner} actionLabel={actionLabel} highlight={highlightFor(offer)} />
            ))}

            {!filtered.length && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
                    <Plane className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {bookable.length ? "Aucun vol ne correspond à ces filtres." : result.aviasales_url ? "Aucun prix récent pour ce jour sur Aviasales." : "Aucun vol réservable trouvé pour cette date."}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        {result.calendar?.length ? "Choisissez un jour dans le calendrier ci-dessus, ou consultez tous les vols du jour en direct." : "Essayez un autre aéroport proche ou une date voisine."}
                    </p>
                    {!bookable.length && aviasalesButton && <div className="mt-4">{aviasalesButton}</div>}
                </div>
            )}

            {filtered.length > visible && (
                <button type="button" onClick={() => setVisible((count) => count + 10)} className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400">
                    Afficher plus de vols ({filtered.length - visible} restants)
                </button>
            )}

            {partners.length > 0 && (
                <details className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <summary className="cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-200">
                        <ExternalLink className="mr-1 inline h-4 w-4 text-slate-400" />
                        Comparer chez nos partenaires ({partners.length} prix indicatifs)
                    </summary>
                    <p className="mt-2 text-xs text-slate-500">Prix observés récemment, à confirmer et à réserver sur le site du partenaire. Ces vols ne peuvent pas être ajoutés au panier.</p>
                    <div className="mt-3 space-y-3">
                        {partners.slice(0, 10).map((offer) => <FlightOfferCard key={offer.id} offer={offer} onPartner={onPartner} />)}
                    </div>
                </details>
            )}
        </div>
    );
}
