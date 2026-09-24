import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { Compass, LogIn, LogOut } from "lucide-react";

export default function GuestLayout({ children }) {
    const { auth } = usePage().props;
    const user = auth?.user;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased">
            <header className="bg-slate-900 border-b border-slate-800 text-white py-4 px-6 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link
                        href={route("trips.index")}
                        className="flex items-center gap-2 font-bold text-lg tracking-tight"
                    >
                        <div className="p-1.5 bg-indigo-600 rounded-lg">
                            <Compass className="w-5 h-5 text-white" />
                        </div>
                        <span>TravelPlanner</span>
                    </Link>

                    <div className="flex items-center gap-6">
                        <Link
                            href={route("trips.index")}
                            className="text-xs font-semibold text-slate-300 hover:text-white transition"
                        >
                            Mes voyages
                        </Link>

                        {/* Affichage de l'état de connexion / Session */}
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-800 text-xs">
                            {user ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-300">
                                        Connecté :{" "}
                                        <strong className="text-white">
                                            {user.name || user.email}
                                        </strong>
                                    </span>
                                    <Link
                                        href={route("logout")}
                                        method="post"
                                        as="button"
                                        className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2.5 py-1.5 rounded-lg font-medium transition"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        Déconnexion
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-400">
                                        Invité
                                    </span>
                                    <Link
                                        href={route("login")}
                                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-semibold shadow-sm transition"
                                    >
                                        <LogIn className="w-3.5 h-3.5" />
                                        Se connecter
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main>{children}</main>
        </div>
    );
}
