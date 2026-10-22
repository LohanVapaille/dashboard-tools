// Choix de l'utilisateur sur les cookies non essentiels, conservé dans un cookie
// propriétaire (il fait lui-même partie des cookies strictement nécessaires).
const COOKIE = "tp_consent";
const VERSION = 1;
export const CONSENT_EVENT = "travelplanner:consent-changed";
export const OPEN_SETTINGS_EVENT = "travelplanner:open-cookie-settings";

export function readConsent() {
    try {
        const raw = document.cookie.split("; ").find((part) => part.startsWith(`${COOKIE}=`));
        if (!raw) return null;
        const value = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1)));
        return value?.v === VERSION ? value : null;
    } catch {
        return null;
    }
}

export function saveConsent(choices, days = 182) {
    const value = { v: VERSION, affiliate: Boolean(choices.affiliate), date: new Date().toISOString() };
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${days * 86400}; Path=/; SameSite=Lax${secure}`;
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
    return value;
}

export function openCookieSettings() {
    window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
