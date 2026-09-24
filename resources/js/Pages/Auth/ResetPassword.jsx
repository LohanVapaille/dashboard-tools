import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import GuestLayout from "@/Layouts/GuestLayout";
import { Head, useForm } from "@inertiajs/react";

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: "",
        password_confirmation: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("password.store"), {
            onFinish: () => reset("password", "password_confirmation"),
        });
    };

    return (
        <GuestLayout>
            <Head title="Réinitialisation du mot de passe" />

            <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 space-y-6 mt-12">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Nouveau mot de passe
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Choisis ton nouveau mot de passe sécurisé.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <InputLabel htmlFor="email" value="Email" />
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-sm"
                            autoComplete="username"
                            onChange={(e) => setData("email", e.target.value)}
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="Mot de passe" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-sm"
                            autoComplete="new-password"
                            isFocused={true}
                            onChange={(e) =>
                                setData("password", e.target.value)
                            }
                        />
                        <InputError
                            message={errors.password}
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <InputLabel
                            htmlFor="password_confirmation"
                            value="Confirmer le mot de passe"
                        />
                        <TextInput
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="mt-1 block w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-sm"
                            autoComplete="new-password"
                            onChange={(e) =>
                                setData("password_confirmation", e.target.value)
                            }
                        />
                        <InputError
                            message={errors.password_confirmation}
                            className="mt-2"
                        />
                    </div>

                    <PrimaryButton
                        className="w-full justify-center py-3 rounded-xl font-semibold shadow-md"
                        disabled={processing}
                    >
                        Réinitialiser
                    </PrimaryButton>
                </form>
            </div>
        </GuestLayout>
    );
}
