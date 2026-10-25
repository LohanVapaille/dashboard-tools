import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useForm } from "@inertiajs/react";
import { AlertTriangle, ArrowRight, Flag, GripVertical, LoaderCircle, LocateFixed, MapPin, Minus, Plus, Sparkles, Users, X } from "lucide-react";
import DateRangePicker from "@/Components/DateRangePicker";
import LocationSearchInput from "@/Components/Itinerary/LocationSearchInput";

const shortName = (name = "") => name.split(",")[0].trim();
const nightsBetween = (start, end) => (start && end ? Math.max(0, Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000)) : 0);
const todayValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/** Création de voyage en une fois : départ, étapes, dates, voyageurs et nom. */
export default function TripCreator({ guestTripsRemaining }) {
    const form = useForm({
        title: "",
        start_date: "",
        end_date: "",
        travelers: 1,
        origin: null,
        destinations: [],
    });
    const [originText, setOriginText] = useState("");
    const [stops, setStops] = useState([{ key: 1, text: "", place: null, nights: null }]);
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState("");
    const [titleTouched, setTitleTouched] = useState(false);

    const chosen = stops.filter((stop) => stop.place);
    const totalNights = nightsBetween(form.data.start_date, form.data.end_date);
    const suggestedTitle = useMemo(() => {
        const names = [...new Set(chosen.map((stop) => shortName(stop.place.name)))];
        if (!names.length) return "";
        return names.length === 1 ? `Voyage à ${names[0]}` : `${names.slice(0, -1).join(", ")} & ${names.at(-1)}`;
    }, [chosen.map((stop) => stop.place.name).join("|")]);

    useEffect(() => {
        if (!titleTouched) form.setData("title", suggestedTitle);
    }, [suggestedTitle]);

    // Répartition indicative des nuits (identique au calcul serveur) pour l'aperçu.
    const plannedNights = useMemo(() => {
        const fixed = chosen.reduce((sum, stop) => sum + (stop.nights ?? 0), 0);
        const flexible = chosen.filter((stop) => stop.nights == null);
        const share = flexible.length ? Math.floor(Math.max(0, totalNights - fixed) / flexible.length) : 0;
        let remainder = flexible.length ? Math.max(0, totalNights - fixed) % flexible.length : 0;
        return Object.fromEntries(chosen.map((stop) => [stop.key, stop.nights ?? share + (remainder-- > 0 ? 1 : 0)]));
    }, [chosen, totalNights]);

    const locate = () => {
        if (!navigator.geolocation) {
            setLocationError("Géolocalisation indisponible sur ce navigateur.");
            return;
        }
        setLocating(true);
        setLocationError("");
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                try {
                    const { data } = await axios.get("https://nominatim.openstreetmap.org/reverse", {
                        params: { lat: coords.latitude, lon: coords.longitude, format: "jsonv2", zoom: 10, "accept-language": "fr" },
                    });
                    const address = data.address || {};
                    const name = [address.city || address.town || address.village || address.municipality, address.country].filter(Boolean).join(", ") || data.display_name;
                    setOriginText(name);
                    form.setData("origin", { name, latitude: coords.latitude, longitude: coords.longitude });
                } catch {
                    setLocationError("Impossible de déterminer votre ville.");
                } finally {
                    setLocating(false);
                }
            },
            () => {
                setLocating(false);
                setLocationError("Autorisez la localisation ou saisissez votre ville de départ.");
            },
            { timeout: 10000 },
        );
    };

    const updateStop = (key, changes) => setStops((current) => current.map((stop) => (stop.key === key ? { ...stop, ...changes } : stop)));
    const addStop = () => setStops((current) => [...current, { key: Math.max(...current.map((stop) => stop.key)) + 1, text: "", place: null, nights: null }]);
    const removeStop = (key) => setStops((current) => (current.length > 1 ? current.filter((stop) => stop.key !== key) : current));
    const moveStop = (index, direction) =>
        setStops((current) => {
            const next = [...current];
            const target = index + direction;
            if (target < 0 || target >= next.length) return current;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });

    const submit = (event) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            destinations: chosen.map((stop) => ({
                name: stop.place.name,
                latitude: stop.place.latitude,
                longitude: stop.place.longitude,
                ...(stop.nights != null ? { nights: stop.nights } : {}),
            })),
        }));
        form.post(route("trips.store"));
    };

    const ready = form.data.start_date && form.data.end_date;

    return (
        <form onSubmit={submit} className="relative rounded-[2rem] border border-white/40 bg-white/95 p-5 shadow-2xl shadow-indigo-900/20 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:p-7">
            <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
                <div className="space-y-2">
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500"><Flag className="h-3.5 w-3.5 text-sky-500" /> Départ</span>
                    <LocationSearchInput
                        value={originText}
                        onChange={(value) => {
                            setOriginText(value);
                            form.setData("origin", null);
                        }}
                        onSelectLocation={(place) => form.setData("origin", place)}
                        placeholder="Votre ville de départ"
                        required={false}
                    />
                    <button type="button" onClick={locate} disabled={locating} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50">
                        {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />} Utiliser ma position
                    </button>
                    {locationError && <p className="text-xs text-amber-600">{locationError}</p>}
                    <p className="text-[11px] text-slate-400">Sert à proposer l’aéroport de départ le plus proche.</p>
                </div>

                <div className="space-y-2">
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500"><MapPin className="h-3.5 w-3.5 text-fuchsia-500" /> Destination{stops.length > 1 ? "s" : ""}</span>
                    <ol className="space-y-2">
                        {stops.map((stop, index) => (
                            <li key={stop.key} className="flex items-center gap-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-fuchsia-500 text-xs font-black text-white">{index + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <LocationSearchInput
                                        value={stop.text}
                                        onChange={(value) => updateStop(stop.key, { text: value, place: null })}
                                        onSelectLocation={(place) => updateStop(stop.key, { place })}
                                        placeholder={index === 0 ? "Où allez-vous ?" : "Étape suivante"}
                                    />
                                </div>
                                {stop.place && ready && (
                                    <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-1.5 py-1 dark:bg-slate-800" title="Nombre de nuits">
                                        <button type="button" onClick={() => updateStop(stop.key, { nights: Math.max(0, (stop.nights ?? plannedNights[stop.key] ?? 0) - 1) })} className="rounded-md p-1 text-slate-500 hover:bg-white"><Minus className="h-3 w-3" /></button>
                                        <span className="w-12 text-center text-[11px] font-bold text-slate-700 dark:text-slate-200">{stop.nights ?? plannedNights[stop.key] ?? 0} nuit{(stop.nights ?? plannedNights[stop.key]) > 1 ? "s" : ""}</span>
                                        <button type="button" onClick={() => updateStop(stop.key, { nights: (stop.nights ?? plannedNights[stop.key] ?? 0) + 1 })} className="rounded-md p-1 text-slate-500 hover:bg-white"><Plus className="h-3 w-3" /></button>
                                    </div>
                                )}
                                {stops.length > 1 && (
                                    <div className="flex items-center">
                                        <button type="button" onClick={() => moveStop(index, -1)} disabled={index === 0} className="rounded p-1 text-slate-300 hover:text-slate-600 disabled:opacity-20" title="Monter"><GripVertical className="h-4 w-4" /></button>
                                        <button type="button" onClick={() => removeStop(stop.key)} className="rounded p-1 text-slate-300 hover:text-rose-600" title="Retirer"><X className="h-4 w-4" /></button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ol>
                    {stops.length < 10 && (
                        <button type="button" onClick={addStop} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-fuchsia-300 px-3 py-1.5 text-xs font-bold text-fuchsia-600 hover:bg-fuchsia-50 dark:border-fuchsia-800">
                            <Plus className="h-3.5 w-3.5" /> Ajouter une étape
                        </button>
                    )}
                    {form.errors["destinations.0.latitude"] && <p className="text-xs text-rose-600">{form.errors["destinations.0.latitude"]}</p>}
                </div>
            </div>

            <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 dark:border-slate-800 md:grid-cols-[1.3fr_auto_1.3fr_auto] md:items-end">
                <div>
                    <DateRangePicker
                        label={totalNights ? `Dates · ${totalNights} nuit${totalNights > 1 ? "s" : ""}` : "Dates du voyage"}
                        startPlaceholder="Date de départ"
                        endPlaceholder="la date de retour"
                        minDate={todayValue()}
                        startDate={form.data.start_date}
                        endDate={form.data.end_date}
                        onChange={(start_date, end_date) => form.setData({ ...form.data, start_date, end_date })}
                    />
                    {(form.errors.start_date || form.errors.end_date) && <p className="mt-1 text-xs text-rose-600">{form.errors.start_date || form.errors.end_date}</p>}
                </div>
                <label className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-600">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Voyageurs</span>
                    <select value={form.data.travelers} onChange={(event) => form.setData("travelers", Number(event.target.value))} className="w-20 border-0 bg-transparent p-0 text-sm font-bold text-slate-800 focus:ring-0 dark:text-white">
                        {Array.from({ length: 16 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
                    </select>
                </label>
                <label className="block text-xs font-semibold text-slate-500">
                    Nom du voyage
                    <input
                        value={form.data.title}
                        onChange={(event) => {
                            setTitleTouched(true);
                            form.setData("title", event.target.value);
                        }}
                        placeholder="Road trip en Italie"
                        className="mt-1 w-full rounded-xl border-slate-300 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                </label>
                <button disabled={form.processing || !ready} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-fuchsia-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-indigo-500/30 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50">
                    {form.processing ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                    Créer mon voyage
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </button>
            </div>

            {form.errors.guest_limit && (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{form.errors.guest_limit} <Link href={route("register")} className="font-bold underline">Créer un compte gratuit</Link></span>
                </p>
            )}
            {guestTripsRemaining != null && !form.errors.guest_limit && (
                <p className="mt-3 text-center text-[11px] text-slate-400">
                    Sans compte : encore {guestTripsRemaining} voyage{guestTripsRemaining > 1 ? "s" : ""} possible{guestTripsRemaining > 1 ? "s" : ""} sur cet appareil · <Link href={route("register")} className="font-semibold text-indigo-600">créer un compte gratuit</Link>
                </p>
            )}
        </form>
    );
}
