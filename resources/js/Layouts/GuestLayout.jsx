import React from "react";
import { Link } from "@inertiajs/react";
import { Compass } from "lucide-react";

export default function GuestLayout({ children }) {
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
                    <Link
                        href={route("trips.index")}
                        className="text-xs font-semibold text-slate-300 hover:text-white transition"
                    >
                        Mes voyages
                    </Link>
                </div>
            </header>

            <main>{children}</main>
        </div>
    );
}
