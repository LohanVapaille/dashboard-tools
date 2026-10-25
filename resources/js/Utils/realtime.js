// Temps réel (Laravel Reverb via Echo). Facultatif : sans serveur WebSocket joignable,
// les écrans du chat se rafraîchissent périodiquement à la place.
import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echo = null;

export function realtime() {
    if (echo || typeof window === "undefined") return echo;
    const key = import.meta.env.VITE_REVERB_APP_KEY;
    if (!key) return null;
    try {
        window.Pusher = Pusher;
        echo = new Echo({
            broadcaster: "reverb",
            key,
            wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
            wsPort: Number(import.meta.env.VITE_REVERB_PORT || 80),
            wssPort: Number(import.meta.env.VITE_REVERB_PORT || 443),
            forceTLS: (import.meta.env.VITE_REVERB_SCHEME || "https") === "https",
            enabledTransports: ["ws", "wss"],
        });
    } catch {
        echo = null;
    }
    return echo;
}

/** Vrai quand la connexion WebSocket est établie. */
export const isLive = () => realtime()?.connector?.pusher?.connection?.state === "connected";

/** Écoute un événement ; renvoie la fonction de désabonnement. */
export function listen(channelName, event, callback, { private: isPrivate = false } = {}) {
    const client = realtime();
    if (!client) return () => {};
    try {
        const channel = isPrivate ? client.private(channelName) : client.channel(channelName);
        channel.listen(`.${event}`, callback);
        return () => client.leave(channelName);
    } catch {
        return () => {};
    }
}
