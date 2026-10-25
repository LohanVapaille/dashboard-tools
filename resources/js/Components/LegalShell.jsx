import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Scale } from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";

export const Missing = ({ children = "à compléter" }) => (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">{children}</span>
);

export const Value = ({ value }) => (value ? <>{value}</> : <Missing />);

export const LegalSection = ({ id, title, children }) => (
    <section id={id} className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</div>
    </section>
);

/** Gabarit commun des pages légales (mentions, CGV, confidentialité). */
export default function LegalShell({ title, subtitle, updatedAt, children }) {
    return (
        <GuestLayout>
            <Head title={title} />
            <div className="bg-gradient-to-r from-slate-700 via-indigo-700 to-violet-700">
                <div className="mx-auto max-w-4xl px-4 py-10 text-white sm:px-6">
                    <p className="flex items-center gap-2 text-sm font-medium text-white/80"><Scale className="h-4 w-4" /> Informations légales</p>
                    <h1 className="text-3xl font-black">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-white/80">{subtitle}</p>}
                </div>
            </div>
            <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
                <article className="space-y-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-10">
                    {children}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-400 dark:border-slate-700">
                        {updatedAt && <span>Dernière mise à jour : {updatedAt}</span>}
                        <nav className="flex flex-wrap gap-4 font-semibold">
                            <Link href={route("legal.notice")} className="hover:text-indigo-600">Mentions légales</Link>
                            <Link href={route("legal.terms")} className="hover:text-indigo-600">Conditions générales</Link>
                            <Link href={route("legal.privacy")} className="hover:text-indigo-600">Confidentialité et cookies</Link>
                        </nav>
                    </div>
                    <Link href={route("trips.index")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Retour à mes voyages</Link>
                </article>
            </div>
        </GuestLayout>
    );
}
