import { useState } from "react";
import axios from "axios";
import { Link, router } from "@inertiajs/react";
import { BadgeCheck, Briefcase, CircleAlert, Clock3, CreditCard, LoaderCircle, Lock, Luggage, Plane, Scale, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { AirlineLogo, FlightTimeline, OfferBadges } from "@/Components/Flights/FlightOfferCard";
import BirthDateInput from "@/Components/BirthDateInput";
import { Countdown, Field, collectErrors, inputClass } from "@/Components/Cart/shared";
import { directionLabel, formatPercent, formatPrice, localDate } from "@/Utils/flights";

const emptyPassenger = { title: "mr", gender: "m", given_name: "", family_name: "", born_on: "" };

export default function FlightCartSection({ items, summary, defaults, initialNotice }) {
    const activeItems = items.filter((item) => !item.expired);
    const [expired, setExpired] = useState(items.some((item) => item.expired));
    const [passengers, setPassengers] = useState(() =>
        Array.from({ length: summary.passengers_count }, (_, index) =>
            index === 0 ? { ...emptyPassenger, given_name: defaults.given_name, family_name: defaults.family_name } : { ...emptyPassenger },
        ),
    );
    const [contact, setContact] = useState({ email: defaults.email || "", phone: "" });
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [errors, setErrors] = useState({});
    const [notice, setNotice] = useState(initialNotice || "");
    const [processing, setProcessing] = useState(false);

    const updatePassenger = (index, field, value) =>
        setPassengers((current) =>
            current.map((passenger, position) => {
                if (position !== index) return passenger;
                const next = { ...passenger, [field]: value };
                // Civilité et genre vont ensemble pour la compagnie.
                if (field === "title") next.gender = value === "mr" ? "m" : "f";
                return next;
            }),
        );

    const pay = async (event) => {
        event.preventDefault();
        setProcessing(true);
        setErrors({});
        setNotice("");
        try {
            const response = await axios.post(route("flights.checkout.store"), {
                passengers,
                contact_email: contact.email,
                contact_phone: contact.phone,
                accept_terms: acceptTerms,
            });
            window.location.href = response.data.url;
        } catch (error) {
            setProcessing(false);
            if (error.response?.status === 409) {
                setNotice(error.response.data.message);
                router.reload({ only: ["flights"] });
                return;
            }
            const fieldErrors = collectErrors(error);
            setErrors(Object.keys(fieldErrors).length ? fieldErrors : { checkout: "Le paiement n’a pas pu démarrer. Réessayez." });
        }
    };

    if (!items.length) {
        return (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 text-white"><Plane className="h-7 w-7" /></span>
                <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Aucun vol dans votre panier</h2>
                <p className="mt-1 text-sm text-slate-500">Ouvrez un voyage, onglet « Transports », pour rechercher vos vols.</p>
                <Link href={route("trips.index")} className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Voir mes voyages</Link>
            </div>
        );
    }

    return (
        <form onSubmit={pay} className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-6">
                {notice && (
                    <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"><CircleAlert className="h-4 w-4" /> {notice}</p>
                )}

                {items.map((item) => (
                    <article key={item.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-800 ${item.expired ? "border-rose-200 opacity-70 dark:border-rose-900" : "border-slate-200 dark:border-slate-700"}`}>
                        <div className={`flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-white ${item.direction === "return" ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : "bg-gradient-to-r from-sky-500 to-indigo-500"}`}>
                            <span>{directionLabel(item.direction)} · {localDate(item.offer.departure, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{item.trip ? ` · ${item.trip.title}` : ""}</span>
                            <button type="button" onClick={() => router.delete(route("flights.cart.destroy", item.id), { preserveScroll: true })} className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 normal-case tracking-normal hover:bg-white/30">
                                <Trash2 className="h-3.5 w-3.5" /> Retirer
                            </button>
                        </div>
                        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-3 sm:w-44">
                                <AirlineLogo airline={item.offer.airline} size="h-9 w-9" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.offer.airline?.name}</p>
                                    <p className="truncate text-xs text-slate-500">{item.offer.segments?.map((segment) => segment.flight_number).join(" · ")}</p>
                                </div>
                            </div>
                            <FlightTimeline offer={item.offer} size="sm" />
                            <div className="text-right sm:w-32">
                                <p className="text-lg font-black text-slate-900 dark:text-white">{formatPrice(item.total_amount, item.offer.currency)}</p>
                                <p className="text-[11px] text-slate-500">{item.offer.passengers_count} passager{item.offer.passengers_count > 1 ? "s" : ""}</p>
                            </div>
                        </div>
                        {item.services?.length > 0 && (
                            <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2 text-xs dark:border-slate-700">
                                {item.services.map((service) => (
                                    <span key={service.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                        {service.kind === "carry_on" ? <Briefcase className="h-3 w-3" /> : <Luggage className="h-3 w-3" />}
                                        Passager {service.passenger_index + 1} · {service.quantity} × {service.kind === "carry_on" ? "cabine" : "soute"}{service.max_weight_kg ? ` ${service.max_weight_kg} kg` : ""}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2 dark:border-slate-700 dark:bg-slate-900/30">
                            <OfferBadges offer={item.offer} />
                            {item.expires_at && (
                                <span className="flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Tarif garanti encore <Countdown expiresAt={item.expires_at} onExpire={() => setExpired(true)} /></span>
                            )}
                        </div>
                    </article>
                ))}

                {expired && (
                    <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                        <CircleAlert className="h-4 w-4 shrink-0" /> Un tarif a expiré : retirez ce vol et relancez la recherche pour obtenir un prix à jour.
                    </p>
                )}

                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                    <div>
                        <h2 className="flex items-center gap-2 font-black text-slate-900 dark:text-white"><UserRound className="h-5 w-5 text-indigo-500" /> Passagers</h2>
                        <p className="mt-1 text-xs text-slate-500">Saisissez les noms exactement comme sur la pièce d’identité utilisée pour voyager. Un nom erroné peut entraîner un refus d’embarquement.</p>
                    </div>
                    {passengers.map((passenger, index) => (
                        <fieldset key={index} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
                            <legend className="px-1 text-xs font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Passager {index + 1} · adulte</legend>
                            <div className="grid gap-3 sm:grid-cols-[7rem_1fr_1fr]">
                                <Field label="Civilité" error={errors[`passengers.${index}.title`]}>
                                    <select value={passenger.title} onChange={(event) => updatePassenger(index, "title", event.target.value)} className={inputClass}>
                                        <option value="mr">M.</option>
                                        <option value="ms">Mme</option>
                                        <option value="miss">Mlle</option>
                                    </select>
                                </Field>
                                <Field label="Prénom" error={errors[`passengers.${index}.given_name`]}>
                                    <input required autoComplete={index === 0 ? "given-name" : "off"} value={passenger.given_name} onChange={(event) => updatePassenger(index, "given_name", event.target.value)} className={inputClass} />
                                </Field>
                                <Field label="Nom" error={errors[`passengers.${index}.family_name`]}>
                                    <input required autoComplete={index === 0 ? "family-name" : "off"} value={passenger.family_name} onChange={(event) => updatePassenger(index, "family_name", event.target.value)} className={inputClass} />
                                </Field>
                            </div>
                            <Field label="Date de naissance" error={errors[`passengers.${index}.born_on`]} className="mt-3 sm:max-w-sm">
                                <BirthDateInput value={passenger.born_on} minAge={18} onChange={(value) => updatePassenger(index, "born_on", value)} />
                            </Field>
                        </fieldset>
                    ))}
                    {errors.passengers && <p className="text-xs text-rose-600">{errors.passengers}</p>}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="E-mail de contact (billets et reçu)" error={errors.contact_email}>
                            <input required type="email" autoComplete="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} className={inputClass} />
                        </Field>
                        <Field label="Téléphone mobile (informations de vol)" error={errors.contact_phone}>
                            <input required type="tel" autoComplete="tel" placeholder="+33 6 12 34 56 78" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} className={inputClass} />
                        </Field>
                    </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="flex items-center gap-2 font-black text-slate-900 dark:text-white"><Scale className="h-5 w-5 text-indigo-500" /> Vos droits en bref</h2>
                    <ul className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        <li>• <strong>Pas de droit de rétractation de 14 jours</strong> pour les billets d’avion (art. L221-2 du Code de la consommation) : l’annulation dépend des règles du tarif affichées sur chaque vol.</li>
                        <li>• <strong>Vol annulé, retardé de plus de 3 h ou refus d’embarquement</strong> du fait de la compagnie : remboursement ou réacheminement, et indemnisation de 250 € à 600 € selon la distance (règlement UE 261/2004), sauf circonstances extraordinaires.</li>
                        <li>• <strong>Billet non utilisé</strong> : les taxes liées à l’embarquement vous sont remboursées sur demande, sous 30 jours et sans frais en ligne (art. L224-66 du Code de la consommation).</li>
                        <li>• <strong>Billet non émis</strong> par la compagnie après paiement : remboursement intégral automatique, frais compris.</li>
                        <li>• <strong>Frais de service non remboursables</strong> une fois le billet émis, y compris en cas d’annulation par vous ou par la compagnie : ils rémunèrent notre intermédiation.</li>
                    </ul>
                    <label className="flex items-start gap-3 rounded-xl bg-indigo-50/60 p-3 text-sm text-slate-700 dark:bg-indigo-950/30 dark:text-slate-200">
                        <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" />
                        <span>
                            J’accepte les <Link href={route("legal.terms")} target="_blank" className="font-semibold text-indigo-600 underline">conditions de vente</Link> et les règles tarifaires des compagnies, et je confirme que les informations des passagers sont exactes.
                            {errors.accept_terms && <span className="mt-1 block text-xs font-medium text-rose-600">{errors.accept_terms}</span>}
                        </span>
                    </label>
                </section>
            </div>

            <aside className="h-fit space-y-4 rounded-2xl border border-indigo-100 bg-white p-5 shadow-lg shadow-indigo-500/5 dark:border-indigo-900 dark:bg-slate-800 lg:sticky lg:top-24">
                <h2 className="font-black text-slate-900 dark:text-white">Récapitulatif vols</h2>
                <dl className="space-y-2 text-sm">
                    {activeItems.map((item) => (
                        <div key={item.id} className="space-y-1">
                            <div className="flex justify-between gap-3">
                                <dt className="text-slate-600 dark:text-slate-300">{directionLabel(item.direction)} {item.offer.origin.code} → {item.offer.destination.code}</dt>
                                <dd className="tabular-nums text-slate-900 dark:text-white">{formatPrice(item.offer.airline_amount, item.offer.currency)}</dd>
                            </div>
                            {item.services_amount > 0 && (
                                <div className="flex justify-between gap-3 pl-3 text-xs">
                                    <dt className="text-slate-500">+ bagages</dt>
                                    <dd className="tabular-nums text-slate-700 dark:text-slate-300">{formatPrice(item.services_amount, item.offer.currency)}</dd>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="flex justify-between gap-3">
                        <dt className="text-slate-600 dark:text-slate-300">{summary.fee_label} ({formatPercent(summary.fee_percent)})</dt>
                        <dd className="tabular-nums text-slate-900 dark:text-white">{formatPrice(summary.fee_amount, summary.currency)}</dd>
                    </div>
                    <div className="flex items-end justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                        <dt className="font-bold text-slate-900 dark:text-white">Total TTC</dt>
                        <dd className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatPrice(summary.total_amount, summary.currency)}</dd>
                    </div>
                </dl>
                <p className="text-[11px] text-slate-500">Tarifs compagnie incluant les taxes aéroportuaires. Aucun frais supplémentaire au moment du paiement.</p>
                {errors.checkout && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{errors.checkout}</p>}
                <button disabled={processing || expired || !activeItems.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {processing ? "Vérification du tarif…" : `Payer les vols · ${formatPrice(summary.total_amount, summary.currency)}`}
                </button>
                <ul className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700">
                    <li className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-indigo-500" /> Carte, Apple Pay, Google Pay via Stripe</li>
                    <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Paiement chiffré et authentification 3-D Secure</li>
                    <li className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Reçu et billets envoyés par e-mail</li>
                </ul>
                <button type="button" onClick={() => router.delete(route("flights.cart.clear", { section: "flights" }))} className="w-full text-center text-xs text-slate-400 hover:text-rose-600">Retirer tous les vols</button>
            </aside>
        </form>
    );
}
