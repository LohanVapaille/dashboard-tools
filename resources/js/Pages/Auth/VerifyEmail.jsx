import PrimaryButton from "@/Components/PrimaryButton";
import GuestLayout from "@/Layouts/GuestLayout";
import { Head, Link, useForm } from "@inertiajs/react";

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();
        post(route("verification.send"));
    };

    return (
        <GuestLayout>
            <Head title="Vérification d'email" />

            <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 space-y-6 mt-12">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Vérifie ta boîte mail
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Merci pour ton inscription ! Avant de commencer, clique
                        sur le lien que nous venons de t'envoyer par email.
                    </p>
                </div>

                {status === "verification-link-sent" && (
                    <div className="mb-4 text-sm font-medium text-emerald-600 dark:text-emerald-400 text-center">
                        Un nouveau lien de vérification a été envoyé à l'adresse
                        email fournie lors de l'inscription.
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <PrimaryButton
                        className="w-full justify-center py-3 rounded-xl font-semibold shadow-md"
                        disabled={processing}
                    >
                        Renvoyer l'email de vérification
                    </PrimaryButton>

                    <div className="flex items-center justify-between pt-2">
                        <Link
                            href={route("logout")}
                            method="post"
                            as="button"
                            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
                        >
                            Se déconnecter
                        </Link>
                    </div>
                </form>
            </div>
        </GuestLayout>
    );
}
