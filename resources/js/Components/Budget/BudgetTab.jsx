import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    ArrowRight,
    BedDouble,
    Bus,
    Check,
    CircleDollarSign,
    Loader2,
    Pencil,
    PiggyBank,
    Plus,
    Receipt,
    Scale,
    Ticket,
    Trash2,
    UserPlus,
    Users,
    UtensilsCrossed,
    Wallet,
    X,
} from "lucide-react";
import { formatMoney } from "@/Utils/formatters";
import { formatDay } from "@/Utils/stays";
import { expenseCategoryMeta } from "@/Constants/budget";
import ExpenseModal from "./ExpenseModal";

// Regroupement du prévisionnel ; « expense » est la catégorie proposée quand on marque la ligne comme payée.
const PLANNED_GROUPS = [
    { key: "logement", label: "Logements", Icon: BedDouble, color: "bg-emerald-500", expense: "logement" },
    { key: "transport", label: "Transports", Icon: Bus, color: "bg-sky-500", expense: "transport" },
    { key: "activites", label: "Activités", Icon: Ticket, color: "bg-violet-500", expense: "activite" },
    { key: "repas", label: "Repas", Icon: UtensilsCrossed, color: "bg-amber-500", expense: "repas" },
];

function AmountEditor({ line, travelers, onSave }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState("");

    const open = () => {
        setValue(line.unit_price ?? "");
        setEditing(true);
    };

    const submit = async (event) => {
        event.preventDefault();
        await onSave(line, value === "" ? null : Number(value));
        setEditing(false);
    };

    if (editing) {
        return (
            <form onSubmit={submit} className="flex items-center gap-1">
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    autoFocus
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    className="w-24 rounded-lg border-slate-300 py-1 text-right text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500">{line.per_person ? "€ / pers." : "€"}</span>
                <button type="submit" className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" title="Enregistrer"><Check className="h-4 w-4" /></button>
                <button type="button" onClick={() => setEditing(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" title="Annuler"><X className="h-4 w-4" /></button>
            </form>
        );
    }

    return (
        <button type="button" onClick={open} disabled={!line.editable || !onSave} className="group inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-right transition enabled:hover:bg-orange-50 disabled:cursor-default dark:enabled:hover:bg-orange-950/30">
            <span>
                <span className={`block text-sm font-bold ${line.unit_price == null ? "text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                    {line.unit_price == null ? "À estimer" : formatMoney(line.amount)}
                </span>
                {line.per_person && line.unit_price != null && travelers > 1 && (
                    <span className="block text-[11px] text-slate-500">{formatMoney(line.unit_price)} × {travelers} pers.</span>
                )}
            </span>
            {line.editable && onSave && <Pencil className="h-3.5 w-3.5 text-slate-300 group-hover:text-orange-500" />}
        </button>
    );
}

function PlannedSection({ budget, canEdit, onSave, onMarkPaid }) {
    const [openGroups, setOpenGroups] = useState(() => new Set(["logement", "transport"]));
    const toggle = (key) => setOpenGroups((current) => {
        const next = new Set(current);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
    });

    if (!budget.planned.length) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-orange-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-orange-900/50 dark:bg-slate-800">
                Ajoutez des séjours et des activités au programme (ou laissez l’IA le faire) : leur coût apparaîtra ici.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {PLANNED_GROUPS.map((group) => {
                const lines = budget.planned.filter((line) => line.group === group.key);
                if (!lines.length) return null;
                const total = lines.reduce((sum, line) => sum + line.amount, 0);
                const missing = lines.filter((line) => line.unit_price == null).length;
                const isOpen = openGroups.has(group.key);

                return (
                    <section key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <button type="button" onClick={() => toggle(group.key)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${group.color}`}><group.Icon className="h-4 w-4" /></span>
                            <span className="flex-1">
                                <span className="block font-bold text-slate-800 dark:text-slate-100">{group.label}</span>
                                <span className="block text-xs text-slate-500">
                                    {lines.length} poste{lines.length > 1 ? "s" : ""}{missing > 0 && ` · ${missing} à estimer`}
                                </span>
                            </span>
                            <span className="text-lg font-black text-slate-900 dark:text-white">{formatMoney(total)}</span>
                        </button>
                        {isOpen && (
                            <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
                                {lines.map((line) => (
                                    <li key={line.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{line.label}</p>
                                            <p className="text-xs text-slate-500">
                                                {[line.date && formatDay(line.date), line.detail].filter(Boolean).join(" · ")}
                                            </p>
                                        </div>
                                        <AmountEditor line={line} travelers={budget.travelers} onSave={canEdit ? onSave : null} />
                                        {canEdit && line.amount > 0 && (
                                            <button type="button" onClick={() => onMarkPaid(line, group.expense)} title="Enregistrer comme dépense payée" className="rounded-lg border border-orange-200 px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-50 dark:border-orange-900 dark:text-orange-300 dark:hover:bg-orange-950/40">
                                                Payé
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                );
            })}
        </div>
    );
}

function MembersBar({ budget, canEdit, request }) {
    const [name, setName] = useState("");
    const [adding, setAdding] = useState(false);

    const add = async (event) => {
        event.preventDefault();
        if (!name.trim()) return;
        await request("post", route("trips.budget.members.store", budget.tripId), { name });
        setName("");
        setAdding(false);
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {budget.members.map((member) => (
                <span key={member.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-1 pr-3 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-[11px] font-black text-white">
                        {member.name.slice(0, 1).toUpperCase()}
                    </span>
                    {member.name}
                    {canEdit && member.removable && (
                        <button type="button" onClick={() => request("delete", route("trips.budget.members.destroy", [budget.tripId, member.id]))} className="text-slate-400 hover:text-rose-600" title="Retirer">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </span>
            ))}
            {canEdit && (adding ? (
                <form onSubmit={add} className="flex items-center gap-1">
                    <input value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={60} placeholder="Prénom" className="w-32 rounded-full border-slate-300 py-1 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                    <button type="submit" className="rounded-full bg-orange-500 p-1.5 text-white hover:bg-orange-600"><Check className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setAdding(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-3.5 w-3.5" /></button>
                </form>
            ) : (
                <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-orange-300 px-3 py-1 text-sm font-semibold text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/30">
                    <UserPlus className="h-3.5 w-3.5" /> Ajouter une personne
                </button>
            ))}
        </div>
    );
}

function ExpensesSection({ budget, canEdit, request, onAdd, onEdit }) {
    const memberName = (id) => budget.members.find((member) => member.id === id)?.name || "?";
    const maxBalance = Math.max(1, ...budget.members.map((member) => Math.abs(member.balance)));

    return (
        <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-3 lg:col-span-3">
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><Receipt className="h-4 w-4 text-orange-500" /> Dépenses</h3>
                    {canEdit && budget.members.length > 0 && (
                        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange-600">
                            <Plus className="h-4 w-4" /> Nouvelle dépense
                        </button>
                    )}
                </div>

                {budget.expenses.length === 0 ? (
                    <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
                        Aucune dépense pour le moment. Ajoutez qui a payé quoi : les comptes entre voyageurs se calculent tout seuls.
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
                        {budget.expenses.map((expense) => {
                            const category = expenseCategoryMeta(expense.category);
                            return (
                                <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300"><category.Icon className="h-4 w-4" /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{expense.title}</p>
                                        <p className="truncate text-xs text-slate-500">
                                            Payé par <strong>{memberName(expense.paid_by)}</strong>
                                            {expense.spent_on && ` · ${formatDay(expense.spent_on)}`}
                                            {` · pour ${expense.shares.length === budget.members.length ? "tout le monde" : expense.shares.map((share) => memberName(share.member_id)).join(", ")}`}
                                        </p>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{formatMoney(expense.amount)}</span>
                                    {canEdit && (
                                        <span className="flex">
                                            <button type="button" onClick={() => onEdit(expense)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700" title="Modifier"><Pencil className="h-3.5 w-3.5" /></button>
                                            <button
                                                type="button"
                                                onClick={() => window.confirm(`Supprimer la dépense « ${expense.title} » ?`) && request("delete", route("trips.expenses.destroy", [budget.tripId, expense.id]))}
                                                className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="space-y-4 lg:col-span-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><Scale className="h-4 w-4 text-orange-500" /> Équilibres</h3>
                    <ul className="mt-3 space-y-2.5">
                        {budget.members.map((member) => (
                            <li key={member.id}>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{member.name}</span>
                                    <span className={`font-bold ${member.balance > 0 ? "text-emerald-600" : member.balance < 0 ? "text-rose-600" : "text-slate-400"}`}>
                                        {member.balance > 0 ? "+" : ""}{formatMoney(member.balance)}
                                    </span>
                                </div>
                                <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                    <span className="h-full w-1/2">
                                        {member.balance < 0 && <span className="ml-auto block h-full rounded-l-full bg-rose-400" style={{ width: `${(Math.abs(member.balance) / maxBalance) * 100}%` }} />}
                                    </span>
                                    <span className="h-full w-1/2">
                                        {member.balance > 0 && <span className="block h-full rounded-r-full bg-emerald-400" style={{ width: `${(member.balance / maxBalance) * 100}%` }} />}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-slate-400">A payé {formatMoney(member.paid)}</p>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
                    <h3 className="flex items-center gap-2 font-bold text-orange-900 dark:text-orange-100"><CircleDollarSign className="h-4 w-4" /> Pour être quittes</h3>
                    {budget.settlements.length === 0 ? (
                        <p className="mt-2 text-sm text-orange-900/70 dark:text-orange-100/70">Tout le monde est à l’équilibre.</p>
                    ) : (
                        <ul className="mt-3 space-y-2">
                            {budget.settlements.map((transfer, index) => (
                                <li key={index} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-800">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{memberName(transfer.from)}</span>
                                    <ArrowRight className="h-4 w-4 text-orange-400" />
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{memberName(transfer.to)}</span>
                                    <span className="ml-auto font-black text-orange-700 dark:text-orange-300">{formatMoney(transfer.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

export default function BudgetTab({ trip, canEdit }) {
    const [budget, setBudget] = useState(null);
    const [error, setError] = useState("");
    const [view, setView] = useState("planned");
    const [expenseDraft, setExpenseDraft] = useState(null);
    const [editingTarget, setEditingTarget] = useState(false);
    const [targetValue, setTargetValue] = useState("");

    const receive = (data) => setBudget({ ...data, tripId: trip.id });

    useEffect(() => {
        axios.get(route("trips.budget.show", trip.id))
            .then((response) => receive(response.data))
            .catch(() => setError("Impossible de charger le budget."));
    }, [trip.id, trip.stays, trip.transitions]);

    const request = async (method, url, data) => {
        setError("");
        try {
            const response = await axios({ method, url, data });
            receive(response.data);
            return true;
        } catch (requestError) {
            const errors = requestError.response?.data?.errors;
            setError(errors ? Object.values(errors).flat()[0] : requestError.response?.data?.message || "L’opération a échoué.");
            return false;
        }
    };

    const savePlanned = (line, amount) => request("patch", route("trips.budget.planned", trip.id), { type: line.type, id: line.id, amount });

    const saveTarget = async (event) => {
        event.preventDefault();
        if (await request("patch", route("trips.budget.target", trip.id), { budget_target: targetValue === "" ? null : Number(targetValue) })) {
            setEditingTarget(false);
        }
    };

    const shares = useMemo(() => {
        if (!budget) return [];
        return PLANNED_GROUPS.map((group) => ({
            ...group,
            total: budget.planned.filter((line) => line.group === group.key).reduce((sum, line) => sum + line.amount, 0),
        })).filter((group) => group.total > 0);
    }, [budget]);

    if (!budget) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                {error || (<><Loader2 className="h-4 w-4 animate-spin" /> Chargement du budget…</>)}
            </div>
        );
    }

    const reference = budget.target ?? budget.planned_total;
    const progress = reference > 0 ? Math.min(100, (budget.spent_total / reference) * 100) : 0;
    const overTarget = budget.target != null && budget.planned_total > budget.target;

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 p-6 text-white shadow-xl shadow-orange-500/20">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-2xl font-black"><Wallet className="h-6 w-6" /> Budget du voyage</h2>
                        <p className="mt-1 text-sm text-orange-50">Estimez le coût du voyage, notez qui a payé quoi et équilibrez les comptes entre voyageurs.</p>
                    </div>
                    <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-50">Budget cible</p>
                        {editingTarget ? (
                            <form onSubmit={saveTarget} className="mt-1 flex items-center gap-1">
                                <input type="number" min="0" step="1" autoFocus value={targetValue} onChange={(event) => setTargetValue(event.target.value)} placeholder="Aucun" className="w-28 rounded-lg border-0 py-1 text-sm text-slate-900" />
                                <button type="submit" className="rounded-lg bg-white p-1.5 text-orange-600"><Check className="h-4 w-4" /></button>
                                <button type="button" onClick={() => setEditingTarget(false)} className="rounded-lg p-1.5 text-white/80 hover:bg-white/20"><X className="h-4 w-4" /></button>
                            </form>
                        ) : (
                            <button type="button" disabled={!canEdit} onClick={() => { setTargetValue(budget.target ?? ""); setEditingTarget(true); }} className="mt-0.5 inline-flex items-center gap-2 text-xl font-black disabled:cursor-default">
                                {budget.target != null ? formatMoney(budget.target) : "Non défini"}
                                {canEdit && <Pencil className="h-4 w-4 text-white/70" />}
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        [PiggyBank, formatMoney(budget.planned_total), "prévu au total"],
                        [Users, formatMoney(budget.planned_total / budget.travelers), `par personne (${budget.travelers})`],
                        [Receipt, formatMoney(budget.spent_total), "déjà dépensé"],
                        [Scale, formatMoney(Math.max(0, reference - budget.spent_total)), budget.target != null ? "reste sur la cible" : "reste à dépenser"],
                    ].map(([Icon, value, label]) => (
                        <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                            <Icon className="h-5 w-5 shrink-0 text-orange-100" />
                            <div className="min-w-0">
                                <p className="truncate text-lg font-black leading-tight">{value}</p>
                                <p className="text-[11px] text-orange-50">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {shares.length > 0 && (
                    <div className="relative mt-4">
                        <div className="flex h-2.5 overflow-hidden rounded-full bg-white/20">
                            {shares.map((group) => (
                                <span key={group.key} className={group.color} style={{ width: `${(group.total / budget.planned_total) * 100}%` }} title={`${group.label} : ${formatMoney(group.total)}`} />
                            ))}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-orange-50">
                            {shares.map((group) => (
                                <span key={group.key} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${group.color}`} /> {group.label} {formatMoney(group.total)}</span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="relative mt-4">
                    <div className="flex justify-between text-[11px] text-orange-50">
                        <span>Dépensé {Math.round(progress)} %</span>
                        {overTarget && <span className="font-bold">Le prévisionnel dépasse la cible de {formatMoney(budget.planned_total - budget.target)}</span>}
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
                        <span className="block h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </section>

            {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    {[["planned", "Prévisionnel", PiggyBank], ["expenses", "Dépenses & comptes", Receipt]].map(([key, label, Icon]) => (
                        <button key={key} type="button" onClick={() => setView(key)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${view === key ? "bg-white text-orange-700 shadow dark:bg-slate-700 dark:text-orange-300" : "text-slate-600 hover:text-slate-800 dark:text-slate-300"}`}>
                            <Icon className="h-4 w-4" /> {label}
                        </button>
                    ))}
                </div>
                {view === "expenses" && <MembersBar budget={budget} canEdit={canEdit} request={request} />}
            </div>

            {view === "planned" ? (
                <PlannedSection
                    budget={budget}
                    canEdit={canEdit}
                    onSave={savePlanned}
                    onMarkPaid={(line, category) => setExpenseDraft({ title: line.label, amount: line.amount, category, spent_on: line.date })}
                />
            ) : (
                <ExpensesSection budget={budget} canEdit={canEdit} request={request} onAdd={() => setExpenseDraft({})} onEdit={(expense) => setExpenseDraft(expense)} />
            )}

            {expenseDraft && (
                <ExpenseModal
                    budget={budget}
                    draft={expenseDraft}
                    error={error}
                    onClose={() => { setExpenseDraft(null); setError(""); }}
                    onSubmit={async (payload) => {
                        const ok = await request(
                            expenseDraft.id ? "put" : "post",
                            expenseDraft.id ? route("trips.expenses.update", [trip.id, expenseDraft.id]) : route("trips.expenses.store", trip.id),
                            payload,
                        );
                        if (ok) {
                            setExpenseDraft(null);
                            setView("expenses");
                        }
                        return ok;
                    }}
                />
            )}
        </div>
    );
}
