import { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { CONSENT_EVENT, readConsent } from "@/Utils/consent";

let loaded = false;

/**
 * Charge une seule fois le script Travelpayouts Drive, qui transforme les liens
 * sortants (Booking, Expedia…) en liens affiliés. Uniquement sur les pages à liens
 * partenaires, et seulement si l'utilisateur a accepté les cookies d'affiliation.
 */
export function useAffiliateLinks() {
    const src = usePage().props.affiliate?.drive_script;
    const [allowed, setAllowed] = useState(() => readConsent()?.affiliate === true);

    useEffect(() => {
        const update = (event) => setAllowed(event.detail?.affiliate === true);
        window.addEventListener(CONSENT_EVENT, update);
        return () => window.removeEventListener(CONSENT_EVENT, update);
    }, []);

    useEffect(() => {
        if (!src || !allowed || loaded) return;
        loaded = true;
        const script = document.createElement("script");
        script.async = true;
        script.src = src;
        script.setAttribute("data-cmp-ab", "2");
        document.head.appendChild(script);
    }, [src, allowed]);
}
