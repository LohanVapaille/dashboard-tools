import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { CONSENT_EVENT, openCookieSettings, readConsent } from "@/Utils/consent";

const SCRIPT = "https://widget.getyourguide.com/dist/pa.umd.production.min.js";

/**
 * Widget officiel GetYourGuide : activités de la ville affichées dans la page, réservées chez
 * GetYourGuide (vendeur), commission pour le site. Il dépose des cookies : chargé après consentement.
 */
export default function GetYourGuideWidget({ partnerId, query, items = 3 }) {
    const [allowed, setAllowed] = useState(() => Boolean(readConsent()?.affiliate));
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const update = () => setAllowed(Boolean(readConsent()?.affiliate));
        window.addEventListener(CONSENT_EVENT, update);
        return () => window.removeEventListener(CONSENT_EVENT, update);
    }, []);

    useEffect(() => {
        if (!open || !allowed) return;
        // Le script détecte les blocs data-gyg-* présents ; on le recharge pour les nouveaux blocs.
        document.querySelector(`script[src="${SCRIPT}"]`)?.remove();
        const script = Object.assign(document.createElement("script"), { src: SCRIPT, async: true, defer: true });
        script.dataset.gygPartnerId = partnerId;
        document.body.appendChild(script);
    }, [open, allowed, query]);

    if (!partnerId || !query) return null;

    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
            <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
                <span className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
                    <span className="rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 p-2 text-white"><Ticket className="h-4 w-4" /></span>
                    Idées d’activités à {query}
                </span>
                <span className="text-xs font-bold text-orange-600">{open ? "Masquer" : "Voir les visites et billets"}</span>
            </button>
            {open && (
                <div className="mt-4">
                    {allowed ? (
                        <div
                            key={query}
                            data-gyg-widget="activities"
                            data-gyg-number-of-items={String(items)}
                            data-gyg-locale-code="fr-FR"
                            data-gyg-currency="EUR"
                            data-gyg-partner-id={partnerId}
                            data-gyg-q={query}
                        />
                    ) : (
                        <div className="rounded-xl bg-orange-50 p-4 text-sm text-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
                            Ces suggestions viennent de notre partenaire GetYourGuide, qui utilise des cookies.{" "}
                            <button type="button" onClick={openCookieSettings} className="font-bold underline">Autoriser les contenus partenaires</button>
                        </div>
                    )}
                    <p className="mt-2 text-[11px] text-slate-400">Réservation et paiement chez GetYourGuide. Nous pouvons percevoir une commission, sans surcoût pour vous.</p>
                </div>
            )}
        </div>
    );
}
