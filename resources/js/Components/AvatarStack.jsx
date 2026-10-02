// resources/js/Components/AvatarStack.jsx
import React from "react";

const COLORS = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-purple-500",
];
const ROLE_LABELS = {
    owner: "Propriétaire",
    admin: "Admin",
    editor: "Éditeur",
    viewer: "Lecteur",
};

function initials(name) {
    return name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export default function AvatarStack({ people = [], max = 5 }) {
    if (people.length === 0) return null;
    const visible = people.slice(0, max);
    const extra = people.length - visible.length;

    return (
        <div className="flex items-center -space-x-2">
            {visible.map((person, i) => (
                <div key={person.id} className="group relative">
                    <div
                        className={`w-8 h-8 rounded-full ${COLORS[i % COLORS.length]} border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-white cursor-default`}
                    >
                        {initials(person.name)}
                    </div>
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap bg-slate-900 text-white text-[11px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-30">
                        {person.name}
                        {person.role && (
                            <span className="text-slate-400">
                                {" "}
                                · {ROLE_LABELS[person.role] || person.role}
                            </span>
                        )}
                    </div>
                </div>
            ))}
            {extra > 0 && (
                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-white">
                    +{extra}
                </div>
            )}
        </div>
    );
}
