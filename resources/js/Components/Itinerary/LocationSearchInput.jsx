import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";

export default function LocationSearchInput({
    value,
    onChange,
    onSelectLocation,
    placeholder = "Rechercher une ville, lieu, adresse...",
}) {
    const [query, setQuery] = useState(value || "");
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Recherche avec un léger délai (debounce) pour ne pas surcharger l'API
    useEffect(() => {
        if (query.trim().length < 3) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
                );
                const data = await response.json();
                setSuggestions(data);
                setIsOpen(true);
            } catch (error) {
                console.error("Erreur autocomplétion :", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Fermer le menu au clic à l'extérieur
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (item) => {
        setQuery(item.display_name);
        setIsOpen(false);
        onChange(item.display_name);

        // Renvoie les vraies coordonnées GPS
        onSelectLocation({
            name: item.display_name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
        });
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(e.target.value);
                    }}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-10 py-2 rounded-lg border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                {loading && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-3" />
                )}
            </div>

            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto text-xs divide-y divide-slate-100 dark:divide-slate-700">
                    {suggestions.map((item) => (
                        <li
                            key={item.place_id}
                            onClick={() => handleSelect(item)}
                            className="p-3 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer flex items-start gap-2.5 transition"
                        >
                            <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <span className="text-slate-800 dark:text-slate-200">
                                {item.display_name}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
