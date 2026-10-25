import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
    ArrowUpDown,
    BedDouble,
    Building2,
    CircleAlert,
    ExternalLink,
    LayoutGrid,
    LoaderCircle,
    Map as MapIcon,
    MapPin,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Star,
    Users,
    X,
    Zap,
} from "lucide-react";
import { useAffiliateLinks } from "@/Utils/affiliate";
import DateRangePicker from "@/Components/DateRangePicker";
import LocationSearchInput from "@/Components/Itinerary/LocationSearchInput";
import StayPropertyCard from "@/Components/Stays/StayPropertyCard";
import StayDetailModal from "@/Components/Stays/StayDetailModal";
import StaysMap from "@/Components/Stays/StaysMap";
import TripReservations, { usePartnerBooking } from "@/Components/Reservations/TripReservations";
import { firstError, formatPrice } from "@/Utils/flights";
import { amenityMeta, formatDay, nightsBetween, partnerMeta, typeMeta } from "@/Utils/stays";

const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const formatPopulation = (count) => (count >= 1e6 ? `${(count / 1e6).toFixed(1).replace(".", ",")} M hab.` : `${Math.round(count / 1000)} k hab.`);
const futureOrEmpty = (date) => (date && date >= today() ? date : "");
const placeOf = (stay) => (stay ? { name: stay.location_name, latitude: Number(stay.latitude), longitude: Number(stay.longitude) } : null);

const defaultFilters = {
    text: "",
    types: [],
    minStars: 0,
    minRating: 0,
    amenities: [],
    freeCancellation: false,
    bookableOnly: false,
    maxPrice: null,
    maxDistance: null,
};

