import { Head, Link, useForm, usePage } from "@inertiajs/react";
import GuestLayout from "@/Layouts/GuestLayout";
import { Check, Sparkles } from "lucide-react";

export default function Premium({ isPremium }) {
    const { props } = usePage();
    const form = useForm();

    const startCheckout = (event) => {
        event.preventDefault();
        form.post(route("billing.checkout"));
    };

    return (
        <GuestLayout>
            <Head title="Premium" />
            <div className="mx-auto max-w-2xl px-4 py-12">
                <div className="rounded-3xl border border-indigo-200 bg-white p-8 text-center shadow-xl dark:border-indigo-900 dark:bg-slate-800">
                    <Sparkles className="mx-auto h-10 w-10 text-indigo-500" />
                    <h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
                        {props.legal?.company || "LovaTrip"} Premium
                    </h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">
                        Planifiez sans limite, pour vous et tous les voyageurs de vos voyages.
                    </p>
                    <div className="my-6">
                        <span className="text-5xl font-black text-indigo-600">5 €</span>
                        <span className="text-slate-500"> / mois</span>
                    </div>
                    <ul className="mx-auto max-w-sm space-y-3 text-left text-sm text-slate-700 dark:text-slate-200">
                        {[
                            "Programmes IA quasi illimités (3 par jour en gratuit)",
                            "Dépenses partagées illimitées (15 par voyage en gratuit)",
                            "Carnet de voyage imprimable et exportable en PDF",
                            "Avantages partagés avec tous les participants de vos voyages",
                            "Résiliation depuis Stripe à tout moment",
                        ].map((item) => (
                            <li key={item} className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-500" />
                                {item}
                            </li>
                        ))}
                    </ul>
                    {props.errors?.stripe && (
                        <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {props.errors.stripe}
                        </p>
                    )}
                    {props.flash?.status && (
                        <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                            {props.flash.status}
                        </p>
                    )}
                    {isPremium ? (
                        <p className="mt-6 font-semibold text-emerald-600">
                            Votre abonnement Premium est actif.
                        </p>
                    ) : (
                        <form onSubmit={startCheckout} className="mt-7">
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {form.processing ? "Redirection vers Stripe..." : "Passer à Premium"}
                            </button>
                        </form>
                    )}
                    <Link href={route("trips.index")} className="mt-5 inline-block text-sm text-slate-500 hover:text-indigo-600">
                        Retour à mes voyages
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}
