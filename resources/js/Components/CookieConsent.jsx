import { useEffect, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import { Cookie, Lock, ShieldCheck, X } from "lucide-react";
import { OPEN_SETTINGS_EVENT, readConsent, saveConsent } from "@/Utils/consent";

const Toggle = ({ checked, disabled, onChange, label }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[1.375rem]" : "left-0.5"}`} />
    </button>
);

/**
 * Consentement aux cookies non essentiels (CNIL) : bandeau au premier passage,
 * « Tout refuser » aussi accessible que « Tout accepter », choix modifiable à tout moment.
 */
export default function CookieConsent() {
    const { legal } = usePage().props;
    const affiliateEnabled = Boolean(legal?.affiliate_enabled);
    const [consent, setConsent] = useState(() => readConsent());
    const [panel, setPanel] = useState(false);
    const [affiliate, setAffiliate] = useState(consent?.affiliate ?? false);

    useEffect(() => {
        const open = () => {
            setAffiliate(readConsent()?.affiliate ?? false);
            setPanel(true);
        };
        window.addEventListener(OPEN_SETTINGS_EVENT, open);
        return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
    }, []);

    const decide = (choice) => {
        const previous = readConsent();
        setConsent(saveConsent({ affiliate: choice }, legal?.consent_days));
        setPanel(false);
        // Retrait d'un consentement déjà donné : on recharge pour couper le script tiers.
        if (previous?.affiliate && !choice) window.location.reload();
    };

    const showBanner = affiliateEnabled && !consent && !panel;

    return (
        <>
            {showBanner && (
                <div className="fixed inset-x-0 bottom-0 z-[130] p-3 sm:p-5 print:hidden" role="dialog" aria-label="Gestion des cookies">
                    <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:flex-row md:items-center">
                        <span className="hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-3 text-white md:block"><Cookie className="h-6 w-6" /></span>
                        <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            Nous utilisons des cookies <strong>indispensables</strong> au fonctionnement du site (connexion, panier, sécurité) et, avec votre accord, des cookies d’<strong>affiliation</strong> qui nous rémunèrent lorsque vous réservez chez un partenaire (Booking, Expedia…), sans surcoût pour vous.{" "}
                            <Link href={route("legal.privacy")} className="font-semibold text-indigo-600 underline">En savoir plus</Link>
                        </p>
                        <div className="flex flex-wrap gap-2 md:flex-col">
                            <button onClick={() => decide(true)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Tout accepter</button>
                            <button onClick={() => decide(false)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Tout refuser</button>
                            <button onClick={() => setPanel(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Personnaliser</button>
                        </div>
                    </div>
                </div>
            )}

            {panel && (
                <div className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center print:hidden" role="dialog" aria-label="Préférences cookies">
                    <div className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                        <div className="flex items-start justify-between">
                            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><Cookie className="h-5 w-5 text-orange-500" /> Vos préférences cookies</h2>
                            <button onClick={() => setPanel(false)} className="text-slate-400 hover:text-slate-600" aria-label="Fermer"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                                <div>
                                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100"><Lock className="h-4 w-4 text-emerald-600" /> Strictement nécessaires</p>
                                    <p className="mt-1 text-xs text-slate-500">Session, sécurité des formulaires, accès invité à un voyage, panier, mémorisation de ce choix. Toujours actifs : sans eux le site ne fonctionne pas.</p>
                                </div>
                                <Toggle checked disabled label="Cookies nécessaires" />
                            </div>
                            <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                                <div>
                                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100"><ShieldCheck className="h-4 w-4 text-indigo-600" /> Affiliation partenaires</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {affiliateEnabled
                                            ? "Travelpayouts : permet d’identifier que vous venez de notre site quand vous réservez chez Booking, Expedia… et de nous verser une commission. Aucun surcoût, aucune publicité ciblée."
                                            : "Aucun cookie d’affiliation n’est utilisé actuellement."}
                                    </p>
                                </div>
                                <Toggle checked={affiliateEnabled && affiliate} disabled={!affiliateEnabled} onChange={setAffiliate} label="Cookies d’affiliation" />
                            </div>
                            <p className="text-[11px] text-slate-400">Nous n’utilisons ni cookies publicitaires ni mesure d’audience. Votre choix est conservé 6 mois et modifiable à tout moment depuis le pied de page.</p>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                            <button onClick={() => decide(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Tout refuser</button>
                            <button onClick={() => decide(affiliateEnabled && affiliate)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Enregistrer mes choix</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