const Chip = ({ active, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${active ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-emerald-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"}`}
    >
        {children}
    </button>
);

function Filters({ filters, setFilters, counts, priceBounds, currency, maxDistance }) {
    const toggle = (key, value) =>
        setFilters((current) => ({
            ...current,
            [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
        }));

    return (
        <div className="space-y-5 text-sm">
            <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Rechercher un nom</p>
                <input value={filters.text} onChange={(event) => setFilters((current) => ({ ...current, text: event.target.value }))} placeholder="Ex. Ibis, Hostel…" className="w-full rounded-xl border-slate-200 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
            </div>

            <div className="space-y-2">
                {counts.bookable > 0 && (
                    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
                        <span className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300"><Zap className="h-4 w-4" /> Réservable ici</span>
                        <input type="checkbox" checked={filters.bookableOnly} onChange={(event) => setFilters((current) => ({ ...current, bookableOnly: event.target.checked }))} className="rounded text-emerald-600" />
                    </label>
                )}
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                    <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Annulation possible</span>
                    <input type="checkbox" checked={filters.freeCancellation} onChange={(event) => setFilters((current) => ({ ...current, freeCancellation: event.target.checked }))} className="rounded text-emerald-600" />
                </label>
            </div>

            {priceBounds[1] > priceBounds[0] && (
                <div>
                    <p className="mb-2 flex justify-between text-xs font-black uppercase tracking-wide text-slate-500">
                        Budget total <span className="normal-case text-emerald-600">{formatPrice(filters.maxPrice ?? priceBounds[1], currency)}</span>
                    </p>
                    <input type="range" min={priceBounds[0]} max={priceBounds[1]} value={filters.maxPrice ?? priceBounds[1]} onChange={(event) => setFilters((current) => ({ ...current, maxPrice: Number(event.target.value) }))} className="w-full accent-emerald-600" />
                </div>
            )}

            <div>
                <p className="mb-2 flex justify-between text-xs font-black uppercase tracking-wide text-slate-500">
                    Distance max <span className="normal-case text-emerald-600">{filters.maxDistance ?? maxDistance} km</span>
                </p>
                <input type="range" min={0.5} max={maxDistance} step={0.5} value={filters.maxDistance ?? maxDistance} onChange={(event) => setFilters((current) => ({ ...current, maxDistance: Number(event.target.value) }))} className="w-full accent-emerald-600" />
            </div>

            <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Type d’hébergement</p>
                <div className="space-y-1">
                    {Object.entries(typeMeta).filter(([key]) => counts.types[key]).map(([key, meta]) => {
                        const Icon = meta.icon;
                        return (
                            <label key={key} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                    <input type="checkbox" checked={filters.types.includes(key)} onChange={() => toggle("types", key)} className="rounded text-emerald-600" />
                                    <Icon className="h-4 w-4 text-slate-400" /> {meta.label}
                                </span>
                                <span className="text-xs text-slate-400">{counts.types[key]}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Classement minimum</p>
                <div className="flex flex-wrap gap-1.5">
                    {[0, 2, 3, 4, 5].map((stars) => (
                        <Chip key={stars} active={filters.minStars === stars} onClick={() => setFilters((current) => ({ ...current, minStars: stars }))}>
                            {stars === 0 ? "Tous" : <>{stars} <Star className="h-3 w-3 fill-current" /></>}
                        </Chip>
                    ))}
                </div>
            </div>

            {counts.rated > 0 && (
                <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Note des voyageurs</p>
                    <div className="flex flex-wrap gap-1.5">
                        {[[0, "Toutes"], [7, "7+ Bien"], [8, "8+ Très bien"], [9, "9+ Exceptionnel"]].map(([score, label]) => (
                            <Chip key={score} active={filters.minRating === score} onClick={() => setFilters((current) => ({ ...current, minRating: score }))}>{label}</Chip>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Équipements</p>
                <div className="grid grid-cols-1 gap-1">
                    {Object.entries(amenityMeta).filter(([key]) => counts.amenities[key]).map(([key, meta]) => {
                        const Icon = meta.icon;
                        return (
                            <label key={key} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                    <input type="checkbox" checked={filters.amenities.includes(key)} onChange={() => toggle("amenities", key)} className="rounded text-emerald-600" />
                                    <Icon className="h-4 w-4 text-slate-400" /> {meta.label}
                                </span>
                                <span className="text-xs text-slate-400">{counts.amenities[key]}</span>
                            </label>
                        );
                    })}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-slate-400">Équipements renseignés par la communauté OpenStreetMap ou l’hébergeur : vérifiez-les avant de réserver.</p>
            </div>

            <button type="button" onClick={() => setFilters(defaultFilters)} className="w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                Réinitialiser les filtres
            </button>
        </div>
    );
}

export default function StaysTab({ trip }) {
    useAffiliateLinks();
    const partner = usePartnerBooking(trip, ["stay"]);
    const stays = trip.stays || [];
    const travelers = Math.min(16, trip.travelers || 1 + (trip.avatars?.length || 0));
    const [stayId, setStayId] = useState(stays[0]?.id ?? null);
    const [place, setPlace] = useState(placeOf(stays[0]));
    const [placeText, setPlaceText] = useState(stays[0]?.location_name || "");
    const [dates, setDates] = useState({
        checkIn: futureOrEmpty(stays[0]?.arrival_date || trip.start_date),
        checkOut: futureOrEmpty(stays[0]?.departure_date || trip.end_date),
    });
    const [adults, setAdults] = useState(Math.max(1, travelers));
    const [rooms, setRooms] = useState(Math.max(1, Math.ceil(travelers / 2)));
    const [radius, setRadius] = useState(5);

    const [offers, setOffers] = useState(null);
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState({ offers: false, listings: false });
    const [errors, setErrors] = useState({});
    const [searchedAt, setSearchedAt] = useState(null);

    const [filters, setFilters] = useState(defaultFilters);
    const [sort, setSort] = useState("recommended");
    const [view, setView] = useState("split");
    const [visible, setVisible] = useState(24);
    const [selected, setSelected] = useState(null);
    const [hovered, setHovered] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    // Destination trop large (pays) : on cherche dans sa plus grande ville et on propose les autres.
    const [cityHints, setCityHints] = useState(null);
    const searchId = useRef(0);

    const applyPlace = (next) => {
        setPlace(next);
        setPlaceText(next.name);
        return next;
    };

    const resolvePlace = async (candidate) => {
        setCityHints(null);
        if (!candidate?.latitude) return candidate;
        try {
            const { data } = await axios.get(route("places.cities"), {
                params: { name: candidate.name, kind: candidate.kind, country_code: candidate.country_code },
            });
            if (data.mode === "country" && data.cities.length) {
                setCityHints({ mode: "country", country: data.country, original: candidate.name, cities: data.cities });
                const [city] = data.cities;
                return applyPlace({ name: city.label, latitude: city.latitude, longitude: city.longitude });
            }
        } catch {
            // Suggestions facultatives : on garde le lieu tel quel.
        }
        return candidate;
    };

    const chooseStay = async (stay) => {
        setStayId(stay.id);
        applyPlace(placeOf(stay));
        const nextDates = { checkIn: futureOrEmpty(stay.arrival_date), checkOut: futureOrEmpty(stay.departure_date) };
        setDates(nextDates);
        const resolved = await resolvePlace(placeOf(stay));
        if (resolved?.latitude && nextDates.checkIn && nextDates.checkOut) search(null, { place: resolved, dates: nextDates });
    };

    const searchInCity = (city) => {
        const next = applyPlace({ name: city.label, latitude: city.latitude, longitude: city.longitude });
        search(null, { place: next });
    };

    const search = async (event, override = {}) => {
        event?.preventDefault();
        const target = override.place || place;
        const range = override.dates || dates;
        if (!target?.latitude || !range.checkIn || !range.checkOut) {
            setErrors({ offers: "Choisissez une destination et vos dates de séjour." });
            return;
        }
        const payload = {
            latitude: target.latitude,
            longitude: target.longitude,
            place_name: target.name?.split(",")[0],
            check_in: range.checkIn,
            check_out: range.checkOut,
            adults,
            rooms: Math.min(rooms, adults),
            radius_km: radius,
        };
        setErrors({});
        setFilters(defaultFilters);
        setVisible(24);
        setLoading({ offers: true, listings: true });
        setListings([]);
        setSearchedAt({ ...payload });
        setCityHints((hints) => (hints?.mode === "country" ? hints : null));

        // Seule la dernière recherche lancée a le droit d'afficher ses résultats.
        const id = ++searchId.current;
        const current = (apply) => (value) => id === searchId.current && apply(value);

        // Offres réservables (rapide) et annuaire complet (plus long) en parallèle.
        axios
            .post(route("trips.stays.search", trip.id), payload)
            .then(current((response) => setOffers(response.data)))
            .catch(current((error) => {
                setOffers(null);
                setErrors((state) => ({ ...state, offers: firstError(error, "La recherche d’hébergements a échoué.") }));
            }))
            .finally(current(() => setLoading((state) => ({ ...state, offers: false }))));

        axios
            .post(route("trips.stays.listings", trip.id), payload, { timeout: 120000 })
            .then(current((response) => setListings(response.data.properties || [])))
            .catch(current((error) => setErrors((state) => ({ ...state, listings: firstError(error, "La liste complète des hébergements n’a pas pu être chargée.") }))))
            .finally(current(() => setLoading((state) => ({ ...state, listings: false }))));
    };

    // Recherche automatique à l'ouverture avec les données du voyage (un pays devient sa plus grande ville).
    useEffect(() => {
        if (stays[0]) chooseStay(stays[0]);
    }, []);


    const all = useMemo(() => [...(offers?.properties || []), ...listings], [offers, listings]);
    const currency = offers?.properties?.[0]?.price?.currency || "EUR";
    const priceBounds = useMemo(() => {
        const prices = all.filter((property) => property.price).map((property) => property.price.total_amount);
        return prices.length ? [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))] : [0, 0];
    }, [all]);
    const maxDistance = Math.max(1, Math.ceil(Math.max(radius, ...all.map((property) => property.distance_km || 0))));

    const counts = useMemo(() => {
        const result = { types: {}, amenities: {}, rated: 0, bookable: 0 };
        all.forEach((property) => {
            if (property.bookable) result.bookable += 1;
            result.types[property.type] = (result.types[property.type] || 0) + 1;
            (property.amenities || []).forEach((key) => (result.amenities[key] = (result.amenities[key] || 0) + 1));
            if (property.rating) result.rated += 1;
        });
        return result;
    }, [all]);

    const filtered = useMemo(() => {
        const text = filters.text.trim().toLowerCase();
        const list = all.filter((property) =>
            (!text || property.name.toLowerCase().includes(text))
            && (!filters.types.length || filters.types.includes(property.type))
            && (!filters.minStars || (property.stars || 0) >= filters.minStars)
            && (!filters.minRating || (property.rating || 0) >= filters.minRating)
            && filters.amenities.every((key) => property.amenities?.includes(key))
            && (!filters.freeCancellation || property.free_cancellation === true)
            && (!filters.bookableOnly || property.bookable)
            && (filters.maxPrice == null || !property.price || property.price.total_amount <= filters.maxPrice)
            && (filters.maxDistance == null || property.distance_km <= filters.maxDistance),
        );
        const score = (property) =>
            (property.bookable ? 100 : 0) + (property.rating || 0) * 3 + (property.stars || 0) * 2 + (property.amenities?.length || 0) - property.distance_km * 2;
        return [...list].sort((a, b) => {
            if (sort === "price_asc") return (a.price?.total_amount ?? Infinity) - (b.price?.total_amount ?? Infinity);
            if (sort === "price_desc") return (b.price?.total_amount ?? -1) - (a.price?.total_amount ?? -1);
            if (sort === "rating") return (b.rating || 0) - (a.rating || 0) || (b.stars || 0) - (a.stars || 0);
            if (sort === "stars") return (b.stars || 0) - (a.stars || 0);
            if (sort === "distance") return a.distance_km - b.distance_km;
            return score(b) - score(a);
        });
    }, [all, filters, sort]);

    const activeFilters = filters.types.length + filters.amenities.length + (filters.minStars ? 1 : 0) + (filters.minRating ? 1 : 0)
        + (filters.freeCancellation ? 1 : 0) + (filters.bookableOnly ? 1 : 0) + (filters.maxPrice != null ? 1 : 0) + (filters.maxDistance != null ? 1 : 0) + (filters.text ? 1 : 0);
    const nights = nightsBetween(dates.checkIn, dates.checkOut);
    const stayDraft = (property, provider) => ({
        kind: "stay",
        title: property.name,
        provider,
        address: property.address || property.city || searchedAt?.place_name || "",
        starts_at: `${property.check_in_date || searchedAt?.check_in}T${property.check_in || "15:00"}`.slice(0, 16),
        ends_at: `${property.check_out_date || searchedAt?.check_out}T${property.check_out || "11:00"}`.slice(0, 16),
        travelers: searchedAt?.adults,
    });
    const areaDraft = (provider) => ({
        kind: "stay",
        title: `Logement à ${searchedAt?.place_name || ""}`.trim(),
        provider,
        address: searchedAt?.place_name || "",
        starts_at: searchedAt?.check_in ? `${searchedAt.check_in}T15:00` : "",
        ends_at: searchedAt?.check_out ? `${searchedAt.check_out}T11:00` : "",
        travelers: searchedAt?.adults,
    });
    const booked = (trip.reservations || []).some((reservation) => reservation.kind === "stay");
    const reservations = (
        <TripReservations
            trip={trip}
            kinds={["stay"]}
            title="Mes logements réservés"
            accent="text-emerald-700 dark:text-emerald-300"
            empty="Aucun logement enregistré. Après une réservation chez un partenaire, retrouvez-la ici avec sa référence et ses dates."
        />
    );
    const busy = loading.offers || loading.listings;

    // Aucun résultat autour d'une région, d'un parc… : on propose les grandes villes proches.
    useEffect(() => {
        if (busy || !searchedAt || all.length || cityHints?.mode === "country") return;
        axios
            .get(route("places.cities"), { params: { latitude: searchedAt.latitude, longitude: searchedAt.longitude, nearby: 1 } })
            .then(({ data }) => {
                const others = data.cities.filter((city) => city.label.split(",")[0] !== searchedAt.place_name);
                if (data.mode === "nearby" && others.length) setCityHints({ mode: "nearby", cities: others });
            })
            .catch(() => {});
    }, [busy, searchedAt]);

    return (
        <div className="space-y-6">
            {selected && <StayDetailModal property={selected} trip={trip} search={searchedAt} onPartner={(url, provider) => partner.open(url, stayDraft(selected, provider))} onClose={() => setSelected(null)} />}
            {partner.element}

            <section className="relative z-20 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-600 shadow-xl shadow-teal-500/20">
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-4 pt-6 text-white">
                    <div>
                        <h2 className="flex items-center gap-2 text-2xl font-black"><BedDouble className="h-6 w-6" /> Trouver votre hébergement</h2>
                        <p className="mt-1 text-sm text-emerald-50">Hôtels, appartements, chambres d’hôtes, auberges, campings… comparés et réservables au même endroit.</p>
                    </div>
                    {stays.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                            {stays.map((stay) => (
                                <button
                                    key={stay.id}
                                    type="button"
                                    onClick={() => chooseStay(stay)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${stayId === stay.id ? "bg-white text-teal-700 shadow-md" : "bg-white/15 text-white hover:bg-white/25"}`}
                                >
                                    {stay.location_name.split(",")[0]} · {formatDay(stay.arrival_date)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <form onSubmit={search} className="grid gap-4 rounded-3xl bg-white p-5 dark:bg-slate-800 lg:grid-cols-[1.4fr_1.2fr_auto_auto] lg:items-end">
                    <div>
                        <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><MapPin className="h-3.5 w-3.5" /> Destination</span>
                        <LocationSearchInput
                            value={placeText}
                            onChange={(value) => {
                                setPlaceText(value);
                                setStayId(null);
                            }}
                            onSelectLocation={(location) => resolvePlace(applyPlace({ ...location, latitude: Number(location.latitude), longitude: Number(location.longitude) }))}
                            placeholder="Ville, quartier, adresse…"
                        />
                    </div>
                    <DateRangePicker
                        label={nights ? `Séjour · ${nights} nuit${nights > 1 ? "s" : ""}` : "Dates du séjour"}
                        startPlaceholder="Arrivée"
                        endPlaceholder="la date de départ"
                        minDate={today()}
                        startDate={dates.checkIn}
                        endDate={dates.checkOut}
                        onChange={(checkIn, checkOut) => setDates({ checkIn, checkOut })}
                    />
                    <div className="flex gap-2">
                        <label className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-600">
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Voyageurs</span>
                            <select value={adults} onChange={(event) => setAdults(Number(event.target.value))} className="block w-full min-w-[4.5rem] border-0 bg-transparent py-0 pl-0 pr-7 text-sm font-bold text-slate-800 focus:ring-0 dark:text-white">
                                {Array.from({ length: 16 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
                            </select>
                        </label>
                        <label className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-600">
                            <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> Chambres</span>
                            <select value={Math.min(rooms, adults)} onChange={(event) => setRooms(Number(event.target.value))} className="block w-full min-w-[4.5rem] border-0 bg-transparent py-0 pl-0 pr-7 text-sm font-bold text-slate-800 focus:ring-0 dark:text-white">
                                {Array.from({ length: Math.min(8, adults) }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
                            </select>
                        </label>
                        <label className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-600">
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Rayon</span>
                            <select value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="block w-full min-w-[4.5rem] border-0 bg-transparent py-0 pl-0 pr-7 text-sm font-bold text-slate-800 focus:ring-0 dark:text-white">
                                {[1, 2, 3, 5, 10, 15, 25].map((km) => <option key={km} value={km}>{km} km</option>)}
                            </select>
                        </label>
                    </div>
                    <button disabled={loading.offers} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50">
                        {loading.offers ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Rechercher
                    </button>
                </form>
            </section>

            {booked && reservations}

            {cityHints && (
                <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30 sm:flex-row sm:items-center">
                    <p className="flex items-start gap-2 text-sm text-emerald-900 dark:text-emerald-200 sm:max-w-sm">
                        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {cityHints.mode === "country" ? (
                            <span>
                                <strong>{cityHints.original.split(",")[0]}</strong> est un pays : la recherche se fait dans ses grandes villes. Choisissez celle qui vous intéresse.
                            </span>
                        ) : (
                            <span>Rien autour de ce point ? Essayez une grande ville à proximité.</span>
                        )}
                    </p>
                    <div className="flex flex-wrap gap-2 sm:ml-auto sm:justify-end">
                        {cityHints.cities.slice(0, 8).map((city) => {
                            const active = searchedAt?.place_name === city.name;
                            return (
                                <button
                                    key={city.label}
                                    type="button"
                                    onClick={() => searchInCity(city)}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${active ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-slate-700 ring-emerald-200 hover:bg-emerald-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-emerald-900"}`}
                                >
                                    {city.capital && <Star className={`h-3 w-3 ${active ? "fill-white" : "fill-amber-400 text-amber-400"}`} />}
                                    {city.name}
                                    <span className={`font-medium ${active ? "text-emerald-100" : "text-slate-400"}`}>
                                        {city.distance_km != null ? `${city.distance_km} km` : formatPopulation(city.population)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {errors.offers && (
                <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {errors.offers}</p>
            )}

            {offers && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                    <span className="mr-1 text-xs font-bold uppercase tracking-wide text-slate-500">Comparer toute la zone sur</span>
                    {offers.partners.map((link) => (
                        <button key={link.key} type="button" onClick={() => partner.open(link.url, areaDraft(link.name))} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 ${partnerMeta[link.key]?.color || "bg-slate-100"}`}>
                            {link.name} <ExternalLink className="h-3 w-3" />
                        </button>
                    ))}
                    {!offers.instant_booking && (
                        <span className="w-full text-[11px] text-slate-500">
                            La réservation et le paiement se font chez le partenaire choisi : c’est lui le vendeur, et votre interlocuteur en cas de changement ou d’annulation. Nous pouvons percevoir une commission, sans surcoût pour vous.
                        </span>
                    )}
                </div>
            )}

            {(offers || busy) && (
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            <span className="text-lg font-black text-slate-900 dark:text-white">{filtered.length}</span> hébergement{filtered.length > 1 ? "s" : ""}
                            {searchedAt && <span className="text-slate-400"> · {searchedAt.place_name} · {formatDay(searchedAt.check_in)} → {formatDay(searchedAt.check_out)} · {searchedAt.adults} voyageur{searchedAt.adults > 1 ? "s" : ""}</span>}
                            {loading.listings && <span className="ml-2 inline-flex items-center gap-1 text-xs text-teal-600"><LoaderCircle className="h-3 w-3 animate-spin" /> chargement de tous les hébergements du secteur…</span>}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setShowFilters(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                <SlidersHorizontal className="h-4 w-4" /> Filtres {activeFilters > 0 && <span className="rounded-full bg-emerald-600 px-1.5 text-white">{activeFilters}</span>}
                            </button>
                            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                <ArrowUpDown className="h-4 w-4 text-emerald-600" />
                                <select value={sort} onChange={(event) => setSort(event.target.value)} className="border-0 bg-transparent p-0 pr-6 text-sm font-medium text-slate-700 focus:ring-0 dark:bg-slate-800 dark:text-slate-200">
                                    <option value="recommended">Recommandés</option>
                                    <option value="price_asc">Prix croissant</option>
                                    <option value="price_desc">Prix décroissant</option>
                                    <option value="rating">Meilleure note</option>
                                    <option value="stars">Nombre d’étoiles</option>
                                    <option value="distance">Distance du centre</option>
                                </select>
                            </label>
                            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
                                {[["list", LayoutGrid, "Liste"], ["split", SlidersHorizontal, "Liste + carte"], ["map", MapIcon, "Carte"]].map(([key, Icon, label]) => (
                                    <button key={key} type="button" title={label} onClick={() => setView(key)} className={`rounded-lg px-2.5 py-1.5 transition ${view === key ? "bg-white text-emerald-700 shadow dark:bg-slate-700 dark:text-white" : "text-slate-500"} ${key === "split" ? "hidden xl:block" : ""}`}>
                                        <Icon className="h-4 w-4" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {errors.listings && (
                        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {errors.listings}</p>
                    )}
                    {offers?.warnings?.length > 0 && (
                        <p className="rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">{offers.warnings.join(" · ")}</p>
                    )}

                    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
                        <aside className="hidden h-fit rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 lg:sticky lg:top-24 lg:block">
                            <Filters filters={filters} setFilters={setFilters} counts={counts} priceBounds={priceBounds} currency={currency} maxDistance={maxDistance} />
                        </aside>

                        <div className={view === "split" ? "grid gap-4 xl:grid-cols-[1fr_24rem]" : ""}>
                            {view !== "map" && (
                                <div className="space-y-4">
                                    {busy && !all.length ? (
                                        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                                            {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl bg-white dark:bg-slate-800" />)}
                                        </div>
                                    ) : filtered.length ? (
                                        <div className={`grid gap-4 sm:grid-cols-2 ${view === "list" ? "xl:grid-cols-3" : "2xl:grid-cols-2"}`}>
                                            {filtered.slice(0, visible).map((property) => (
                                                <StayPropertyCard key={property.id} property={property} onOpen={setSelected} onHover={setHovered} highlighted={hovered === property.id} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
                                            <BedDouble className="mx-auto h-8 w-8 text-slate-300" />
                                            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Aucun hébergement ne correspond à ces critères.</p>
                                            {!activeFilters && <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">La recherche se fait dans un rayon de {radius} km autour du point choisi. Pour un pays ou une région, indiquez plutôt une ville précise, ou augmentez le rayon.</p>}
                                            {activeFilters > 0 && <button type="button" onClick={() => setFilters(defaultFilters)} className="mt-2 text-xs font-semibold text-emerald-600 underline">Réinitialiser les filtres</button>}
                                        </div>
                                    )}
                                    {filtered.length > visible && (
                                        <button type="button" onClick={() => setVisible((count) => count + 24)} className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800">
                                            Afficher plus ({filtered.length - visible} restants)
                                        </button>
                                    )}
                                </div>
                            )}
                            {view !== "list" && searchedAt && (
                                <div className={view === "map" ? "h-[70vh]" : "hidden h-[calc(100vh-8rem)] xl:sticky xl:top-24 xl:block"}>
                                    <StaysMap center={[searchedAt.latitude, searchedAt.longitude]} properties={filtered} highlighted={hovered} onOpen={setSelected} onHover={setHovered} />
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400">Liste des hébergements : © contributeurs OpenStreetMap (ODbL). Les prix affichés incluent les taxes et nos {offers?.pricing?.fee_label?.toLowerCase() || "frais de service"} ({offers?.pricing?.fee_percent ?? 5} %).</p>
                </section>
            )}

            {!booked && reservations}

            {showFilters && (
                <div className="fixed inset-0 z-[105] flex justify-end bg-slate-950/50 lg:hidden" onMouseDown={(event) => event.target === event.currentTarget && setShowFilters(false)}>
                    <div className="h-full w-[85%] max-w-sm overflow-y-auto bg-white p-5 dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 dark:text-white">Filtres</h3>
                            <button onClick={() => setShowFilters(false)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>
                        <Filters filters={filters} setFilters={setFilters} counts={counts} priceBounds={priceBounds} currency={currency} maxDistance={maxDistance} />
                        <button onClick={() => setShowFilters(false)} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white">Voir {filtered.length} hébergements</button>
                    </div>
                </div>
            )}
        </div>
    );
}
