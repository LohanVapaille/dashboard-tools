import { BedDouble, Bus, CalendarDays, Car, Plane, Ship, Ticket, TrainFront } from "lucide-react";

export const KIND_META = {
    flight: { label: "Vol", Icon: Plane, gradient: "from-sky-500 to-indigo-600", tone: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300" },
    train: { label: "Train", Icon: TrainFront, gradient: "from-indigo-500 to-violet-600", tone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" },
    bus: { label: "Bus", Icon: Bus, gradient: "from-lime-500 to-emerald-600", tone: "bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-300" },
    car: { label: "Voiture", Icon: Car, gradient: "from-amber-500 to-orange-600", tone: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
    ferry: { label: "Ferry", Icon: Ship, gradient: "from-cyan-500 to-sky-600", tone: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300" },
    stay: { label: "Logement", Icon: BedDouble, gradient: "from-emerald-500 to-teal-600", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
    activity: { label: "Activité", Icon: Ticket, gradient: "from-orange-500 to-rose-500", tone: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300" },
    other: { label: "Autre", Icon: CalendarDays, gradient: "from-slate-600 to-slate-800", tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

export const TRANSPORT_KINDS = ["flight", "train", "bus", "car", "ferry"];
