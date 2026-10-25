import { useState } from "react";
import axios from "axios";
import { router, usePage } from "@inertiajs/react";
import { Heart } from "lucide-react";
import { confirmDialog, notify } from "@/Components/ConfirmDialog";

/** Cœur « favori » d'un voyage publié. Sans compte : invitation à se connecter. */
export default function FavoriteButton({ tripId, favorited: initial, onChange, variant = "overlay" }) {
    const signedIn = Boolean(usePage().props.auth?.user);
    const [favorited, setFavorited] = useState(Boolean(initial));
    const [pending, setPending] = useState(false);

    const toggle = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!signedIn) {
            if (await confirmDialog({ title: "Gardez ce voyage en favori", message: "Connectez-vous ou créez un compte gratuit pour retrouver vos voyages favoris dans votre compte.", confirmLabel: "Se connecter", tone: "info" })) {
                router.visit(route("login"));
            }
            return;
        }
        if (pending) return;
        const next = !favorited;
        setFavorited(next);
        setPending(true);
        try {
            const { data } = await axios.post(route("explore.favorite", tripId));
            setFavorited(data.favorited);
            onChange?.(data.favorited);
        } catch (error) {
            setFavorited(!next);
            notify({ title: "Favori non enregistré", message: error.response?.data?.message || "Réessayez dans un instant.", tone: "warning" });
        } finally {
            setPending(false);
        }
    };

    const label = favorited ? "Retirer des favoris" : "Ajouter aux favoris";

    if (variant === "solid") {
        return (
            <button type="button" onClick={toggle} aria-pressed={favorited} title={label} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg transition ${favorited ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-white/15 text-white backdrop-blur hover:bg-white/25"}`}>
                <Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} /> {favorited ? "En favori" : "Favori"}
            </button>
        );
    }

    return (
        <button type="button" onClick={toggle} aria-pressed={favorited} title={label} aria-label={label} className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg backdrop-blur transition active:scale-90 ${favorited ? "bg-white text-rose-500" : "bg-slate-950/30 text-white hover:bg-slate-950/50"}`}>
            <Heart className={`h-[18px] w-[18px] ${favorited ? "fill-current" : ""}`} />
        </button>
    );
}
