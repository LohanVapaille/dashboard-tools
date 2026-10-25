import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "@inertiajs/react";
import { ExternalLink, LoaderCircle, Search, X } from "lucide-react";

/** Sélecteur d'élément lié (voyage, utilisateur…) avec recherche côté serveur. */
export default function RelationPicker({ field, value, label, onChange, invalid }) {
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [current, setCurrent] = useState(label);
    const box = useRef(null);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        const timer = setTimeout(() => {
            axios.get(route("admin.resources.lookup", field.resource), { params: { q: query } })
                .then(({ data }) => setOptions(data.options))
                .catch(() => setOptions([]))
                .finally(() => setLoading(false));
        }, 250);
        return () => clearTimeout(timer);
    }, [query, open]);

    useEffect(() => {
        const close = (event) => box.current && !box.current.contains(event.target) && setOpen(false);
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const pick = (option) => {
        onChange(option?.id ?? "");
        setCurrent(option?.label ?? null);
        setOpen(false);
        setQuery("");
    };

    return (
        <div ref={box} className="relative">
            <div className={`flex items-center gap-2 rounded-xl border bg-white px-3 dark:bg-slate-800 ${invalid ? "border-rose-400" : "border-slate-300 dark:border-slate-700"}`}>
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                    value={open ? query : current || (value ? `#${value}` : "")}
                    onFocus={() => setOpen(true)}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Rechercher…"
                    className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm focus:ring-0"
                />
                {loading && open && <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" />}
                {value && !field.required && (
                    <button type="button" onClick={() => pick(null)} className="text-slate-400 hover:text-rose-500" title="Retirer"><X className="h-4 w-4" /></button>
                )}
                {value && (
                    <Link href={route("admin.resources.edit", [field.resource, value])} className="text-slate-400 hover:text-indigo-600" title="Ouvrir"><ExternalLink className="h-4 w-4" /></Link>
                )}
            </div>
            {open && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                    {!loading && options.length === 0 && <li className="px-3 py-2 text-xs text-slate-400">Aucun résultat</li>}
                    {options.map((option) => (
                        <li key={option.id}>
                            <button type="button" onClick={() => pick(option)} className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-slate-700 ${String(option.id) === String(value) ? "font-bold text-indigo-600" : ""}`}>
                                {option.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
