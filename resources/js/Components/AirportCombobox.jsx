import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Check, ChevronDown, LoaderCircle, MapPin, Search } from "lucide-react";
import { countryName } from "@/Utils/flights";

const airportLine = (airport) =>
    airport ? `${airport.city ? `${airport.city} · ` : ""}${airport.name}` : "";

export default function AirportCombobox({
    label,
    icon: Icon = MapPin,
    value,
    onChange,
    suggestions = [],
    suggestionsLabel,
    hint,
    required = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const close = (event) => {
            if (!containerRef.current?.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            setLoading(true);
            axios
                .get(route("flights.airports"), { params: { q: query }, signal: controller.signal })
                .then((response) => setResults(response.data.airports || []))
                .catch(() => {})
                .finally(() => setLoading(false));
        }, 200);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, isOpen]);

    const choose = (airport) => {
        onChange(airport);
        setIsOpen(false);
        setQuery("");
    };

    return (
        <div ref={containerRef} className="relative">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Icon className="h-3.5 w-3.5" /> {label}
            </span>
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
            >
                {value ? (
                    <span className="flex min-w-0 items-center gap-3">
                        <span className="rounded-lg bg-indigo-50 px-2 py-1 font-mono text-sm font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {value.code}
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-white">{value.city || value.name}</span>
                            <span className="block truncate text-xs text-slate-500">{value.name}{value.country ? ` · ${countryName(value.country)}` : ""}</span>
                        </span>
                    </span>
                ) : (
                    <span className="py-1.5 text-sm text-slate-400">Ville, aéroport ou code IATA</span>
                )}
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
            {required && !value && <input required tabIndex={-1} className="sr-only" value="" onChange={() => {}} aria-label={label} />}

            {suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {suggestionsLabel && <span className="text-[11px] font-medium text-slate-400">{suggestionsLabel}</span>}
                    {suggestions.map((airport) => (
                        <button
                            key={airport.code}
                            type="button"
                            onClick={() => choose(airport)}
                            title={airportLine(airport)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${
                                value?.code === airport.code
                                    ? "bg-indigo-600 text-white ring-indigo-600"
                                    : "bg-white text-slate-600 ring-slate-200 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
                            }`}
                        >
                            {airport.code}
                            {airport.distance_km != null && <span className="ml-1 font-normal opacity-75">{airport.distance_km} km</span>}
                        </button>
                    ))}
                </div>
            )}
            {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}

            {isOpen && (
                <div className="absolute left-0 right-0 top-[4.5rem] z-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-700">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Paris, Lisbonne, JFK…"
                            className="w-full border-0 bg-transparent py-3 text-sm outline-none focus:ring-0 dark:text-white"
                        />
                        {loading && <LoaderCircle className="h-4 w-4 animate-spin text-indigo-500" />}
                    </div>
                    <div className="max-h-72 overflow-y-auto p-1">
                        {results.map((airport) => (
                            <button
                                type="button"
                                key={airport.code}
                                onClick={() => choose(airport)}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            >
                                <span className="w-12 shrink-0 rounded-md bg-slate-100 py-1 text-center font-mono text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                    {airport.code}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-white">{airportLine(airport)}</span>
                                    <span className="text-xs text-slate-500">{countryName(airport.country)}</span>
                                </span>
                                {value?.code === airport.code && <Check className="h-4 w-4 text-indigo-600" />}
                            </button>
                        ))}
                        {!loading && !results.length && <p className="px-3 py-4 text-sm text-slate-500">Aucun aéroport trouvé.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
