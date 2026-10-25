import { useEffect, useRef, useState } from "react";
import { Link, router } from "@inertiajs/react";
import { Check, Compass, EyeOff, Globe, ImagePlus, LoaderCircle, RefreshCw, Trash2, X } from "lucide-react";
import { confirmDialog } from "@/Components/ConfirmDialog";

const SHARED = ["Titre, description et étapes", "Programme jour par jour et activités", "Trajets (sans références ni sièges)", "Budget agrégé par poste", "L’image d’aperçu, si vous en ajoutez une","Votre prénom et l’initiale de votre nom"];
const PRIVATE = ["Photos de l’album", "Participants et invitations", "Dépenses détaillées et qui doit quoi", "Notes, pense-bêtes et réservations", "Votre ville de départ"];

/** Image d'aperçu (format rectangle des cartes « Parcourir ») : disponible une fois le voyage publié. */
function CoverPicker({ trip }) {
    const input = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const cover = trip.publication?.cover;

    const upload = (file) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setError("L’image ne doit pas dépasser 10 Mo.");
            return;
        }
        router.post(route("trips.publication.cover", trip.id), { cover: file }, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => { setUploading(true); setError(""); },
            onError: (errors) => setError(errors.cover || Object.values(errors)[0] || "L’image n’a pas pu être envoyée."),
            onFinish: () => {
                setUploading(false);
                if (input.current) input.current.value = "";
            },
        });
    };

    const remove = () => router.delete(route("trips.publication.cover.destroy", trip.id), { preserveScroll: true });

    return (
        <section className="space-y-2">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Image d’aperçu</p>
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 ring-1 ring-slate-200 dark:ring-slate-700">
                {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <p className="absolute inset-x-4 bottom-3 truncate text-sm font-black text-white drop-shadow">{trip.title}</p>
                {uploading && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40"><LoaderCircle className="h-8 w-8 animate-spin text-white" /></div>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => upload(event.target.files[0])} />
                <button type="button" onClick={() => input.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900">
                    <ImagePlus className="h-4 w-4" /> {cover ? "Changer l’image" : "Ajouter une image"}
                </button>
                {cover && (
                    <button type="button" onClick={remove} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                        <Trash2 className="h-4 w-4" /> Retirer
                    </button>
                )}
                <span className="text-[11px] text-slate-400">Recadrée en 16:10 · données GPS de la photo supprimées</span>
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
        </section>
    );
}

/** Publier un voyage sur la page « Parcourir » (ou mettre à jour / retirer la publication). */
export default function PublishTripModal({ trip, onClose }) {
    const published = Boolean(trip.publication);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const onKey = (event) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const options = {
        preserveScroll: true,
        onStart: () => { setProcessing(true); setError(""); },
        onFinish: () => setProcessing(false),
        onError: (errors) => setError(Object.values(errors)[0] || "La publication a échoué."),
        onSuccess: () => onClose(),
    };

    const publish = () => router.post(route("trips.publication.store", trip.id), {}, options);
    const unpublish = async () => {
        if (!(await confirmDialog({ title: "Retirer ce voyage de la page Parcourir ?", message: "Il redeviendra visible uniquement par vous et vos participants. Les copies déjà faites par d’autres voyageurs ne sont pas touchées.", confirmLabel: "Retirer", tone: "warning" }))) return;
        router.delete(route("trips.publication.destroy", trip.id), options);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
                <header className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 px-6 pb-6 pt-5 text-white">
                    <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Fermer"><X className="h-4 w-4" /></button>
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-50"><Globe className="h-3.5 w-3.5" /> Publier sur le site</p>
                    <h3 className="mt-1 pr-10 text-xl font-black">{trip.title}</h3>
                    <p className="mt-1 text-sm text-emerald-50">
                        {published ? "Ce voyage est visible sur la page Parcourir, en lecture seule." : "Inspirez d’autres voyageurs : ils pourront consulter votre itinéraire et le reprendre à leurs propres dates."}
                    </p>
                </header>

                <div className="space-y-5 p-6">
                    {published ? (
                        <CoverPicker trip={trip} />
                    ) : (
                        <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <ImagePlus className="h-4 w-4 shrink-0" /> Une fois publié, vous pourrez ajouter une image d’aperçu pour votre carte.
                        </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <p className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Visible</p>
                            <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
                                {SHARED.map((item) => <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Reste privé</p>
                            <ul className="space-y-1.5 text-sm text-slate-500">
                                {PRIVATE.map((item) => <li key={item} className="flex items-start gap-2"><EyeOff className="mt-0.5 h-4 w-4 shrink-0" /> {item}</li>)}
                            </ul>
                        </div>
                    </div>

                    {published && <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">L’aperçu (étapes, budget) est figé au moment de la publication : mettez-le à jour après avoir modifié votre voyage. {trip.publication.copies > 0 && <strong>{trip.publication.copies} voyageur{trip.publication.copies > 1 ? "s l’ont" : " l’a"} déjà repris.</strong>}</p>}
                    {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {published ? (
                            <>
                                <button onClick={unpublish} disabled={processing} className="mr-auto rounded-xl px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/40">Retirer la publication</button>
                                <Link href={route("explore.index")} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"><Compass className="h-4 w-4" /> Voir dans Parcourir</Link>
                                <button onClick={publish} disabled={processing} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                                    {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Mettre à jour
                                </button>
                            </>
                        ) : (
                            <button onClick={publish} disabled={processing} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50 sm:w-auto">
                                {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Publier le voyage
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
