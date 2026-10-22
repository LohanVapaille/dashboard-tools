import { useEffect, useState } from "react";
import axios from "axios";
import { Briefcase, LoaderCircle, Luggage, Minus, Plus } from "lucide-react";
import { formatPrice } from "@/Utils/flights";

const kindLabel = { checked: "Bagage en soute", carry_on: "Bagage cabine" };

/**
 * Bagages payants d'un vol, par passager. Remonte la sélection
 * sous forme { [serviceId]: { quantity, total_amount } }.
 */
export default function BaggageSelector({ offer, value = {}, onChange }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        setData(null);
        setError("");
        axios
            .get(route("flights.offers.baggage", offer.id))
            .then((response) => setData(response.data))
            .catch(() => setError("Impossible de charger les options de bagages pour ce vol."));
    }, [offer.id]);

    const setQuantity = (option, quantity) => {
        const next = { ...value };
        if (quantity <= 0) delete next[option.id];
        else next[option.id] = { quantity, total_amount: option.total_amount };
        onChange(next);
    };

    const included = offer.baggage || {};

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    <Briefcase className="h-3.5 w-3.5" /> Inclus : {included.carry_on ? `${included.carry_on} cabine` : "objet personnel"}
                    {included.checked ? ` + ${included.checked} soute` : ""} / pers.
                </span>
            </div>

            {!data && !error && (
                <p className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Recherche des bagages supplémentaires…</p>
            )}
            {error && <p className="text-xs text-amber-600">{error}</p>}
            {data && !data.options.length && (
                <p className="text-xs text-slate-500">La compagnie ne propose pas de bagage supplémentaire en ligne pour ce tarif. Vous pourrez en ajouter auprès d’elle après la réservation.</p>
            )}

            {data && data.options.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: data.passengers_count }, (_, passengerIndex) => {
                        const options = data.options.filter((option) => option.passenger_index === passengerIndex);
                        if (!options.length) return null;
                        return (
                            <div key={passengerIndex} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">Passager {passengerIndex + 1}</p>
                                <div className="space-y-2">
                                    {options.map((option) => {
                                        const quantity = value[option.id]?.quantity || 0;
                                        const Icon = option.kind === "carry_on" ? Briefcase : Luggage;
                                        return (
                                            <div key={option.id} className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition ${quantity ? "bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:ring-indigo-800" : "bg-slate-50 dark:bg-slate-900/40"}`}>
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <Icon className="h-4 w-4 shrink-0 text-indigo-500" />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                                                            {kindLabel[option.kind] || "Bagage"}{option.max_weight_kg ? ` · ${option.max_weight_kg} kg` : ""}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {formatPrice(option.total_amount, option.currency)}
                                                            {!option.whole_journey && option.segments.length > 0 && ` · ${option.segments.join(", ")}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button type="button" disabled={!quantity} onClick={() => setQuantity(option, quantity - 1)} className="rounded-md bg-white p-1 text-slate-600 shadow-sm disabled:opacity-30 dark:bg-slate-800 dark:text-slate-300" aria-label="Retirer">
                                                        <Minus className="h-3.5 w-3.5" />
                                                    </button>
                                                    <span className="w-4 text-center text-sm font-bold tabular-nums">{quantity}</span>
                                                    <button type="button" disabled={quantity >= option.max_quantity} onClick={() => setQuantity(option, quantity + 1)} className="rounded-md bg-white p-1 text-indigo-600 shadow-sm disabled:opacity-30 dark:bg-slate-800" aria-label="Ajouter">
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export const baggageTotal = (selection = {}) =>
    Object.values(selection).reduce((sum, item) => sum + item.quantity * item.total_amount, 0);

export const baggagePayload = (selection = {}) =>
    Object.entries(selection).map(([id, item]) => ({ id, quantity: item.quantity }));
