import { useEffect } from "react";
import { Link } from "@inertiajs/react";
import { Cloud, Crown, LogIn, Smartphone, Sparkles, UserPlus, Users, X } from "lucide-react";

const GUEST_LIMIT = 3;

/** Prévient un visiteur sans compte du nombre de voyages qu'il peut encore créer sur cet appareil. */
export default function GuestLimitModal({ remaining, onClose }) {
    useEffect(() => {
        const onKey = (event) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    if (remaining === null || remaining === undefined) return null;

    const used = Math.max(0, GUEST_LIMIT - remaining);
    const last = remaining === 0;

    return (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
                <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 pb-6 pt-5 text-white">
                    <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                    <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 transition hover:bg-white/25" aria-label="Fermer"><X className="h-4 w-4" /></button>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider"><Smartphone className="h-3.5 w-3.5" /> Mode invité</span>
                    <h3 className="mt-3 text-2xl font-black leading-tight">{last ? "C’était votre dernier voyage sans compte" : "Votre voyage est créé !"}</h3>
                    <p className="mt-1 text-sm text-indigo-100">Il est enregistré sur cet appareil uniquement. Un compte gratuit le garde en sécurité, partout.</p>

                    <div className="mt-5 flex items-center gap-3">
                        <div className="flex gap-1.5">
                            {Array.from({ length: GUEST_LIMIT }, (_, index) => (
                                <span key={index} className={`h-2.5 w-8 rounded-full ${index < used ? "bg-white" : "bg-white/25"}`} />
                            ))}
                        </div>
                        <span className="text-sm font-bold">
                            {remaining} voyage{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""} sans compte
                        </span>
                    </div>
                </header>

                <div className="space-y-4 p-6">
                    <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                        {[
                            [Cloud, "Vos voyages sur tous vos appareils, même si vous videz le navigateur"],
                            [Users, "Partagez et préparez le voyage à plusieurs"],
                            [Sparkles, "Programme suggéré par l’IA et voyages illimités"],
                            [Crown, "Prix membres sur les hôtels réservables"],
                        ].map(([Icon, text]) => (
                            <li key={text} className="flex items-start gap-3">
                                <span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"><Icon className="h-4 w-4" /></span>
                                <span className="pt-0.5">{text}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="grid gap-2 sm:grid-cols-2">
                        <Link href={route("register")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-violet-700">
                            <UserPlus className="h-4 w-4" /> Créer un compte
                        </Link>
                        <Link href={route("login")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                            <LogIn className="h-4 w-4" /> J’ai déjà un compte
                        </Link>
                    </div>
                    <button onClick={onClose} className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        Continuer sans compte
                    </button>
                    <p className="text-center text-[11px] text-slate-400">Vos voyages créés en invité sont rattachés automatiquement à votre compte.</p>
                </div>
            </div>
        </div>
    );
}
