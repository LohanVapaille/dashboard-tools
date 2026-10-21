import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const pad = (value) => String(value).padStart(2, "0");
const toDate = (value) => (value ? new Date(`${value}T12:00:00`) : null);
const toValue = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const displayDate = (value) => {
    if (!value) return "";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
};

export default function DateRangePicker({
    startDate,
    endDate,
    onChange,
    minDate,
    maxDate,
    className = "",
    label = "Dates du séjour",
    startPlaceholder = "Date d’arrivée",
    endPlaceholder = "une date de départ",
    single = false,
}) {
    const initial = toDate(startDate) || new Date();
    const [month, setMonth] = useState(
        new Date(initial.getFullYear(), initial.getMonth(), 1),
    );
    const [isOpen, setIsOpen] = useState(false);
    const months = useMemo(
        () => [0, 1].map((offset) => new Date(month.getFullYear(), month.getMonth() + offset, 1)),
        [month],
    );
    const min = toDate(minDate);
    const max = toDate(maxDate);
    const choose = (date) => {
        if ((min && date < min) || (max && date > max)) return;
        const value = toValue(date);
        if (single) {
            onChange(value, "");
            setIsOpen(false);
        } else if (!startDate || (startDate && endDate)) {
            onChange(value, "");
        } else if (value < startDate) {
            onChange(value, startDate);
        } else {
            onChange(startDate, value);
            setIsOpen(false);
        }
    };

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-700 shadow-sm transition hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
                <span>
                    <span className="block text-xs font-semibold text-slate-500">{label}</span>
                    <span className="mt-0.5 block font-medium">
                        {displayDate(startDate) || startPlaceholder} {!single && endDate ? `→ ${displayDate(endDate)}` : ""}
                    </span>
                </span>
                <CalendarDays className="h-5 w-5 text-indigo-600" />
            </button>
            {isOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                    <CalendarDays className="h-4 w-4 text-indigo-600" /> Sélectionner les dates
                </span>
                <div className="flex gap-1">
                    <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight className="h-4 w-4" /></button>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {months.map((current) => {
                    const days = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
                    const offset = (new Date(current.getFullYear(), current.getMonth(), 1).getDay() + 6) % 7;
                    return (
                        <div key={current.toISOString()}>
                            <p className="mb-2 text-center text-sm font-bold capitalize text-slate-700 dark:text-slate-200">
                                {current.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                            </p>
                            <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-slate-400">
                                {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((day) => <span key={day}>{day}</span>)}
                            </div>
                            <div className="mt-1 grid grid-cols-7 gap-1">
                                {Array.from({ length: offset }).map((_, index) => <span key={`empty-${index}`} />)}
                                {Array.from({ length: days }, (_, index) => {
                                    const date = new Date(current.getFullYear(), current.getMonth(), index + 1);
                                    const value = toValue(date);
                                    const disabled = (min && date < min) || (max && date > max);
                                    const selected = value === startDate || (!single && value === endDate);
                                    const inRange = !single && startDate && endDate && value > startDate && value < endDate;
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => choose(date)}
                                            className={`h-8 rounded-lg text-xs transition ${selected ? "bg-indigo-600 font-bold text-white" : inRange ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"} ${disabled ? "cursor-not-allowed opacity-30" : ""}`}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
                {single
                    ? (startDate ? `Le ${displayDate(startDate)}` : "Choisissez une date")
                    : <>
                        {startDate ? `Du ${displayDate(startDate)}` : `Choisissez ${startPlaceholder.toLowerCase()}`}
                        {endDate ? ` au ${displayDate(endDate)}` : ` puis ${endPlaceholder}`}
                    </>}
            </p>
            </div>
            </div>}
        </div>
    );
}
