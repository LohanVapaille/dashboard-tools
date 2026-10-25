import { useEffect, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { Headset, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import BrandMark from "@/Components/BrandMark";
import AdminIcon from "@/Components/Admin/AdminIcon";
import ConfirmHost from "@/Components/ConfirmDialog";

function NavItem({ href, active, children }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
        >
            {children}
        </Link>
    );
}

/** Coque du back-office : menu latéral par groupes, messages flash, déconnexion. */
export default function AdminLayout({ title, actions, children }) {
    const { admin, flash, errors } = usePage().props;
    const [open, setOpen] = useState(false);
    const [notice, setNotice] = useState(null);
    const path = typeof window !== "undefined" ? window.location.pathname : "";

    useEffect(() => {
        if (flash?.status) setNotice({ tone: "success", text: flash.status });
        else if (flash?.error) setNotice({ tone: "error", text: flash.error });
    }, [flash?.status, flash?.error]);

    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), 5000);
        return () => clearTimeout(timer);
    }, [notice]);

    const isActive = (key) => path === `/admin/${key}` || path.startsWith(`/admin/${key}/`);

    const sidebar = (
        <nav className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-5">
            <Link href={route("admin.dashboard")} className="flex items-center gap-2 px-3 text-lg font-bold text-white">
                <BrandMark className="h-7 w-7" />
                Back-office
            </Link>
            <div className="space-y-0.5">
                <NavItem href={route("admin.dashboard")} active={path === "/admin" || path === "/admin/"}><LayoutDashboard className="h-4 w-4" /> Tableau de bord</NavItem>
                <NavItem href={route("admin.support.index")} active={path.startsWith("/admin/assistance")}><Headset className="h-4 w-4" /> Boîte d’assistance</NavItem>
            </div>
            {(admin?.nav || []).map((section) => (
                <div key={section.group}>
                    <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{section.group}</p>
                    <div className="space-y-0.5">
                        {section.items.map((item) => (
                            <NavItem key={item.key} href={route("admin.resources.index", item.key)} active={isActive(item.key)}>
                                <AdminIcon name={item.icon} /> {item.label}
                            </NavItem>
                        ))}
                    </div>
                </div>
            ))}
            <button onClick={() => router.post(route("admin.logout"))} className="mt-auto flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
                <LogOut className="h-4 w-4" /> Déconnexion
            </button>
        </nav>
    );

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
            <Head title={title ? `${title} · Back-office` : "Back-office"} />
            <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-900 lg:block">{sidebar}</aside>
            {open && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-slate-950/60" onClick={() => setOpen(false)} />
                    <aside className="relative h-full w-72 bg-slate-900">
                        <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:text-white" aria-label="Fermer le menu"><X className="h-5 w-5" /></button>
                        {sidebar}
                    </aside>
                </div>
            )}

            <div className="lg:pl-64">
                <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
                    <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button>
                    <h1 className="min-w-0 flex-1 truncate text-lg font-black">{title}</h1>
                    <div className="flex shrink-0 items-center gap-2">{actions}</div>
                </header>

                <main className="space-y-4 px-4 py-6 sm:px-6">
                    {notice && (
                        <p className={`rounded-xl px-4 py-3 text-sm font-medium ${notice.tone === "success" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
                            {notice.text}
                        </p>
                    )}
                    {Object.keys(errors || {}).length > 0 && (
                        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                            Le formulaire contient {Object.keys(errors).length} erreur{Object.keys(errors).length > 1 ? "s" : ""} : vérifiez les champs en rouge.
                        </p>
                    )}
                    {children}
                </main>
            </div>
            <ConfirmHost />
        </div>
    );
}
