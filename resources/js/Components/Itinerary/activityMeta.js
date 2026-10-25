import { BedDouble, Bus, Coffee, Landmark, Moon, PartyPopper, Sun, Sunrise, Sunset, Tag, Tent, UtensilsCrossed } from "lucide-react";

// Apparence des activités : une couleur et une icône par catégorie, un ton par moment de la journée.
export const CATEGORY_STYLE = {
    visite: { label: "Visite", Icon: Landmark, gradient: "from-amber-400 to-orange-500", soft: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
    loisir: { label: "Loisir", Icon: PartyPopper, gradient: "from-pink-400 to-rose-500", soft: "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300" },
    repas: { label: "Repas", Icon: UtensilsCrossed, gradient: "from-orange-400 to-red-500", soft: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" },
    transport: { label: "Transport", Icon: Bus, gradient: "from-sky-400 to-indigo-500", soft: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
    hebergement: { label: "Hôtel", Icon: BedDouble, gradient: "from-violet-400 to-purple-600", soft: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" },
    camping: { label: "Camping", Icon: Tent, gradient: "from-emerald-400 to-teal-600", soft: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
    autre: { label: "Autre", Icon: Tag, gradient: "from-slate-400 to-slate-600", soft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

export const categoryStyle = (key) => CATEGORY_STYLE[key] || CATEGORY_STYLE.autre;

export const PERIOD_STYLE = [
    { key: "matin", label: "Matin", Icon: Sunrise, tint: "text-amber-500", dot: "bg-amber-400" },
    { key: "midi", label: "Midi", Icon: Sun, tint: "text-yellow-500", dot: "bg-yellow-400" },
    { key: "apres_midi", label: "Après-midi", Icon: Coffee, tint: "text-orange-500", dot: "bg-orange-400" },
    { key: "soir", label: "Soir", Icon: Sunset, tint: "text-rose-500", dot: "bg-rose-400" },
    { key: "nuit", label: "Nuit", Icon: Moon, tint: "text-indigo-500", dot: "bg-indigo-400" },
];

export const periodStyle = (key) => PERIOD_STYLE.find((period) => period.key === key) || PERIOD_STYLE[0];

export const formatEuro = (value) => `${Number(value).toLocaleString("fr-FR", { minimumFractionDigits: Number(value) % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
