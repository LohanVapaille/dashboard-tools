import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { Plus, Trash2, Check, X, ExternalLink } from "lucide-react";
import { BLOCK_TYPES } from "@/Constants/dayBlocks";

const inputClass =
    "w-full text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500";

const euro = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
});

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Évite tout href du type "javascript:..." : on force toujours http(s)
const toHref = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const parseAmount = (value) => {
    const n = parseFloat(String(value).replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
};

// Compare deux contenus en ignorant la différence "" / null renvoyée par Laravel
const normalize = (obj) =>
    JSON.stringify(
        Object.fromEntries(
            Object.entries(obj || {}).map(([k, v]) => [k, v ?? ""]),
        ),
    );

export default function DayBlockItem({ block }) {
    const config = BLOCK_TYPES[block.type];

    const [title, setTitle] = useState(block.title || "");
    const [fields, setFields] = useState(block.content || {});
    const [items, setItems] = useState(block.content?.items || []);
    const [draftText, setDraftText] = useState("");
    const [draftAmount, setDraftAmount] = useState("");

    if (!config) return null;

    const { Icon } = config;
    const isList = block.type === "checklist" || block.type === "budget";

    const patch = (data) =>
        router.patch(route("day-blocks.update", block.id), data, {
            preserveScroll: true,
            preserveState: true,
        });

    const handleDelete = () => {
        if (confirm(`Supprimer « ${block.title} » ?`)) {
            router.delete(route("day-blocks.destroy", block.id), {
                preserveScroll: true,
                preserveState: true,
            });
        }
    };

    const saveTitle = () => {
        const clean = title.trim();
        if (!clean) {
            setTitle(block.title || "");
            return;
        }
        if (clean !== block.title) patch({ title: clean });
    };

    // Pense-bête et réservation : sauvegarde quand on quitte le champ
    const setField = (key, value) =>
        setFields((prev) => ({ ...prev, [key]: value }));

    const saveFields = () => {
        if (normalize(fields) !== normalize(block.content)) {
            patch({ content: fields });
        }
    };

    // Checklist et budget : affichage instantané puis sauvegarde
    const persistItems = (next) => {
        setItems(next);
        patch({ content: { items: next } });
    };

    const addItem = () => {
        const text = draftText.trim();
        if (!text) return;

        const item =
            block.type === "checklist"
                ? { id: newId(), text, done: false }
                : { id: newId(), text, amount: parseAmount(draftAmount) };

        persistItems([...items, item]);
        setDraftText("");
        setDraftAmount("");
    };

    const toggleItem = (id) =>
        persistItems(
            items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
        );

    const removeItem = (id) => persistItems(items.filter((it) => it.id !== id));

    const onEnter = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addItem();
        }
    };

    const doneCount = items.filter((it) => it.done).length;
    const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            {/* En-tête : titre modifiable + suppression */}
            <div className="flex items-center gap-2">
                <div
                    className={`p-1.5 rounded-lg shrink-0 ${config.chipClass}`}
                >
                    <Icon className={`w-4 h-4 ${config.iconClass}`} />
                </div>

                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) =>
                        e.key === "Enter" && e.currentTarget.blur()
                    }
                    aria-label="Titre de la section"
                    className="flex-1 min-w-0 bg-transparent border-0 p-0 focus:ring-0 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
                />

                {block.type === "checklist" && items.length > 0 && (
                    <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                        {doneCount}/{items.length}
                    </span>
                )}

                <button
                    onClick={handleDelete}
                    title="Supprimer"
                    className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Pense-bête */}
            {block.type === "memo" && (
                <textarea
                    value={fields.text ?? ""}
                    onChange={(e) => setField("text", e.target.value)}
                    onBlur={saveFields}
                    placeholder="Écrire un pense-bête (code Wi-Fi, astuce, rappel…)"
                    rows={3}
                    className={`${inputClass} resize-none`}
                />
            )}

            {/* Réservation / lien */}
            {block.type === "booking" && (
                <div className="space-y-2">
                    <input
                        type="text"
                        inputMode="url"
                        value={fields.url ?? ""}
                        onChange={(e) => setField("url", e.target.value)}
                        onBlur={saveFields}
                        placeholder="Lien (Airbnb, billet de concert, train…)"
                        className={inputClass}
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            value={fields.reference ?? ""}
                            onChange={(e) =>
                                setField("reference", e.target.value)
                            }
                            onBlur={saveFields}
                            placeholder="N° de réservation"
                            className={inputClass}
                        />
                        <input
                            type="time"
                            value={fields.time ?? ""}
                            onChange={(e) => setField("time", e.target.value)}
                            onBlur={saveFields}
                            className={inputClass}
                        />
                    </div>

                    {fields.url?.trim() && (
                        <a
                            href={toHref(fields.url.trim())}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Ouvrir le lien
                        </a>
                    )}
                </div>
            )}

            {/* Checklist / Budget */}
            {isList && (
                <div className="space-y-2">
                    {items.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                            Aucun élément pour le moment.
                        </p>
                    ) : (
                        <ul className="space-y-1.5">
                            {items.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex items-center gap-2 text-xs"
                                >
                                    {block.type === "checklist" && (
                                        <button
                                            onClick={() => toggleItem(item.id)}
                                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                item.done
                                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                                    : "border-slate-300 dark:border-slate-600"
                                            }`}
                                        >
                                            {item.done && (
                                                <Check className="w-3 h-3" />
                                            )}
                                        </button>
                                    )}

                                    <span
                                        className={`flex-1 min-w-0 break-words ${
                                            item.done
                                                ? "line-through text-slate-400"
                                                : "text-slate-700 dark:text-slate-200"
                                        }`}
                                    >
                                        {item.text}
                                    </span>

                                    {block.type === "budget" && (
                                        <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                            {euro.format(
                                                Number(item.amount) || 0,
                                            )}
                                        </span>
                                    )}

                                    <button
                                        onClick={() => removeItem(item.id)}
                                        title="Retirer"
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="flex gap-1.5">
                        <input
                            type="text"
                            value={draftText}
                            onChange={(e) => setDraftText(e.target.value)}
                            onKeyDown={onEnter}
                            placeholder={
                                block.type === "budget"
                                    ? "Dépense (ex: Resto)…"
                                    : "Ajouter un élément…"
                            }
                            className="flex-1 min-w-0 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                        />

                        {block.type === "budget" && (
                            <input
                                type="text"
                                inputMode="decimal"
                                value={draftAmount}
                                onChange={(e) => setDraftAmount(e.target.value)}
                                onKeyDown={onEnter}
                                placeholder="€"
                                className="w-16 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                            />
                        )}

                        <button
                            onClick={addItem}
                            className="px-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {block.type === "budget" && items.length > 0 && (
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <span className="font-semibold text-slate-500">
                                Total
                            </span>
                            <span className="font-bold tabular-nums text-slate-800 dark:text-slate-100">
                                {euro.format(total)}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
