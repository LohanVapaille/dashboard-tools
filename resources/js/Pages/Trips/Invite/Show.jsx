import { Head, Link, useForm } from "@inertiajs/react";
import { AlertTriangle, CalendarDays, Compass, LoaderCircle, LogIn, MapPin, Sparkles, UserPlus, Users } from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";
import { formatDate } from "@/Utils/formatters";

export default function InviteShow({ trip, token, authUser, guestName, guestTripsRemaining, guestTripLimit }) {
    const form = useForm({ pseudo: guestName || "" });
    const join = (event) => {
        event.preventDefault();
        form.post(route("trips.join.store", token));
    };

    return (
        <GuestLayout>
            <Head title={`Rejoindre ${trip.title}`} />

            <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-indigo-600 to-fuchsia-600">
                <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-fuchsia-300/20 blur-3xl" />
                <div className="relative mx-auto max-w-3xl px-4 pb-28 pt-14 text-center text-white">
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5" /> {trip.owner ? `${trip.owner} vous invite` : "Vous êtes invité"}</p>
                    <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{trip.title}</h1>
                    {trip.description && <p className="mx-auto mt-3 max-w-xl text-white/85">{trip.description}</p>}
                    <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
                        {trip.start_date && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><CalendarDays className="h-4 w-4" /> {formatDate(trip.start_date)} → {formatDate(trip.end_date)}</span>
                        )}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><Users className="h-4 w-4" /> {trip.members_count} voyageur{trip.members_count > 1 ? "s" : ""}</span>
                        {trip.destinations.map((destination) => (
                            <span key={destination} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><MapPin className="h-4 w-4" /> {destination}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="relative mx-auto -mt-20 max-w-md px-4 pb-16">
                <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                    {authUser ? (
                        <form onSubmit={join} className="space-y-4 text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-300">Vous êtes connecté en tant que <strong>{authUser.name}</strong>.</p>
                            <button disabled={form.processing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-50">
                                {form.processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />} Rejoindre le voyage
                            </button>
                        </form>
                    ) : (
                        <>
                            <form onSubmit={join} className="space-y-3">
                                <label className="block text-sm font-bold text-slate-800 dark:text-white">
                                    Votre pseudo
                                    <span className="block text-xs font-normal text-slate-500">C’est le nom que verront les autres membres du voyage.</span>
                                    <input
                                        autoFocus
                                        required
                                        minLength={2}
                                        maxLength={30}
                                        value={form.data.pseudo}
                                        onChange={(event) => form.setData("pseudo", event.target.value)}
                                        placeholder="Ex. Léa, Tonton Marc…"
                                        className="mt-2 w-full rounded-xl border-slate-300 text-base focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                                    />
                                </label>
                                {form.errors.pseudo && <p className="text-xs font-medium text-rose-600">{form.errors.pseudo}</p>}
                                {form.errors.guest_limit && (
                                    <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" /> {form.errors.guest_limit}</p>
                                )}
                                <button disabled={form.processing || guestTripsRemaining === 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-50">
                                    {form.processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />} Rejoindre sans compte
                                </button>
                                <p className="text-center text-[11px] leading-relaxed text-slate-500">
                                    Sans compte : {guestTripLimit} voyages maximum ({guestTripsRemaining} restant{guestTripsRemaining > 1 ? "s" : ""}), accès lié à cet appareil, pas d’assistant IA ni de réservation.
                                </p>
                            </form>

                            <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /> ou <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /></div>

                            <div className="grid grid-cols-2 gap-2">
                                <Link href={route("register")} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-slate-900">
                                    <UserPlus className="h-4 w-4" /> Créer un compte
                                </Link>
                                <Link href={route("login")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200">
                                    <LogIn className="h-4 w-4" /> Se connecter
                                </Link>
                            </div>
                            <p className="text-center text-[11px] text-slate-400">Vous reviendrez automatiquement sur cette invitation.</p>
                        </>
                    )}
                </div>
            </div>
        </GuestLayout>
    );
}
