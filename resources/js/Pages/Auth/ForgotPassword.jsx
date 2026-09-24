import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import GuestLayout from "@/Layouts/GuestLayout";
import { Head, Link, useForm } from "@inertiajs/react";

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("password.email"));
    };

    return (
        <GuestLayout>
            <Head title="Mot de passe oublié" />

            <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 space-y-6 mt-12">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Mot de passe oublié ?
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Indique ton email pour réinitialiser ton mot de passe.
                    </p>
                </div>

                {status && (
                    <div className="mb-4 text-sm font-medium text-emerald-600 dark:text-emerald-400 text-center">
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-sm"
                            isFocused={true}
                            onChange={(e) => setData("email", e.target.value)}
                            placeholder="Ton email"
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <PrimaryButton
                        className="w-full justify-center py-3 rounded-xl font-semibold shadow-md"
                        disabled={processing}
                    >
                        Envoyer le lien de réinitialisation
                    </PrimaryButton>
                </form>

                <div className="text-center pt-2">
                    <Link
                        href={route("login")}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                    >
                        Retour à la connexion
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}
