import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, Download, Image as ImageIcon, ImagePlus, LoaderCircle, Trash2, UploadCloud, X } from "lucide-react";
import { useTripPermissions } from "@/Contexts/TripPermissionsContext";

const MAX_SIZE = 10 * 1024 * 1024;

function Lightbox({ photos, index, onClose, onNavigate, onDelete, canEdit }) {
    const photo = photos[index];

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowRight") onNavigate(1);
            if (event.key === "ArrowLeft") onNavigate(-1);
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [onClose, onNavigate]);

    if (!photo) return null;

    return (
        <div className="fixed inset-0 z-[120] flex flex-col bg-slate-950/95" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div className="flex items-center justify-between px-4 py-3 text-white">
                <span className="text-sm font-semibold text-white/70">{index + 1} / {photos.length}</span>
                <div className="flex items-center gap-1">
                    <a href={photo.url} download className="rounded-xl p-2 text-white/80 hover:bg-white/10" title="Télécharger"><Download className="h-5 w-5" /></a>
                    {canEdit && <button onClick={() => onDelete(photo)} className="rounded-xl p-2 text-white/80 hover:bg-rose-500/30 hover:text-rose-300" title="Supprimer"><Trash2 className="h-5 w-5" /></button>}
                    <button onClick={onClose} className="rounded-xl p-2 text-white/80 hover:bg-white/10" title="Fermer"><X className="h-6 w-6" /></button>
                </div>
            </div>
            <div className="relative flex flex-1 items-center justify-center px-4 pb-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
                {photos.length > 1 && (
                    <button onClick={() => onNavigate(-1)} className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Précédente"><ChevronLeft className="h-6 w-6" /></button>
                )}
                <figure className="max-h-full max-w-5xl">
                    <img src={photo.url} alt={photo.caption || "Photo du voyage"} className="max-h-[78vh] rounded-2xl object-contain shadow-2xl" />
                    {photo.caption && <figcaption className="mt-3 text-center text-sm text-white/80">{photo.caption}</figcaption>}
                </figure>
                {photos.length > 1 && (
                    <button onClick={() => onNavigate(1)} className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Suivante"><ChevronRight className="h-6 w-6" /></button>
                )}
            </div>
        </div>
    );
}

