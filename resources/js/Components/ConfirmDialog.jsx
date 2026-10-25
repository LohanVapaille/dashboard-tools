import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CircleAlert, Info, Trash2 } from "lucide-react";

// Boîtes de dialogue du site (à la place de confirm() / alert() / prompt() du navigateur).
// Utilisables partout : `if (await confirmDialog({...})) …` ; affichées par <ConfirmHost /> du layout.

let open = null;

/**
 * @param {object} options
 * @param {string} options.title
 * @param {string|JSX.Element} [options.message]
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]  null : un seul bouton (information)
 * @param {"danger"|"warning"|"info"} [options.tone]
 * @param {string} [options.typeToConfirm]  texte à recopier pour valider (action irréversible)
 * @returns {Promise<boolean>}
 */
export function confirmDialog(options) {
    if (!open) return Promise.resolve(window.confirm(options.title));
    return new Promise((resolve) => open({ ...options, resolve }));
}

/** Simple message d'information avec un bouton « Compris ». */
export const notify = (options) => confirmDialog({ tone: "info", confirmLabel: "Compris", cancelLabel: null, ...options });

const TONES = {
    danger: { Icon: Trash2, badge: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300", button: "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/30" },
    warning: { Icon: AlertTriangle, badge: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300", button: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/30" },
    info: { Icon: Info, badge: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300", button: "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/30" },
};

export default function ConfirmHost() {
    const [dialog, setDialog] = useState(null);
    const [typed, setTyped] = useState("");
    const confirmButton = useRef(null);

    useEffect(() => {
        open = (options) => {
            setTyped("");
            setDialog(options);
        };
        return () => {
            open = null;
        };
    }, []);

    const close = (result) => {
        dialog?.resolve(result);
        setDialog(null);
    };

    useEffect(() => {
        if (!dialog) return;
        const onKey = (event) => event.key === "Escape" && close(false);
        window.addEventListener("keydown", onKey);
        if (!dialog.typeToConfirm) setTimeout(() => confirmButton.current?.focus(), 30);
        return () => window.removeEventListener("keydown", onKey);
    }, [dialog]);

    if (!dialog) return null;

    const tone = TONES[dialog.tone || "danger"] || TONES.danger;
    const Icon = dialog.icon || tone.Icon;
    const blocked = dialog.typeToConfirm && typed.trim() !== dialog.typeToConfirm.trim();

    return (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && close(false)}>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!blocked) close(true);
                }}
                role="alertdialog"
                aria-modal="true"
                className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl"
            >
                <div className="flex gap-4 p-6">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.badge}`}>
                        <Icon className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">{dialog.title}</h3>
                        {dialog.message && <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{dialog.message}</div>}
                        {dialog.typeToConfirm && (
                            <label className="block pt-2">
                                <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                                    <CircleAlert className="h-3.5 w-3.5" /> Tapez <strong className="text-slate-800 dark:text-slate-100">{dialog.typeToConfirm}</strong> pour confirmer
                                </span>
                                <input autoFocus value={typed} onChange={(event) => setTyped(event.target.value)} className="w-full rounded-xl border-slate-300 text-sm focus:border-rose-500 focus:ring-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                            </label>
                        )}
                    </div>
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:justify-end">
                    {dialog.cancelLabel !== null && (
                        <button type="button" onClick={() => close(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800">
                            {dialog.cancelLabel || "Annuler"}
                        </button>
                    )}
                    <button ref={confirmButton} disabled={blocked} className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${tone.button}`}>
                        {dialog.confirmLabel || "Confirmer"}
                    </button>
                </div>
            </form>
        </div>
    );
}
