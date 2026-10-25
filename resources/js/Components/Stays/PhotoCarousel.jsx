import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Images, X } from "lucide-react";

/**
 * Galerie de photos d'un logement : grande image, miniatures, glisser au doigt,
 * flèches du clavier et affichage plein écran.
 */
export default function PhotoCarousel({ photos, fallback, className = "h-72 sm:h-96" }) {
    const [index, setIndex] = useState(0);
    const [fullscreen, setFullscreen] = useState(false);
    const [failed, setFailed] = useState(() => new Set());
    const touch = useRef(null);
    const strip = useRef(null);
    const list = photos.filter((photo) => !failed.has(photo.url));
    const count = list.length;
    const current = list[Math.min(index, count - 1)];

    const go = (step) => setIndex((value) => (value + step + count) % count);

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === "ArrowRight") go(1);
            if (event.key === "ArrowLeft") go(-1);
            if (event.key === "Escape" && fullscreen) {
                event.stopPropagation();
                setFullscreen(false);
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [count, fullscreen]);

    // La miniature active reste visible dans le bandeau.
    useEffect(() => {
        strip.current?.children[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }, [index]);

    if (!count) return fallback;

    const swipe = {
        onTouchStart: (event) => (touch.current = event.touches[0].clientX),
        onTouchEnd: (event) => {
            if (touch.current === null) return;
            const delta = event.changedTouches[0].clientX - touch.current;
            if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
            touch.current = null;
        },
    };
    const markFailed = (url) => setFailed((set) => new Set(set).add(url));

    const Arrows = ({ big }) =>
        count > 1 && (
            <>
                <button type="button" onClick={() => go(-1)} aria-label="Photo précédente" className={`absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 text-slate-800 shadow-lg transition hover:bg-white ${big ? "p-3" : "p-2"}`}><ChevronLeft className="h-5 w-5" /></button>
                <button type="button" onClick={() => go(1)} aria-label="Photo suivante" className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 text-slate-800 shadow-lg transition hover:bg-white ${big ? "p-3" : "p-2"}`}><ChevronRight className="h-5 w-5" /></button>
            </>
        );

    return (
        <>
            <div className="bg-slate-950">
                <div className={`group relative ${className} select-none overflow-hidden`} {...swipe}>
                    <img key={current.url} src={current.url} alt={current.caption || ""} onError={() => markFailed(current.url)} onClick={() => setFullscreen(true)} className="h-full w-full cursor-zoom-in object-cover" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
                    <Arrows />
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                        <Images className="h-3.5 w-3.5" /> {Math.min(index, count - 1) + 1} / {count}
                    </span>
                    <button type="button" onClick={() => setFullscreen(true)} className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur hover:bg-black/75">
                        <Expand className="h-3.5 w-3.5" /> Plein écran
                    </button>
                </div>
                {count > 1 && (
                    <div ref={strip} className="flex gap-1.5 overflow-x-auto p-2">
                        {list.map((photo, position) => (
                            <button key={photo.url} type="button" onClick={() => setIndex(position)} className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition ${position === index ? "ring-white" : "opacity-60 ring-transparent hover:opacity-100"}`}>
                                <img src={photo.url} alt="" loading="lazy" onError={() => markFailed(photo.url)} className="h-full w-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {fullscreen && (
                <div className="fixed inset-0 z-[150] flex flex-col bg-black/95" onClick={(event) => event.target === event.currentTarget && setFullscreen(false)}>
                    <div className="flex items-center justify-between p-4 text-sm text-white/80">
                        <span>{Math.min(index, count - 1) + 1} / {count}{current.caption ? ` · ${current.caption}` : ""}</span>
                        <button onClick={() => setFullscreen(false)} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Fermer"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="relative flex min-h-0 flex-1 items-center justify-center px-4" {...swipe}>
                        <img src={current.url} alt={current.caption || ""} className="max-h-full max-w-full rounded-lg object-contain" />
                        <Arrows big />
                    </div>
                    <div className="flex justify-center gap-1.5 overflow-x-auto p-3">
                        {list.map((photo, position) => (
                            <button key={photo.url} type="button" onClick={() => setIndex(position)} className={`h-12 w-16 shrink-0 overflow-hidden rounded ring-2 ${position === index ? "ring-white" : "opacity-50 ring-transparent"}`}>
                                <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
