import { useEffect, useMemo, useState } from "react";
import { Receipt, X } from "lucide-react";
import { formatMoney } from "@/Utils/formatters";
import { EXPENSE_CATEGORIES } from "@/Constants/budget";

const inputClass = "w-full rounded-xl border-slate-300 text-sm focus:border-orange-500 focus:ring-orange-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

export default function ExpenseModal({ budget, draft, error, onClose, onSubmit }) {
    const members = budget.members;
    const [title, setTitle] = useState(draft.title || "");
    const [amount, setAmount] = useState(draft.amount ? String(draft.amount) : "");
    const [category, setCategory] = useState(draft.category || "autre");
    const [spentOn, setSpentOn] = useState(draft.spent_on || new Date().toISOString().slice(0, 10));
    const [paidBy, setPaidBy] = useState(draft.paid_by || members[0]?.id);
    const [mode, setMode] = useState(draft.split_mode || "equal");
    // Personnes concernées et, en mode « montants », la part de chacune.
    const [selected, setSelected] = useState(() => draft.shares
        ? Object.fromEntries(draft.shares.map((share) => [share.member_id, String(share.amount)]))
        : Object.fromEntries(members.map((member) => [member.id, ""])));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const onKey = (event) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const selectedIds = members.map((member) => member.id).filter((id) => id in selected);
    const total = Number(amount) || 0;
    const assigned = selectedIds.reduce((sum, id) => sum + (Number(selected[id]) || 0), 0);
    const remaining = Math.round((total - assigned) * 100) / 100;
    const equalShare = selectedIds.length ? total / selectedIds.length : 0;

    const toggle = (id) => setSelected((current) => {
        const next = { ...current };
        id in next ? delete next[id] : (next[id] = "");
        return next;
    });

    const canSubmit = useMemo(
        () => title.trim() && total > 0 && paidBy && selectedIds.length && (mode === "equal" || Math.abs(remaining) < 0.005),
        [title, total, paidBy, selectedIds.length, mode, remaining],
    );

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        await onSubmit({
            title,
            amount: total,
            category,
            spent_on: spentOn || null,
            paid_by: paidBy,
            split_mode: mode,
            planned_key: draft.planned_key || null,
            shares: selectedIds.map((id) => ({ member_id: id, amount: mode === "amounts" ? Number(selected[id]) || 0 : null })),
        });
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <form onSubmit={submit} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
                <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                        <span className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 p-2 text-white"><Receipt className="h-4 w-4" /></span>
                        {draft.id ? "Modifier la dépense" : "Nouvelle dépense"}
                    </h3>
                    <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer"><X className="h-5 w-5" /></button>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                    <div className="grid grid-cols-3 gap-3">
                        <label className="col-span-2 block">
                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Intitulé</span>
                            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={191} required placeholder="Ex : courses, essence, musée…" className={inputClass} />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Montant (€)</span>
                            <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required className={inputClass} />
                        </label>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {EXPENSE_CATEGORIES.map(({ key, label, Icon }) => (
                            <button key={key} type="button" onClick={() => setCategory(key)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${category === key ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"}`}>
                                <Icon className="h-3.5 w-3.5" /> {label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Payé par</span>
                            <select value={paidBy} onChange={(event) => setPaidBy(Number(event.target.value))} className={inputClass}>
                                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Date</span>
                            <input type="date" value={spentOn} onChange={(event) => setSpentOn(event.target.value)} className={inputClass} />
                        </label>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Pour qui ?</span>
                            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold dark:bg-slate-800">
                                {[["equal", "Parts égales"], ["amounts", "Montants"]].map(([key, label]) => (
                                    <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-md px-2.5 py-1 ${mode === key ? "bg-white text-orange-700 shadow dark:bg-slate-700 dark:text-orange-300" : "text-slate-500"}`}>{label}</button>
                                ))}
                            </div>
                        </div>
                        <ul className="space-y-1.5">
                            {members.map((member) => {
                                const checked = member.id in selected;
                                return (
                                    <li key={member.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                                        <input type="checkbox" checked={checked} onChange={() => toggle(member.id)} className="rounded text-orange-500 focus:ring-orange-500" />
                                        <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{member.name}</span>
                                        {checked && (mode === "equal" ? (
                                            <span className="text-sm text-slate-500">{formatMoney(equalShare)}</span>
                                        ) : (
                                            <input type="number" min="0" step="0.01" value={selected[member.id]} onChange={(event) => setSelected((current) => ({ ...current, [member.id]: event.target.value }))} className="w-24 rounded-lg border-slate-300 py-1 text-right text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                                        ))}
                                    </li>
                                );
                            })}
                        </ul>
                        {mode === "amounts" && total > 0 && Math.abs(remaining) >= 0.005 && (
                            <p className="mt-2 text-xs font-semibold text-rose-600">
                                {remaining > 0 ? `Il reste ${formatMoney(remaining)} à répartir.` : `Les parts dépassent le montant de ${formatMoney(-remaining)}.`}
                            </p>
                        )}
                    </div>

                    {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
                </div>

                <footer className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">Annuler</button>
                    <button type="submit" disabled={!canSubmit || saving} className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50">
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </footer>
            </form>
        </div>
    );
}
