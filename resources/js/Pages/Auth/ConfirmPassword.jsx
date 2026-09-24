import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import GuestLayout from "@/Layouts/GuestLayout";
import { Head, useForm } from "@inertiajs/react";

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("password.confirm"), {
            onFinish: () => reset("password"),
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirmation du mot de passe" />

            <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 space-y-6 mt-12">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Zone sécurisée
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Veuillez confirmer votre mot de passe avant de
                        continuer.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <InputLabel htmlFor="password" value="Mot de passe" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-sm"
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

                    <PrimaryButton
                        className="w-full justify-center py-3 rounded-xl font-semibold shadow-md"
                        disabled={processing}
                    >
                        Confirmer
                    </PrimaryButton>
                </form>
            </div>
        </GuestLayout>
    );
}
