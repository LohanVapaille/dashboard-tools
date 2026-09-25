import React from "react";
import { Head, Link, router } from "@inertiajs/react";
import GuestLayout from "@/Layouts/GuestLayout";
import { MapPin, UserPlus, LogIn, Eye } from "lucide-react";

export default function InviteShow({ trip, token, auth_user }) {
    const joinAsGuest = () => {
        router.post(route("trips.invite.guest", token));
    };

    const joinAsUser = () => {
        router.post(route("trips.invite.join", token));
    };

    return (
        <GuestLayout>
            <Head title={`Rejoindre ${trip.title}`} />

            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center space-y-6">
                    <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                        <MapPin className="w-7 h-7" />
                    </div>

                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white">
                            {trip.title}
                        </h1>
                        {trip.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {trip.description}
                            </p>
                        )}
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-4">
                            Vous avez été invité(e) à rejoindre ce voyage.
                            Voulez-vous le rejoindre ?
                        </p>
                    </div>

                    <div className="space-y-3">
                        {auth_user ? (
                            <button
                                onClick={joinAsUser}
                                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-md transition"
                            >
                                <LogIn className="w-4 h-4" />
                                Rejoindre en tant que {auth_user.name}
                            </button>
                        ) : (
                            <>
                                <Link
                                    href={route("register", {
                                        redirect: route(
                                            "trips.invite.show",
                                            token,
                                        ),
                                    })}
                                    className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-md transition"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Créer un compte
                                </Link>

                                <Link
                                    href={route("login", {
                                        redirect: route(
                                            "trips.invite.show",
                                            token,
                                        ),
                                    })}
                                    className="w-full inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-5 py-3 rounded-xl transition"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Se connecter
                                </Link>
                            </>
                        )}

                        <button
                            onClick={joinAsGuest}
                            className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-5 py-2 transition"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            Continuer en tant qu'invité (lecture seule)
                        </button>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
