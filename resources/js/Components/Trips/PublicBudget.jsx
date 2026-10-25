import { BedDouble, Bus, Package, Ticket, UtensilsCrossed, Wallet } from "lucide-react";
import { formatMoney } from "@/Utils/formatters";

export const BUDGET_GROUPS = {
    logement: { label: "Logement", Icon: BedDouble, bar: "bg-emerald-500" },
    transport: { label: "Transport", Icon: Bus, bar: "bg-sky-500" },
    activites: { label: "Activités", Icon: Ticket, bar: "bg-violet-500" },
    repas: { label: "Repas", Icon: UtensilsCrossed, bar: "bg-amber-500" },
    autre: { label: "Autre", Icon: Package, bar: "bg-slate-400" },
};

/** Budget agrégé d'un voyage publié : montants par poste, sans libellés ni noms des voyageurs. */
export default function PublicBudget({ budget, travelers, compact = false }) {
    if (!budget) return null;
    const groups = Object.entries(BUDGET_GROUPS).map(([key, meta]) => ({ key, ...meta, amount: budget.groups?.[key] || 0 })).filter((group) => group.amount > 0);
    const max = Math.max(...groups.map((group) => group.amount), 1);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Wallet className="h-3.5 w-3.5 text-orange-500" /> Budget</p>
                    <p className={`${compact ? "text-xl" : "text-3xl"} font-black text-slate-900 dark:text-white`}>
                        {formatMoney(budget.per_person)} <span className="text-sm font-semibold text-slate-500">/ pers.</span>
                    </p>
                </div>
                <p className="text-right text-xs text-slate-500">
                    {formatMoney(budget.total)} pour {travelers || 1} voyageur{(travelers || 1) > 1 ? "s" : ""}
                    {budget.spent_total > 0 && <span className="block">dont {formatMoney(budget.spent_total)} déjà dépensés</span>}
                </p>
            </div>
            {groups.length > 0 ? (
                <ul className="space-y-2">
                    {groups.map((group) => (
                        <li key={group.key}>
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200"><group.Icon className="h-3.5 w-3.5 text-slate-400" /> {group.label}</span>
                                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(group.amount)}</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <div className={`h-full rounded-full ${group.bar}`} style={{ width: `${(group.amount / max) * 100}%` }} />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-xs text-slate-400">Pas de budget prévisionnel détaillé pour ce voyage.</p>
            )}
            {!compact && <p className="text-[11px] text-slate-400">Montants agrégés par poste. Les dépenses individuelles et les remboursements entre voyageurs restent privés.</p>}
        </div>
    );
}
