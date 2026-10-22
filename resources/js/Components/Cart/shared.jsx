import { useEffect, useState } from "react";

export function Countdown({ expiresAt, onExpire }) {
    const [remaining, setRemaining] = useState(() => new Date(expiresAt) - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            const value = new Date(expiresAt) - Date.now();
            setRemaining(value);
            if (value <= 0) {
                clearInterval(timer);
                onExpire?.();
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [expiresAt]);

    if (remaining <= 0) return <span className="font-bold text-rose-600">Tarif expiré</span>;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return (
        <span className={`tabular-nums font-bold ${minutes < 5 ? "text-rose-600" : "text-amber-600"}`}>
            {minutes}:{String(seconds).padStart(2, "0")}
        </span>
    );
}

export const Field = ({ label, error, children, className = "" }) => (
    <label className={`block text-xs font-bold text-slate-600 dark:text-slate-300 ${className}`}>
        {label}
        {children}
        {error && <span className="mt-1 block font-medium text-rose-600">{error}</span>}
    </label>
);

export const inputClass = "mt-1 w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

export const collectErrors = (error) =>
    Object.fromEntries(Object.entries(error.response?.data?.errors || {}).map(([key, messages]) => [key, messages[0]]));
