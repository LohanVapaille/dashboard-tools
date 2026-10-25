import { Head, useForm } from "@inertiajs/react";
import { Lock, LoaderCircle, ShieldCheck } from "lucide-react";

export default function AdminLogin({ configured }) {
    const form = useForm({ username: "", password: "" });

    const submit = (event) => {
        event.preventDefault();
        form.post(route("admin.login"), { onFinish: () => form.reset("password") });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
            <Head title="Connexion · Back-office" />
            <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900">
                <div className="text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-600 text-white"><ShieldCheck className="h-6 w-6" /></span>
                    <h1 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Back-office</h1>
                    <p className="text-sm text-slate-500">Accès réservé à l’administration du site.</p>
                </div>

                {!configured && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Le back-office est désactivé : ajoutez <code className="font-mono">ADMIN_PASSWORD</code> (et éventuellement <code className="font-mono">ADMIN_USERNAME</code>) dans le fichier <code className="font-mono">.env</code>.
                    </p>
                )}

                <label className="block space-y-1">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Identifiant</span>
                    <input autoFocus autoComplete="username" value={form.data.username} onChange={(event) => form.setData("username", event.target.value)} className="w-full rounded-xl border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </label>
                <label className="block space-y-1">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Mot de passe</span>
                    <input type="password" autoComplete="current-password" value={form.data.password} onChange={(event) => form.setData("password", event.target.value)} className="w-full rounded-xl border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </label>

                {(form.errors.username || form.errors.password) && (
                    <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{form.errors.username || form.errors.password}</p>
                )}

                <button disabled={form.processing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {form.processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Se connecter
                </button>
            </form>
        </div>
    );
}
