import { useState } from "react";
import axios from "axios";
import { ImagePlus, Trash2 } from "lucide-react";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

export default function TripPhotos({ trip }) {
    const { canEdit } = useTripPermissions();
    const [photos, setPhotos] = useState(trip.photos || []);
    const [file, setFile] = useState(null);
    const [caption, setCaption] = useState("");
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");

    const upload = async (event) => {
        event.preventDefault();
        if (!file) return;
        setProcessing(true);
        setError("");
        const form = new FormData();
        form.append("photo", file);
        form.append("caption", caption);
        try {
            const response = await axios.post(route("trips.photos.store", trip.id), form);
            if (response.data.photo) setPhotos([response.data.photo, ...photos]);
            else window.location.reload();
            setFile(null);
            setCaption("");
            event.target.reset();
        } catch (uploadError) {
            setError(uploadError.response?.data?.message || "Impossible d'ajouter la photo.");
        } finally {
            setProcessing(false);
        }
    };

    const remove = async (photo) => {
        if (!confirm("Supprimer cette photo ?")) return;
        setError("");
        try {
            await axios.delete(route("trips.photos.destroy", photo.id));
            setPhotos(photos.filter((item) => item.id !== photo.id));
        } catch (deleteError) {
            setError(deleteError.response?.data?.message || "Impossible de supprimer la photo.");
        }
    };

    return (
        <div className="space-y-5">
            {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                </p>
            )}
            {canEdit && (
                <form onSubmit={upload} className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            Ajouter une photo
                            <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-1 block w-full text-xs" required />
                        </label>
                        <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Légende (facultatif)" className="rounded-lg border-slate-300 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                        <button disabled={processing} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                            <ImagePlus className="h-4 w-4" /> Ajouter
                        </button>
                    </div>
                </form>
            )}
            {photos.length ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {photos.map((photo) => (
                        <figure key={photo.id} className="group relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                            <img src={photo.url} alt={photo.caption || "Photo du voyage"} className="aspect-square w-full object-cover" />
                            {photo.caption && <figcaption className="p-2 text-xs text-slate-600 dark:text-slate-300">{photo.caption}</figcaption>}
                            {canEdit && <button onClick={() => remove(photo)} className="absolute right-2 top-2 rounded-lg bg-red-600 p-2 text-white opacity-0 transition group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>}
                        </figure>
                    ))}
                </div>
            ) : <p className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400 dark:border-slate-700">Aucune photo pour le moment.</p>}
        </div>
    );
}
