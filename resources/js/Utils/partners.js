// Réservation chez les partenaires : leurs sites refusent d'être affichés dans une iframe
// (X-Frame-Options), on les ouvre donc dans une fenêtre dédiée, au-dessus du voyage.
// À sa fermeture, on propose d'enregistrer la réservation dans le voyage.

import axios from "axios";

/** Lien affilié Travelpayouts calculé par le serveur (lien d'origine si la marque n'est pas rejointe). */
async function affiliate(url) {
    try {
        const { data } = await axios.post(route("partners.link"), { url });
        return data.url || url;
    } catch {
        return url;
    }
}

export function openPartnerWindow(url, onClosed) {
    const width = Math.min(1180, window.screen.availWidth - 40);
    const height = Math.min(860, window.screen.availHeight - 60);
    const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
    // Ouverte tout de suite (sinon bloquée par le navigateur), puis dirigée vers le lien affilié.
    const popup = window.open("", "lovatrip-partner", `popup=yes,width=${width},height=${height},left=${left},top=${top}`);

    // Fenêtre bloquée (mobile, bloqueur) : on bascule sur un nouvel onglet et on attend le retour sur la page.
    if (!popup) {
        window.open(url, "_blank", "noopener");
        const back = () => {
            if (document.visibilityState !== "visible") return;
            document.removeEventListener("visibilitychange", back);
            onClosed?.();
        };
        setTimeout(() => document.addEventListener("visibilitychange", back), 500);
        return null;
    }

    try {
        popup.document.title = "Ouverture du site partenaire…";
        popup.document.body.innerHTML = '<p style="font:600 15px system-ui;color:#475569;text-align:center;margin-top:30vh">Ouverture du site partenaire…</p>';
    } catch {
        // Fenêtre restée sur un autre site : elle est simplement redirigée.
    }
    affiliate(url).then((target) => {
        if (!popup.closed) popup.location.replace(target);
    });
    popup.focus();
    const timer = setInterval(() => {
        if (popup.closed) {
            clearInterval(timer);
            onClosed?.();
        }
    }, 700);
    return popup;
}

const iso = (date) => (date ? date.slice(0, 10) : "");
const cityOf = (place) => (place || "").split(",")[0].trim();

// Kiwi.com n'est pas pris en charge par l'API de liens : format de lien affilié Travelpayouts dédié.
// Lien personnalisé Kiwi (campagne 111, promo 3791) : conserve le trajet et la date, contrairement au lien de page d'accueil.
const kiwiLink = (url, marker, project) =>
    marker
        ? `https://tp.media/click?${new URLSearchParams({ campaign_id: "111", promo_id: "3791", shmarker: marker, ...(project ? { trs: project } : {}), source_type: "customlink", type: "click", custom_url: url })}`
        : url;

/** Comparateurs de vols : recherche pré-remplie (aéroports IATA, date, passagers). */
export function flightPartnerLinks({ origin, destination, date, returnDate, passengers = 1, marker, project }) {
    if (!origin || !destination || !date) return [];
    const [y, m, d] = iso(date).split("-");
    const back = returnDate ? iso(returnDate).split("-") : null;
    const aviasales = `${origin}${d}${m}${destination}${back ? back[2] + back[1] : ""}${passengers}`;

    return [
        { key: "aviasales", label: "Aviasales", color: "bg-orange-500 text-white", url: `https://www.aviasales.com/search/${aviasales}${marker ? `?marker=${encodeURIComponent(marker)}` : ""}` },
        { key: "kiwi", label: "Kiwi.com", color: "bg-teal-500 text-white", url: kiwiLink(`https://www.kiwi.com/deep?${new URLSearchParams({ from: origin, to: destination, departure: iso(date), ...(returnDate ? { return: iso(returnDate) } : {}), adults: String(passengers) })}`, marker, project) },
        { key: "skyscanner", label: "Skyscanner", color: "bg-sky-600 text-white", url: `https://www.skyscanner.fr/transport/vols/${origin.toLowerCase()}/${destination.toLowerCase()}/${y.slice(2)}${m}${d}/${back ? `${back[0].slice(2)}${back[1]}${back[2]}/` : ""}?adultsv2=${passengers}` },
        { key: "google", label: "Google Vols", color: "bg-white text-slate-800 ring-1 ring-slate-200", url: `https://www.google.com/travel/flights?hl=fr&q=${encodeURIComponent(`Vols de ${origin} à ${destination} le ${iso(date)}${returnDate ? ` retour le ${iso(returnDate)}` : ""}`)}` },
    ];
}

/** Trains, bus et covoiturage : villes en clair, date, voyageurs. */
export function groundPartnerLinks({ from, to, date, passengers = 1 }) {
    const departure = cityOf(from);
    const arrival = cityOf(to);
    if (!departure || !arrival) return [];

    return [
        {
            key: "omio",
            label: "Omio",
            hint: "Train, bus, ferry · toute l’Europe",
            color: "bg-indigo-600 text-white",
            // Format de lien documenté par Omio pour ses affiliés (converti en lien affilié par Travelpayouts Drive).
            url: `https://www.omio.com/links/626fa8a9-f982-43d0-ace9-9a13f6b14612?${new URLSearchParams({ departurePosTerm: departure, arrivalPosTerm: arrival, ...(date ? { departureDate: iso(date) } : {}) })}`,
        },
        { key: "trainline", label: "Trainline", hint: "Trains France et Europe", color: "bg-emerald-500 text-white", url: "https://www.thetrainline.com/fr" },
        {
            key: "blablacar",
            label: "BlaBlaCar",
            hint: "Covoiturage et bus",
            color: "bg-sky-500 text-white",
            url: `https://www.blablacar.fr/search?${new URLSearchParams({ fn: departure, tn: arrival, ...(date ? { db: iso(date) } : {}), seats: String(passengers) })}`,
        },
        { key: "flixbus", label: "FlixBus", hint: "Bus longue distance", color: "bg-lime-500 text-slate-900", url: "https://www.flixbus.fr/" },
    ];
}
