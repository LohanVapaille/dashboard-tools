import { useState } from "react";
import axios from "axios";
import { Link, router } from "@inertiajs/react";
import { BadgeCheck, BedDouble, CircleAlert, Clock3, CreditCard, LoaderCircle, Lock, MapPin, Plus, Scale, ShieldCheck, ShieldX, Trash2, UserRound, X } from "lucide-react";
import { PropertyCover, Stars } from "@/Components/Stays/StayPropertyCard";
import { Countdown, Field, collectErrors, inputClass } from "@/Components/Cart/shared";
import { formatPercent, formatPrice } from "@/Utils/flights";
import { formatDay } from "@/Utils/stays";

export default function StayCartSection({ items, summary, defaults, initialNotice }) {
    const activeItems = items.filter((item) => !item.expired);
    const [expired, setExpired] = useState(items.some((item) => item.expired));
    const [guests, setGuests] = useState([{ given_name: defaults.given_name, family_name: defaults.family_name }]);
    const [contact, setContact] = useState({ email: defaults.email || "", phone: "", requests: "" });
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [errors, setErrors] = useState({});
    const [notice, setNotice] = useState(initialNotice || "");
    const [processing, setProcessing] = useState(false);

    const updateGuest = (index, field, value) => setGuests((current) => current.map((guest, position) => (position === index ? { ...guest, [field]: value } : guest)));

    const pay = async (event) => {
        event.preventDefault();
        setProcessing(true);
        setErrors({});
        setNotice("");
        try {
            const response = await axios.post(route("stays.checkout.store"), {
                guests,
                contact_email: contact.email,
                contact_phone: contact.phone,
                special_requests: contact.requests,
                accept_terms: acceptTerms,
            });
            window.location.href = response.data.url;
        } catch (error) {
            setProcessing(false);
            if (error.response?.status === 409) {
                setNotice(error.response.data.message);
                router.reload({ only: ["stays"] });
                return;
            }
            const fieldErrors = collectErrors(error);
            setErrors(Object.keys(fieldErrors).length ? fieldErrors : { checkout: "Le paiement n’a pas pu démarrer. Réessayez." });
        }
    };

    if (!items.length) {
        return (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white"><BedDouble className="h-7 w-7" /></span>
                <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Aucun hébergement dans votre panier</h2>
                <p className="mt-1 text-sm text-slate-500">Ouvrez un voyage, onglet « Logements », pour trouver où dormir.</p>
                <Link href={route("trips.index")} className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Voir mes voyages</Link>
            </div>
        );
    }

    return (
        <form onSubmit={pay} className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-6">
                {notice && <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"><CircleAlert className="h-4 w-4" /> {notice}</p>}

                {items.map((item) => (
                    <article key={item.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-800 ${item.expired ? "border-rose-200 opacity-70" : "border-slate-200 dark:border-slate-700"}`}>
                        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">
                            <span>{formatDay(item.check_in, { weekday: "short", day: "numeric", month: "long" })} → {formatDay(item.check_out, { weekday: "short", day: "numeric", month: "long" })} · {item.nights} nuit{item.nights > 1 ? "s" : ""}{item.trip ? ` · ${item.trip.title}` : ""}</span>
                            <button type="button" onClick={() => router.delete(route("stays.cart.destroy", item.id), { preserveScroll: true })} className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 normal-case tracking-normal hover:bg-white/30">
                                <Trash2 className="h-3.5 w-3.5" /> Retirer
                            </button>
                        </div>
                        <div className="flex flex-col gap-4 p-4 sm:flex-row">
                            <div className="overflow-hidden rounded-xl sm:w-44"><PropertyCover property={item.property} className="h-28" /></div>
                            <div className="flex-1 space-y-1">
                                <p className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">{item.property.name} <Stars count={item.property.stars} /></p>
                                <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /> {item.property.address}</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{item.room.name} · {item.rate.board_label}</p>
                                <p className="text-xs text-slate-500">{item.guests} voyageur{item.guests > 1 ? "s" : ""} · {item.rooms} chambre{item.rooms > 1 ? "s" : ""}</p>
                                {item.rate.free_cancellation_until ? (
                                    <p className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" /> Annulation gratuite jusqu’au {new Date(item.rate.free_cancellation_until).toLocaleDateString("fr-FR")}</p>
                                ) : (
                                    <p className="flex items-center gap-1 text-xs font-semibold text-rose-600"><ShieldX className="h-3.5 w-3.5" /> {item.rate.refundable ? "Remboursement partiel selon conditions" : "Non remboursable"}</p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-slate-900 dark:text-white">{formatPrice(item.total_amount, item.currency)}</p>
                                {item.rate.due_at_property && <p className="text-[11px] text-slate-500">+ {formatPrice(item.rate.due_at_property.amount, item.rate.due_at_property.currency)} sur place</p>}
                            </div>
                        </div>
                        {item.expires_at && (
                            <p className="flex items-center gap-1 border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/30">
                                <Clock3 className="h-3.5 w-3.5" /> Tarif garanti encore <Countdown expiresAt={item.expires_at} onExpire={() => setExpired(true)} />
                            </p>
                        )}
                    </article>
                ))}

                {expired && <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"><CircleAlert className="h-4 w-4" /> Un tarif a expiré : retirez cet hébergement et relancez la recherche.</p>}

                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                    <div>
                        <h2 className="flex items-center gap-2 font-black text-slate-900 dark:text-white"><UserRound className="h-5 w-5 text-emerald-600" /> Voyageurs</h2>
                        <p className="mt-1 text-xs text-slate-500">Le voyageur principal doit être présent à l’arrivée et présenter une pièce d’identité à son nom.</p>
                    </div>
                    {guests.map((guest, index) => (
                        <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                            <Field label={index === 0 ? "Prénom du voyageur principal" : `Prénom · voyageur ${index + 1}`} error={errors[`guests.${index}.given_name`]}>
                                <input required value={guest.given_name} onChange={(event) => updateGuest(index, "given_name", event.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Nom" error={errors[`guests.${index}.family_name`]}>
                                <input required value={guest.family_name} onChange={(event) => updateGuest(index, "family_name", event.target.value)} className={inputClass} />
                            </Field>
                            {index > 0 ? (
                                <button type="button" onClick={() => setGuests((current) => current.filter((_, position) => position !== index))} className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
                            ) : <span />}
                        </div>
                    ))}
                    {guests.length < summary.guests_count && (
                        <button type="button" onClick={() => setGuests((current) => [...current, { given_name: "", family_name: "" }])} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Plus className="h-3.5 w-3.5" /> Ajouter le nom d’un autre voyageur (facultatif)</button>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="E-mail de contact (confirmation et reçu)" error={errors.contact_email}>
                            <input required type="email" autoComplete="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} className={inputClass} />
                        </Field>
                        <Field label="Téléphone mobile" error={errors.contact_phone}>
                            <input required type="tel" autoComplete="tel" placeholder="+33 6 12 34 56 78" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} className={inputClass} />
                        </Field>
                    </div>
                    <Field label="Demandes particulières (facultatif, transmises à l’hébergement sans garantie)" error={errors.special_requests}>
                        <textarea rows={2} maxLength={500} value={contact.requests} onChange={(event) => setContact({ ...contact, requests: event.target.value })} placeholder="Arrivée tardive, lit bébé, étage élevé…" className={inputClass} />
                    </Field>
                </section>

                <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="flex items-center gap-2 font-black text-slate-900 dark:text-white"><Scale className="h-5 w-5 text-emerald-600" /> Vos droits en bref</h2>
                    <ul className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        <li>• <strong>Pas de droit de rétractation de 14 jours</strong> pour un hébergement réservé à une date précise (art. L221-28, 12° du Code de la consommation) : seules les conditions d’annulation du tarif s’appliquent.</li>
                        <li>• <strong>Taxe de séjour</strong> et éventuelles taxes locales peuvent être perçues sur place par l’hébergement ; elles sont indiquées avant le paiement.</li>
                        <li>• <strong>Hébergement non conforme ou indisponible</strong> à votre arrivée : signalez-le immédiatement à l’établissement, responsable de la prestation, et à notre service client, qui vous aide à obtenir un relogement ou un remboursement.</li>
                        <li>• <strong>Frais de service non remboursables</strong> : ils rémunèrent notre intermédiation, rendue dès la confirmation de la réservation.</li>
                        <li>• <strong>Réservation non confirmée</strong> après paiement : remboursement intégral automatique, frais compris.</li>
                    </ul>
                    <label className="flex items-start gap-3 rounded-xl bg-emerald-50/60 p-3 text-sm text-slate-700 dark:bg-emerald-950/30 dark:text-slate-200">
                        <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500" />
                        <span>
                            J’accepte les <Link href={route("legal.terms")} target="_blank" className="font-semibold text-emerald-700 underline">conditions de vente</Link> et les conditions de l’hébergement (annulation, horaires d’arrivée, règlement intérieur).
                            {errors.accept_terms && <span className="mt-1 block text-xs font-medium text-rose-600">{errors.accept_terms}</span>}
                        </span>
                    </label>
                </section>
            </div>

            <aside className="h-fit space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-lg shadow-emerald-500/5 dark:border-emerald-900 dark:bg-slate-800 lg:sticky lg:top-24">
                <h2 className="font-black text-slate-900 dark:text-white">Récapitulatif hébergements</h2>
                <dl className="space-y-2 text-sm">
                    {activeItems.map((item) => (
                        <div key={item.id} className="flex justify-between gap-3">
                            <dt className="truncate text-slate-600 dark:text-slate-300">{item.property.name} · {item.nights} nuit{item.nights > 1 ? "s" : ""}</dt>
                            <dd className="tabular-nums text-slate-900 dark:text-white">{formatPrice(item.stay_amount, item.currency)}</dd>
                        </div>
                    ))}
                    <div className="flex justify-between gap-3">
                        <dt className="text-slate-600 dark:text-slate-300">{summary.fee_label} ({formatPercent(summary.fee_percent)})</dt>
                        <dd className="tabular-nums text-slate-900 dark:text-white">{formatPrice(summary.fee_amount, summary.currency)}</dd>
                    </div>
                    <div className="flex items-end justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                        <dt className="font-bold text-slate-900 dark:text-white">Total TTC</dt>
                        <dd className="text-2xl font-black text-emerald-600">{formatPrice(summary.total_amount, summary.currency)}</dd>
                    </div>
                </dl>
                {errors.checkout && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{errors.checkout}</p>}
                <button disabled={processing || expired || !activeItems.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50">
                    {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {processing ? "Vérification du tarif…" : `Payer les hébergements · ${formatPrice(summary.total_amount, summary.currency)}`}
                </button>
                <ul className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700">
                    <li className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Carte, Apple Pay, Google Pay via Stripe</li>
                    <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Paiement chiffré et 3-D Secure</li>
                    <li className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Confirmation envoyée par e-mail</li>
                </ul>
                <button type="button" onClick={() => router.delete(route("flights.cart.clear", { section: "stays" }))} className="w-full text-center text-xs text-slate-400 hover:text-rose-600">Retirer tous les hébergements</button>
            </aside>
        </form>
    );
}
