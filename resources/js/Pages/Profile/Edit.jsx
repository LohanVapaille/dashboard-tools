import React from "react";
import GuestLayout from "@/Layouts/GuestLayout";
import { useForm, usePage } from "@inertiajs/react";
import { LogOut, Trash2, User, Lock, Mail, Camera } from "lucide-react";

export default ({ mustVerifyEmail, status }) => {
    const { auth } = usePage().props;
    const user = auth.user;

    // Formulaire de mise à jour des infos générales (Nom, Email, Avatar)
    const profileForm = useForm({
        name: user.name || "",
        email: user.email || "",
        avatar: user.avatar || "",
    });

    // Formulaire de mot de passe
    const passwordForm = useForm({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    // Formulaire de suppression de compte
    const deleteForm = useForm({
        password: "",
    });

    const submitProfile = (e) => {
        e.preventDefault();
        profileForm.patch(route("profile.update"));
    };

    const submitPassword = (e) => {
        e.preventDefault();
        passwordForm.put(route("password.update"), {
            onSuccess: () => passwordForm.reset(),
        });
    };

    const deleteAccount = (e) => {
        e.preventDefault();
        if (
            confirm(
                "Êtes-vous sûr de vouloir supprimer votre compte ? Tous vos voyages et données associées seront définitivement effacés.",
            )
        ) {
            deleteForm.delete(route("profile.destroy"));
        }
    };

    return (
        <GuestLayout>
            <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
                {/* En-tête de la page + Bouton Déconnexion */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                            Mon Profil
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Gérez vos informations personnelles et vos
                            paramètres de sécurité.
                        </p>
                    </div>

                    {/* BOUTON DÉCONNEXION DÉPLACÉ ICI */}
                    <a
                        href={route("logout")}
                        method="post"
                        as="button"
                        className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl text-xs font-semibold transition"
                    >
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                    </a>
                </div>

                {/* 1. Informations générales & Avatar */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" />{" "}
                        Informations du compte
                    </h3>

                    <form onSubmit={submitProfile} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Nom
                            </label>
                            <input
                                type="text"
                                value={profileForm.data.name}
                                onChange={(e) =>
                                    profileForm.setData("name", e.target.value)
                                }
                                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Adresse Email
                            </label>
                            <input
                                type="email"
                                value={profileForm.data.email}
                                onChange={(e) =>
                                    profileForm.setData("email", e.target.value)
                                }
                                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                URL de la photo de profil (Avatar)
                            </label>
                            <input
                                type="text"
                                value={profileForm.data.avatar}
                                onChange={(e) =>
                                    profileForm.setData(
                                        "avatar",
                                        e.target.value,
                                    )
                                }
                                placeholder="https://..."
                                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={profileForm.processing}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md"
                            >
                                Enregistrer les modifications
                            </button>
                        </div>
                    </form>
                </div>

                {/* 2. Modification du Mot de passe */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Lock className="w-4 h-4 text-indigo-500" /> Modifier le
                        mot de passe
                    </h3>

                    <form onSubmit={submitPassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Mot de passe actuel
                            </label>
                            <input
                                type="password"
                                value={passwordForm.data.current_password}
                                onChange={(e) =>
                                    passwordForm.setData(
                                        "current_password",
                                        e.target.value,
                                    )
                                }
                                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Nouveau mot de passe
                            </label>
                            <input
                                type="password"
                                value={passwordForm.data.password}
                                onChange={(e) =>
                                    passwordForm.setData(
                                        "password",
                                        e.target.value,
                                    )
                                }
                                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Confirmer le nouveau mot de passe
                            </label>
                            <input
                                type="password"
                                value={passwordForm.data.password_confirmation}
                                onChange={(e) =>
                                    passwordForm.setData(
                                        "password_confirmation",
                                        e.target.value,
                                    )
                                }
                                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={passwordForm.processing}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md"
                            >
                                Mettre à jour le mot de passe
                            </button>
                        </div>
                    </form>
                </div>

                {/* 3. Suppression du compte et des voyages associés */}
                <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 space-y-4">
                    <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Zone de danger :
                        Supprimer le compte
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        Une fois votre compte supprimé, toutes vos ressources,
                        vos voyages créés, ainsi que vos accès aux voyages
                        partagés seront définitivement effacés.
                    </p>

                    <form
                        onSubmit={deleteAccount}
                        className="flex items-center gap-3 pt-2"
                    >
                        <button
                            type="submit"
                            disabled={deleteForm.processing}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md"
                        >
                            Supprimer définitivement le compte
                        </button>
                    </form>
                </div>
            </div>
        </GuestLayout>
    );
};
