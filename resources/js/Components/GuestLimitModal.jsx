// resources/js/Components/GuestLimitModal.jsx
import React from "react";
import { Link } from "@inertiajs/react";
import { UserPlus, X, AlertTriangle } from "lucide-react";

export default function GuestLimitModal({ remaining, onClose }) {
    if (remaining === null || remaining === undefined) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Vous n'avez pas de compte
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Vos voyages sont liés à cet appareil uniquement. Créez
                        un compte gratuit pour les retrouver partout et en créer
                        davantage.
                    </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 text-center">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {remaining}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        voyage{remaining > 1 ? "s" : ""} restant
                        {remaining > 1 ? "s" : ""} sans connexion
                    </p>
                </div>

                <div className="flex gap-3 pt-1">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                    >
                        Continuer sans compte
                    </button>
                    <Link
                        href={route("register")}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition"
                    >
                        <UserPlus className="w-4 h-4" />
                        Créer un compte
                    </Link>
                </div>
            </div>
        </div>
    );
}
