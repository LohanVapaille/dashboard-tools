import { useEffect } from "react";
import { X } from "lucide-react";

/** Fenêtre des activités : centrée sur ordinateur, ouverte depuis le bas sur téléphone. */
export default function ActivitySheet({ title, subtitle, Icon, gradient = "from-violet-500 to-purple-600", onClose, children, footer }) {
    useEffect(() => {
        const onKey = (event) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
                <header className={`relative flex items-start gap-3 bg-gradient-to-br px-5 pb-5 pt-4 text-white sm:px-6 ${gradient}`}>
                    <span className="mx-auto mb-1 block h-1 w-10 rounded-full bg-white/40 sm:hidden" style={{ position: "absolute", left: 0, right: 0, top: 6 }} />
                    {Icon && <span className="mt-2 rounded-2xl bg-white/20 p-2.5 backdrop-blur"><Icon className="h-6 w-6" /></span>}
                    <div className="mt-2 min-w-0 flex-1">
                        <h3 className="text-xl font-black leading-tight">{title}</h3>
                        {subtitle && <p className="mt-1 text-sm text-white/85">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="mt-1 rounded-full bg-white/15 p-2 transition hover:bg-white/25" aria-label="Fermer"><X className="h-4 w-4" /></button>
                </header>
                <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
                {footer && <footer className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60 sm:px-6">{footer}</footer>}
            </div>
        </div>
    );
}