export default function TripPhotos({ trip }) {
    const { canEdit } = useTripPermissions();
    const [photos, setPhotos] = useState(trip.photos || []);
    const [caption, setCaption] = useState("");
    const [queue, setQueue] = useState([]);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState("");
    const [viewing, setViewing] = useState(null);
    const fileInput = useRef(null);

    const uploadFiles = async (fileList) => {
        const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
        if (!files.length) {
            setError("Choisissez des fichiers image (JPG, PNG, WebP, GIF).");
            return;
        }
        setError("");
        const tooBig = files.filter((file) => file.size > MAX_SIZE);
        if (tooBig.length) setError(`${tooBig.length} photo(s) dépassent 10 Mo et n’ont pas été envoyées.`);
        const accepted = files.filter((file) => file.size <= MAX_SIZE);
        setQueue(accepted.map((file) => ({ name: file.name, progress: 0 })));

        // Envoi une par une : progression lisible et pas de surcharge du serveur.
        for (const [position, file] of accepted.entries()) {
            const form = new FormData();
            form.append("photo", file);
            if (caption) form.append("caption", caption);
            try {
                const response = await axios.post(route("trips.photos.store", trip.id), form, {
                    onUploadProgress: (event) => setQueue((current) => current.map((item, index) => (index === position ? { ...item, progress: Math.round((event.loaded / (event.total || 1)) * 100) } : item))),
                });
                if (response.data.photo) setPhotos((current) => [response.data.photo, ...current]);
            } catch (uploadError) {
                setError(uploadError.response?.data?.message || `Impossible d’ajouter « ${file.name} ».`);
            }
        }
        setQueue([]);
        setCaption("");
        if (fileInput.current) fileInput.current.value = "";
    };

    const remove = async (photo) => {
        if (!confirm("Supprimer cette photo ?")) return;
        setError("");
        try {
            await axios.delete(route("trips.photos.destroy", photo.id));
            setPhotos((current) => current.filter((item) => item.id !== photo.id));
            setViewing(null);
        } catch (deleteError) {
            setError(deleteError.response?.data?.message || "Impossible de supprimer la photo.");
        }
    };

    const navigate = useCallback((step) => setViewing((current) => (current === null ? null : (current + step + photos.length) % photos.length)), [photos.length]);
    const close = useCallback(() => setViewing(null), []);
    const uploading = queue.length > 0;

    return (
        <div className="space-y-6">
            {viewing !== null && <Lightbox photos={photos} index={viewing} onClose={close} onNavigate={navigate} onDelete={remove} canEdit={canEdit} />}

            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 p-6 text-white shadow-xl shadow-rose-500/20">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-2xl font-black"><ImageIcon className="h-6 w-6" /> Album du voyage</h2>
                        <p className="mt-1 text-sm text-rose-50">
                            {photos.length ? `${photos.length} souvenir${photos.length > 1 ? "s" : ""} partagé${photos.length > 1 ? "s" : ""} avec les membres du voyage.` : "Partagez vos plus beaux moments avec les autres voyageurs."}
                        </p>
                    </div>
                    {canEdit && (
                        <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-rose-600 shadow-lg hover:bg-rose-50 disabled:opacity-60">
                            <ImagePlus className="h-4 w-4" /> Ajouter des photos
                        </button>
                    )}
                </div>
            </section>

            {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}

            {canEdit && (
                <div
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        uploadFiles(event.dataTransfer.files);
                    }}
                    className={`rounded-3xl border-2 border-dashed p-6 text-center transition ${dragging ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30" : "border-rose-200 bg-white dark:border-rose-900/50 dark:bg-slate-800"}`}
                >
                    <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadFiles(event.target.files)} />
                    {uploading ? (
                        <div className="mx-auto max-w-md space-y-2 text-left">
                            {queue.map((item, index) => (
                                <div key={index}>
                                    <p className="flex items-center gap-2 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                                        <LoaderCircle className={`h-3.5 w-3.5 ${item.progress < 100 ? "animate-spin" : ""} text-rose-500`} /> {item.name}
                                    </p>
                                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-rose-100 dark:bg-rose-950"><div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all" style={{ width: `${item.progress}%` }} /></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <UploadCloud className="mx-auto h-10 w-10 text-rose-400" />
                            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">Glissez vos photos ici</p>
                            <p className="text-xs text-slate-500">
                                ou <button type="button" onClick={() => fileInput.current?.click()} className="font-semibold text-rose-600 underline">parcourez vos fichiers</button> · plusieurs à la fois · 10 Mo max par photo
                            </p>
                            <input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={191} placeholder="Légende commune (facultatif)" className="mx-auto mt-4 block w-full max-w-sm rounded-xl border-slate-200 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                        </>
                    )}
                </div>
            )}

            {photos.length ? (
                <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
                    {photos.map((photo, index) => (
                        <figure key={photo.id} className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-slate-100 shadow-sm dark:bg-slate-900">
                            <button type="button" onClick={() => setViewing(index)} className="block w-full">
                                <img src={photo.url} alt={photo.caption || "Photo du voyage"} loading="lazy" className="w-full object-cover transition duration-300 group-hover:scale-105" />
                            </button>
                            {photo.caption && (
                                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pb-2 pt-8 text-xs font-medium text-white">{photo.caption}</figcaption>
                            )}
                            {canEdit && (
                                <button onClick={() => remove(photo)} className="absolute right-2 top-2 rounded-xl bg-white/90 p-2 text-rose-600 opacity-0 shadow transition group-hover:opacity-100" title="Supprimer">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </figure>
                    ))}
                </div>
            ) : (
                !canEdit && <p className="rounded-3xl border-2 border-dashed border-rose-200 p-10 text-center text-sm text-slate-400 dark:border-rose-900/50">Aucune photo pour le moment.</p>
            )}
        </div>
    );
}
