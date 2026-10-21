// Les horaires des compagnies sont exprimés en heure locale de l'aéroport :
// on lit directement la chaîne pour ne jamais les convertir au fuseau du navigateur.
export const localTime = (value) => (value ? value.slice(11, 16) : "");

export const localDate = (value, options = { weekday: "short", day: "numeric", month: "short" }) => {
    if (!value) return "";
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day, 12).toLocaleDateString("fr-FR", options);
};

export const dayOffset = (departure, arrival) => {
    if (!departure || !arrival) return 0;
    const start = new Date(`${departure.slice(0, 10)}T12:00:00`);
    const end = new Date(`${arrival.slice(0, 10)}T12:00:00`);
    return Math.round((end - start) / 86400000);
};

export const formatDuration = (minutes) => {
    if (minutes == null) return "";
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours ? `${hours} h ${String(rest).padStart(2, "0")}` : `${rest} min`;
};

export const formatPrice = (amount, currency = "EUR") =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number(amount || 0));

export const formatPercent = (value) =>
    `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(value || 0))} %`;

const countryNames = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["fr"], { type: "region" }) : null;
export const countryName = (code) => {
    try {
        return code ? countryNames?.of(code) || code : "";
    } catch {
        return code;
    }
};

export const stopsLabel = (stops) => (stops === 0 ? "Direct" : `${stops} escale${stops > 1 ? "s" : ""}`);

export const directionLabel = (direction) =>
    ({ outbound: "Aller", return: "Retour", oneway: "Aller simple" })[direction] || "Vol";

export const placeLabel = (place) => (place ? `${place.city || place.name || place.code} (${place.code})` : "");

export const bookingStatus = {
    pending: { label: "Paiement en attente", tone: "amber" },
    ticketed: { label: "Billet émis", tone: "emerald" },
    simulated: { label: "Confirmé (démo)", tone: "sky" },
    failed: { label: "Non émis · remboursé", tone: "rose" },
    cancelled: { label: "Annulé", tone: "slate" },
    expired: { label: "Expiré", tone: "slate" },
};

export const orderStatus = {
    payment_pending: { label: "En attente de paiement", tone: "amber" },
    processing: { label: "Émission des billets…", tone: "sky" },
    confirmed: { label: "Confirmée", tone: "emerald" },
    partially_confirmed: { label: "Partiellement confirmée", tone: "amber" },
    failed: { label: "Échec · remboursée", tone: "rose" },
    expired: { label: "Paiement expiré", tone: "slate" },
    cancelled: { label: "Annulée", tone: "slate" },
};

export const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800",
    sky: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800",
    amber: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
    rose: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800",
    slate: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};

export const firstError = (error, fallback) => {
    const errors = error?.response?.data?.errors;
    if (errors) {
        const first = Object.values(errors)[0];
        if (Array.isArray(first) && first[0]) return first[0];
    }
    return error?.response?.data?.message || fallback;
};
