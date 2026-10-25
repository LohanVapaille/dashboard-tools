import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, usePage } from "@inertiajs/react";
import { ArrowLeft, CreditCard, LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import { firstError, formatPrice } from "@/Utils/flights";

const SDK_URL = "https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1";
const field = "w-full rounded-xl border-slate-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

function loadSdk() {
    if (window.LiteAPIPayment) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${SDK_URL}"]`);
        const script = existing || Object.assign(document.createElement("script"), { src: SDK_URL, async: true });
        script.addEventListener("load", resolve);
        script.addEventListener("error", () => reject(new Error("sdk")));
        if (!existing) document.head.appendChild(script);
    });
}

/**
 * Réservation d'hôtel sans quitter le site : coordonnées du voyageur, puis module de paiement
 * Nuitée (LiteAPI) affiché dans la page. Nuitée encaisse et rembourse ; le site n'encaisse rien.
 */
export default function EmbeddedCheckout({ trip, property, room, rate, context, onBack }) {
    const { auth, legal } = usePage().props;
    const [first, ...rest] = (auth?.user?.name || "").split(" ");
    const [holder, setHolder] = useState({ first_name: first || "", last_name: rest.join(" "), email: auth?.user?.email || "", phone: "" });
    const [requests, setRequests] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [state, setState] = useState({ step: "form", loading: false, error: "", payment: null });
    const target = useRef(null);

    const set = (key) => (event) => setHolder((current) => ({ ...current, [key]: event.target.value }));

    const start = async (event) => {
        event.preventDefault();
        setState((current) => ({ ...current, loading: true, error: "" }));
        try {
            const { data } = await axios.post(route("stays.embedded.start"), {
                trip_id: trip.id,
                search_result_id: property.id,
                rate_id: rate.id,
                context,
                holder,
                special_requests: requests || null,
                accept_terms: accepted,
            });
            setState({ step: "pay", loading: true, error: "", payment: data });
        } catch (failure) {
            setState((current) => ({ ...current, loading: false, error: firstError(failure, "La réservation n’a pas pu être préparée.") }));
        }
    };

    // Le module Nuitée s'affiche dans la page puis renvoie vers notre page de confirmation.
    useEffect(() => {
        if (state.step !== "pay" || !state.payment) return;
        loadSdk()
            .then(() => {
                const payment = new window.LiteAPIPayment({
                    publicKey: state.payment.payment.public_key,
                    appearance: { theme: "flat" },
                    options: { business: { name: legal?.company || "LovaTrip" } },
                    targetElement: "#liteapi-payment",
                    secretKey: state.payment.payment.secret_key,
                    returnUrl: state.payment.payment.return_url,
                });
                payment.handlePayment();
                setState((current) => ({ ...current, loading: false }));
            })
            .catch(() => setState((current) => ({ ...current, loading: false, error: "Le module de paiement n’a pas pu se charger. Vérifiez votre connexion ou désactivez le bloqueur de publicités." })));
    }, [state.step]);

    return (
        <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-300">
                        <ArrowLeft className="h-3.5 w-3.5" /> Autres chambres
                    </button>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">{room?.name}</h4>
                    <p className="text-sm text-slate-500">{rate.board_label} · {rate.free_cancellation_until ? `annulation gratuite jusqu’au ${new Date(rate.free_cancellation_until).toLocaleDateString("fr-FR")}` : rate.refundable ? "remboursement partiel possible" : "non remboursable"}</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{formatPrice(state.payment?.amount ?? rate.total_amount, state.payment?.currency ?? rate.currency)}</p>
                    <p className="text-[11px] text-slate-500">taxes incluses{rate.due_at_property ? ` · + ${formatPrice(rate.due_at_property.amount, rate.due_at_property.currency)} sur place` : ""}</p>
                </div>
            </div>

            {state.step === "form" ? (
                <form onSubmit={start} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <input required placeholder="Prénom du voyageur principal" value={holder.first_name} onChange={set("first_name")} className={field} />
                        <input required placeholder="Nom" value={holder.last_name} onChange={set("last_name")} className={field} />
                        <input required type="email" placeholder="E-mail (confirmation)" value={holder.email} onChange={set("email")} className={field} />
                        <input type="tel" placeholder="Téléphone (facultatif)" value={holder.phone} onChange={set("phone")} className={field} />
                    </div>
                    <textarea rows={2} placeholder="Demandes particulières (non garanties) : arrivée tardive, lit bébé…" value={requests} onChange={(event) => setRequests(event.target.value)} className={field} />
                    <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <input type="checkbox" required checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 rounded text-emerald-600" />
                        <span>
                            J’accepte les conditions du tarif ci-dessus. La réservation est vendue et encaissée par <strong>Nuitée (LiteAPI)</strong>, qui gère le paiement et les remboursements ;{" "}
                            {legal?.company || "LovaTrip"} transmet la réservation et ne perçoit pas votre paiement.{" "}
                            <Link href={route("legal.terms")} className="font-semibold text-emerald-700 underline">Conditions générales</Link>
                        </span>
                    </label>
                    {state.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}
                    <button disabled={state.loading || !accepted} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50">
                        {state.loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        {state.loading ? "Vérification de la disponibilité…" : "Continuer vers le paiement"}
                    </button>
                </form>
            ) : (
                <div className="space-y-3">
                    {state.payment?.price_changed && (
                        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">L’hôtel a actualisé son tarif : le montant à payer est désormais de {formatPrice(state.payment.amount, state.payment.currency)}.</p>
                    )}
                    {state.payment?.payment.public_key === "sandbox" && (
                        <p className="rounded-xl bg-sky-50 p-3 text-xs text-sky-800">Mode test : utilisez la carte 4242 4242 4242 4242, une date future et n’importe quel cryptogramme. Aucun débit réel.</p>
                    )}
                    {state.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}
                    {state.loading && <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Chargement du paiement sécurisé…</p>}
                    <div id="liteapi-payment" ref={target} className="min-h-[12rem] rounded-xl bg-white p-3 dark:bg-slate-900" />
                    <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><Lock className="h-3.5 w-3.5 text-emerald-600" /> Paiement chiffré, traité par Nuitée. Nous ne voyons pas vos données bancaires.</p>
                </div>
            )}

            <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Commande {state.payment?.reference || ""} confirmée par e-mail et ajoutée à l’onglet Logements de votre voyage.</p>
        </div>
    );
}
