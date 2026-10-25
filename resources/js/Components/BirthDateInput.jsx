import { useState } from "react";

const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const selectClass = "mt-1 w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white";
const pad = (value) => String(value).padStart(2, "0");

/** Date de naissance en trois listes : plus rapide qu'un calendrier pour remonter des décennies. */
export default function BirthDateInput({ value = "", onChange, minAge = 0 }) {
    const [initialYear = "", initialMonth = "", initialDay = ""] = value ? value.split("-") : [];
    // Garde la saisie incomplète (ex. jour choisi avant l'année) ; le parent ne reçoit qu'une date complète.
    const [parts, setParts] = useState({ year: initialYear, month: initialMonth, day: initialDay });
    const lastYear = new Date().getFullYear() - minAge;
    const daysIn = (next) => (next.year && next.month ? new Date(Number(next.year), Number(next.month), 0).getDate() : 31);

    const update = (part, nextValue) => {
        const next = { ...parts, [part]: nextValue };
        if (next.day && Number(next.day) > daysIn(next)) next.day = "";
        setParts(next);
        onChange(next.year && next.month && next.day ? `${next.year}-${next.month}-${next.day}` : "");
    };

    return (
        <div className="grid grid-cols-[4.5rem_1fr_5.5rem] gap-1.5">
            <select required aria-label="Jour" value={parts.day} onChange={(event) => update("day", event.target.value)} className={selectClass}>
                <option value="">Jour</option>
                {Array.from({ length: daysIn(parts) }, (_, index) => pad(index + 1)).map((day) => <option key={day} value={day}>{Number(day)}</option>)}
            </select>
            <select required aria-label="Mois" value={parts.month} onChange={(event) => update("month", event.target.value)} className={selectClass}>
                <option value="">Mois</option>
                {months.map((label, index) => <option key={label} value={pad(index + 1)}>{label}</option>)}
            </select>
            <select required aria-label="Année" value={parts.year} onChange={(event) => update("year", event.target.value)} className={selectClass}>
                <option value="">Année</option>
                {Array.from({ length: 100 }, (_, index) => String(lastYear - index)).map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
        </div>
    );
}
