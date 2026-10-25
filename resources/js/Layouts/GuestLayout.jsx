import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { Compass, Headset, LogIn, Luggage, ShoppingCart, Ticket, User as UserIcon } from "lucide-react";
import BrandMark from "@/Components/BrandMark";
import CookieConsent from "@/Components/CookieConsent";
import ConfirmHost from "@/Components/ConfirmDialog";
import SupportWidget from "@/Components/Support/SupportWidget";
import { openCookieSettings } from "@/Utils/consent";

export default function GuestLayout({ children }) {
    const { auth, cart, legal, commerce } = usePage().props;
    const user = auth?.user;
    const cartCount = cart?.count || 0;

    const userAvatar =
        user?.avatar || user?.profile_photo_url || user?.google_avatar;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased">
            <header className="bg-slate-900 text-white py-4 px-6 sticky top-0 z-40 shadow-sm print:hidden">
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-fuchsia-500" />
                <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
                    <Link
                        href={route("trips.index")}
                        className="flex items-center gap-2 font-bold text-lg tracking-tight"
                    >
                        <BrandMark />
                        <span>
                            Lova<span className="bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text text-transparent">Trip</span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-3 sm:gap-6">
                        {auth?.support_agent && (
                            <Link href={route("admin.support.index")} className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-fuchsia-300 hover:text-white transition">
                                <Headset className="w-3.5 h-3.5" />
                                Assistance
                            </Link>
                        )}
                        {user && (
                            <Link
                                href={route("flights.orders.index")}
                                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
                            >
                                <Ticket className="w-3.5 h-3.5 text-sky-300" />
                                Mes réservations
                            </Link>
                        )}
                        <Link
                            href={route("explore.index")}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
                        >
                            <Compass className="w-3.5 h-3.5 text-emerald-300" />
                            Parcourir
                        </Link>
                        <Link
                            href={route("trips.index")}
                            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
                        >
                            <Luggage className="w-3.5 h-3.5 text-amber-300" />
                            Mes voyages
                        </Link>

                        {/* Panier et réservations uniquement en vente directe (sinon tout se paie chez les partenaires). */}
                        {user && commerce?.direct_booking && (
                            <>
                                <Link
                                    href={route("flights.cart.index")}
                                    title="Mon panier"
                                    className="relative flex items-center gap-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    <span className="hidden md:inline">Panier</span>
                                    {cartCount > 0 && (
                                        <span className="absolute -top-2 -right-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-1 text-[10px] font-black text-white shadow ring-2 ring-slate-900">
                                            {cartCount}
                                        </span>
                                    )}
                                </Link>
                            </>
                        )}

                        {/* Affichage de l'état de connexion / Session */}
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-800 text-xs">
                            {user ? (
                                <Link
                                    href={route("profile.edit")}
                                    className="flex items-center gap-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-xl group transition"
                                    title="Accéder à mon profil"
                                >
                                    {userAvatar ? (
                                        <img
                                            src={userAvatar}
                                            alt={user.name}
                                            className="w-7 h-7 rounded-full object-cover border border-slate-600 group-hover:border-indigo-500 transition"
                                        />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-[10px] group-hover:border-indigo-500 transition">
                                            {user.name ? (
                                                user.name
                                                    .charAt(0)
                                                    .toUpperCase()
                                            ) : (
                                                <UserIcon className="w-3.5 h-3.5" />
                                            )}
                                        </div>
                                    )}
                                    <span className="hidden sm:inline text-slate-300 group-hover:text-white transition font-medium">
                                        {user.name || user.email}
                                    </span>
                                </Link>
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

            <footer className="mt-16 border-t border-slate-200 bg-white/70 px-6 py-8 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 print:hidden">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
                    <p>© {new Date().getFullYear()} {legal?.company || "LovaTrip"} · {commerce?.direct_booking ? "Intermédiaire de réservation de voyages" : "Planification de voyage"}</p>
                    <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-semibold">
                        <Link href={route("legal.notice")} className="hover:text-indigo-600">Mentions légales</Link>
                        <Link href={route("legal.terms")} className="hover:text-indigo-600">Conditions générales</Link>
                        <Link href={route("legal.privacy")} className="hover:text-indigo-600">Confidentialité et cookies</Link>
                        <button type="button" onClick={openCookieSettings} className="font-semibold hover:text-indigo-600">Gérer mes cookies</button>
                    </nav>
                </div>
            </footer>

            <CookieConsent />
            <ConfirmHost />
            <SupportWidget />
        </div>
    );
}
