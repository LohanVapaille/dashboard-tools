import { useRef, useState } from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { BadgeCheck, Camera, Compass, KeyRound, LoaderCircle, LogOut, Mail, ShoppingCart, Sparkles, Ticket, Trash2, User, Users } from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";

const inputClass = "mt-1.5 w-full rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

const Card = ({ icon: Icon, title, description, children, tone = "indigo" }) => (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-5 flex items-start gap-3">
            <span className={`rounded-2xl p-2.5 ${tone === "rose" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"}`}>
                <Icon className="h-5 w-5" />
            </span>
            <div>
                <h2 className="font-black text-slate-900 dark:text-white">{title}</h2>
                {description && <p className="text-xs text-slate-500">{description}</p>}
            </div>
        </div>
        {children}
    </section>
);

const FieldError = ({ message }) => (message ? <p className="mt-1 text-xs font-medium text-rose-600">{message}</p> : null);

export default function ProfileEdit({ stats }) {
    const { auth, flash, errors, commerce } = usePage().props;
    const user = auth.user;
    const fileInput = useRef(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [confirmDelete, setConfirmDelete] = useState("");

    const profile = useForm({ name: user.name || "", email: user.email || "" });
    const password = useForm({ current_password: "", password: "", password_confirmation: "" });

    const uploadAvatar = (file) => {
        if (!file) return;
        setPreview(URL.createObjectURL(file));
        setUploading(true);
        router.post(route("profile.avatar.update"), { avatar: file }, {
            forceFormData: true,
            preserveScroll: true,
            onProgress: (event) => setProgress(event?.percentage || 0),
            onError: () => setPreview(null),
            onFinish: () => {
                setUploading(false);
                setProgress(0);
            },
        });
    };

    const avatar = preview || user.avatar;
    const initials = (user.name || user.email || "?").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    const since = stats.member_since ? new Date(`${stats.member_since}T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : null;

    return (
        <GuestLayout>
            <Head title="Mon profil" />

            <div className="relative h-44 overflow-hidden bg-gradient-to-r from-sky-500 via-indigo-600 to-fuchsia-600">
                <div className="absolute -left-10 top-6 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute right-10 -top-10 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-3xl" />
            </div>

            <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
                <div className="-mt-20 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => fileInput.current?.click()}
                                className="group relative h-32 w-32 overflow-hidden rounded-full bg-gradient-to-br from-sky-400 to-violet-600 shadow-xl ring-4 ring-white dark:ring-slate-800"
                                title="Changer la photo"
                            >
                                {avatar ? (
                                    <img src={avatar} alt={user.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center text-4xl font-black text-white">{initials}</span>
                                )}
                                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-900/55 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                                    <Camera className="h-6 w-6" /> Changer
                                </span>
                                {uploading && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-sm font-black text-white">
                                        {progress ? `${progress} %` : <LoaderCircle className="h-6 w-6 animate-spin" />}
                                    </span>
                                )}
                            </button>
                            <button type="button" onClick={() => fileInput.current?.click()} className="absolute bottom-1 right-1 rounded-full bg-indigo-600 p-2 text-white shadow-lg ring-4 ring-white dark:ring-slate-800" aria-label="Changer la photo">
                                <Camera className="h-4 w-4" />
                            </button>
                            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => uploadAvatar(event.target.files?.[0])} />
                        </div>

                        <div className="flex-1 text-center sm:text-left">
                            <h1 className="flex flex-wrap items-center justify-center gap-2 text-2xl font-black text-slate-900 dark:text-white sm:justify-start">
                                {user.name}
                                {stats.premium && <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-xs font-bold text-white"><Sparkles className="h-3 w-3" /> Premium</span>}
                            </h1>
                            <p className="text-sm text-slate-500">{user.email}{since && ` · membre depuis ${since}`}</p>
                            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs sm:justify-start">
                                {user.avatar && (
                                    <button type="button" onClick={() => router.delete(route("profile.avatar.destroy"), { preserveScroll: true, onSuccess: () => setPreview(null) })} className="font-semibold text-slate-400 hover:text-rose-600">
                                        Retirer la photo
                                    </button>
                                )}
                                <span className="text-slate-400">JPG, PNG ou WebP · recadrée automatiquement</span>
                            </div>
                            <FieldError message={errors.avatar} />
                        </div>

                        <Link href={route("logout")} method="post" as="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300">
                            <LogOut className="h-4 w-4" /> Se déconnecter
                        </Link>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-6 dark:border-slate-700">
                        {[
                            [Compass, stats.trips, "voyage", "voyages créés", "from-sky-500 to-indigo-500"],
                            [Users, stats.joined, "voyage", "voyages rejoints", "from-violet-500 to-fuchsia-500"],
                            [Ticket, stats.bookings, "réservation", "réservations", "from-emerald-500 to-teal-500"],
                        ].map(([Icon, value, , label, gradient]) => (
                            <div key={label} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/50">
                                <span className={`hidden rounded-xl bg-gradient-to-br ${gradient} p-2 text-white sm:block`}><Icon className="h-4 w-4" /></span>
                                <div>
                                    <p className="text-xl font-black text-slate-900 dark:text-white">{value}</p>
                                    <p className="text-[11px] text-slate-500">{label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {flash?.status && (
                    <p className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <BadgeCheck className="h-4 w-4" /> {flash.status}
                    </p>
                )}

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
                    <div className="space-y-6">
                        <Card icon={User} title="Informations personnelles" description="Votre nom apparaît auprès des membres de vos voyages.">
                            <form onSubmit={(event) => { event.preventDefault(); profile.patch(route("profile.update"), { preserveScroll: true }); }} className="grid gap-4 sm:grid-cols-2">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    Nom affiché
                                    <input required value={profile.data.name} onChange={(event) => profile.setData("name", event.target.value)} className={inputClass} />
                                    <FieldError message={profile.errors.name} />
                                </label>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    Adresse e-mail
                                    <span className="relative block">
                                        <input required type="email" value={profile.data.email} onChange={(event) => profile.setData("email", event.target.value)} className={`${inputClass} pl-9`} />
                                        <Mail className="absolute left-3 top-1/2 mt-[3px] h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </span>
                                    <FieldError message={profile.errors.email} />
                                </label>
                                <div className="flex justify-end sm:col-span-2">
                                    <button disabled={profile.processing || !profile.isDirty} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-40">
                                        {profile.processing ? "Enregistrement…" : "Enregistrer"}
                                    </button>
                                </div>
                            </form>
                        </Card>

                        <Card icon={KeyRound} title="Mot de passe" description="Au moins 8 caractères. Si vous vous connectez avec Google, vous pouvez en définir un via « Mot de passe oublié ».">
                            <form onSubmit={(event) => { event.preventDefault(); password.put(route("password.update"), { preserveScroll: true, onSuccess: () => password.reset() }); }} className="grid gap-4 sm:grid-cols-3">
                                {[["current_password", "Mot de passe actuel", "current-password"], ["password", "Nouveau mot de passe", "new-password"], ["password_confirmation", "Confirmation", "new-password"]].map(([field, label, autoComplete]) => (
                                    <label key={field} className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                        {label}
                                        <input type="password" autoComplete={autoComplete} value={password.data[field]} onChange={(event) => password.setData(field, event.target.value)} className={inputClass} />
                                        <FieldError message={password.errors[field]} />
                                    </label>
                                ))}
                                <div className="flex justify-end sm:col-span-3">
                                    <button disabled={password.processing || !password.data.password} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">
                                        Mettre à jour
                                    </button>
                                </div>
                            </form>
                        </Card>

                        <Card icon={Trash2} title="Supprimer mon compte" description="Vos voyages créés et vos accès aux voyages partagés seront définitivement effacés." tone="rose">
                            <div className="flex flex-wrap items-end gap-3">
                                <label className="flex-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                                    Tapez <span className="font-mono text-rose-600">SUPPRIMER</span> pour confirmer
                                    <input value={confirmDelete} onChange={(event) => setConfirmDelete(event.target.value)} className={inputClass} />
                                </label>
                                <button
                                    type="button"
                                    disabled={confirmDelete !== "SUPPRIMER"}
                                    onClick={() => router.delete(route("profile.destroy"))}
                                    className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-30"
                                >
                                    Supprimer définitivement
                                </button>
                            </div>
                        </Card>
                    </div>

                    <aside className="space-y-3">
                        {[
                            [Compass, "Mes voyages", route("trips.index"), "from-sky-500 to-indigo-500"],
                            [Ticket, "Mes réservations", route("flights.orders.index"), "from-emerald-500 to-teal-500"],
                            // Panier uniquement en vente directe : en mode partenaires, tout s'achète chez eux.
                            commerce?.direct_booking && [ShoppingCart, "Mon panier", route("flights.cart.index"), "from-violet-500 to-fuchsia-500"],
                            [Sparkles, stats.premium ? "Mon abonnement Premium" : "Passer à Premium", route("billing.show"), "from-amber-400 to-orange-500"],
                        ].filter(Boolean).map(([Icon, label, href, gradient]) => (
                            <Link key={label} href={href} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                                <span className={`rounded-xl bg-gradient-to-br ${gradient} p-2.5 text-white`}><Icon className="h-4 w-4" /></span>
                                <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 dark:text-slate-100">{label}</span>
                            </Link>
                        ))}
                    </aside>
                </div>
            </div>
        </GuestLayout>
    );
}
