import { StickyNote, Ticket, ListChecks, Wallet } from "lucide-react";

export const BLOCK_TYPES = {
    memo: {
        label: "Pense-bête",
        hint: "Notes libres, code Wi-Fi, astuces…",
        Icon: StickyNote,
        iconClass: "text-amber-500",
        chipClass: "bg-amber-50 dark:bg-amber-950/40",
    },
    booking: {
        label: "Réservation / Lien",
        hint: "Airbnb, billet de concert, train…",
        Icon: Ticket,
        iconClass: "text-blue-500",
        chipClass: "bg-blue-50 dark:bg-blue-950/40",
    },
    checklist: {
        label: "Checklist",
        hint: "À emporter, à faire…",
        Icon: ListChecks,
        iconClass: "text-emerald-500",
        chipClass: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    budget: {
        label: "Budget du jour",
        hint: "Dépenses prévues avec total",
        Icon: Wallet,
        iconClass: "text-rose-500",
        chipClass: "bg-rose-50 dark:bg-rose-950/40",
    },
};
