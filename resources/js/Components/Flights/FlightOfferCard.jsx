import { useState } from "react";
import { Briefcase, ChevronDown, ExternalLink, Luggage, Plane, RefreshCcw, ShieldCheck, ShieldX } from "lucide-react";
import { dayOffset, formatDuration, formatPrice, localDate, localTime, stopsLabel } from "@/Utils/flights";

export function AirlineLogo({ airline, size = "h-10 w-10" }) {
    const [failed, setFailed] = useState(false);
    if (airline?.logo && !failed) {
        return (
            <span className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-slate-200 dark:ring-slate-700`}>
                <img src={airline.logo} alt="" onError={() => setFailed(true)} className="h-full w-full object-contain" />
            </span>
        );
    }
    return (
        <span className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-black text-white`}>
            {airline?.code || <Plane className="h-4 w-4" />}
        </span>
    );
}

const Badge = ({ icon: Icon, children, tone = "slate" }) => {
    const tones = {
        slate: "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300",
        emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
        sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
            {Icon && <Icon className="h-3 w-3" />} {children}
        </span>
    );
};

export function FlightTimeline({ offer, size = "lg" }) {
    const offset = dayOffset(offer.departure, offer.arrival);
    const time = size === "lg" ? "text-2xl" : "text-lg";
    return (
        <div className="flex flex-1 items-center gap-3">
            <div className="text-left">
                <p className={`${time} font-black tabular-nums text-slate-900 dark:text-white`}>{localTime(offer.departure)}</p>
                <p className="text-xs font-bold text-slate-500">{offer.origin?.code}</p>
            </div>
            <div className="flex min-w-[6rem] flex-1 flex-col items-center">
                <span className="text-[11px] font-medium text-slate-500">{formatDuration(offer.duration_minutes)}</span>
                <div className="relative my-1 h-px w-full bg-gradient-to-r from-sky-300 via-indigo-400 to-violet-400">
                    {Array.from({ length: offer.stops }).map((_, index) => (
                        <span
                            key={index}
                            className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-400 dark:border-slate-800"
                            style={{ left: `${((index + 1) / (offer.stops + 1)) * 100}%` }}
                        />
                    ))}
                    <Plane className="absolute -right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 text-violet-500" />
                </div>
                <span className={`text-[11px] font-semibold ${offer.stops === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                    {stopsLabel(offer.stops)}
                </span>
            </div>
            <div className="text-right">
                <p className={`${time} font-black tabular-nums text-slate-900 dark:text-white`}>
                    {localTime(offer.arrival)}
                    {offset > 0 && <sup className="ml-0.5 text-xs font-bold text-rose-500">+{offset}</sup>}
                </p>
                <p className="text-xs font-bold text-slate-500">{offer.destination?.code}</p>
            </div>
        </div>
    );
}

export function OfferBadges({ offer }) {
    const { baggage = {}, conditions = {} } = offer;
    return (
        <div className="flex flex-wrap gap-1.5">
            {baggage.carry_on != null && (
                <Badge icon={Briefcase} tone={baggage.carry_on > 0 ? "sky" : "slate"}>
                    {baggage.carry_on > 0 ? `Cabine ×${baggage.carry_on}` : "Bagage cabine non inclus"}
                </Badge>
            )}
            {baggage.checked != null && (
                <Badge icon={Luggage} tone={baggage.checked > 0 ? "sky" : "slate"}>
                    {baggage.checked > 0 ? `Soute ×${baggage.checked}` : "Sans bagage en soute"}
                </Badge>
            )}
            {conditions.refundable === true && (
                <Badge icon={ShieldCheck} tone="emerald">
                    Remboursable{conditions.refund_penalty ? ` (frais ${formatPrice(conditions.refund_penalty, offer.currency)})` : ""}
                </Badge>
            )}
            {conditions.refundable === false && <Badge icon={ShieldX} tone="rose">Non remboursable</Badge>}
            {conditions.changeable === true && <Badge icon={RefreshCcw} tone="emerald">Modifiable</Badge>}
            {offer.fare_brand && <Badge>{offer.fare_brand}</Badge>}
        </div>
    );
}

export function SegmentDetails({ offer }) {
    return (
        <ol className="space-y-3">
            {offer.segments.map((segment, index) => {
                const next = offer.segments[index + 1];
                const layover = next ? Math.round((new Date(next.departure.slice(0, 19)) - new Date(segment.arrival.slice(0, 19))) / 60000) : null;
                return (
                    <li key={index}>
                        <div className="flex gap-3">
                            <div className="flex flex-col items-center pt-1">
                                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                                <span className="my-1 w-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                            </div>
                            <div className="flex-1 space-y-2 text-sm">
                                <p className="text-slate-800 dark:text-slate-100">
                                    <span className="font-bold tabular-nums">{localTime(segment.departure)}</span> · {segment.origin.city || segment.origin.name} ({segment.origin.code})
                                    <span className="ml-1 text-xs text-slate-400">{localDate(segment.departure)}</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                    {segment.flight_number} · {segment.carrier}
                                    {segment.operated_by && ` · opéré par ${segment.operated_by}`}
                                    {segment.aircraft && ` · ${segment.aircraft}`} · {formatDuration(segment.duration_minutes)}
                                </p>
                                <p className="text-slate-800 dark:text-slate-100">
                                    <span className="font-bold tabular-nums">{localTime(segment.arrival)}</span> · {segment.destination.city || segment.destination.name} ({segment.destination.code})
                                </p>
                            </div>
                        </div>
                        {layover != null && (
                            <p className="my-2 ml-6 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                                Correspondance à {segment.destination.city || segment.destination.code} · {formatDuration(layover)}
                            </p>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

export default function FlightOfferCard({ offer, onSelect, onPartner, actionLabel = "Choisir ce vol", highlight }) {
    const [open, setOpen] = useState(false);

    return (
        <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800">
            {highlight && (
                <div className={`px-5 py-1 text-[11px] font-bold uppercase tracking-wider text-white ${highlight.className}`}>{highlight.label}</div>
            )}
            <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                <div className="flex items-center gap-3 lg:w-48">
                    <AirlineLogo airline={offer.airline} />
                    <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900 dark:text-white">{offer.airline?.name}</p>
                        <p className="truncate text-xs text-slate-500">
                            {offer.segments?.[0]?.flight_number || offer.flight_number || offer.provider_label}
                            {offer.cabin && ` · ${offer.cabin}`}
                        </p>
                    </div>
                </div>

                <FlightTimeline offer={offer} />

                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-700 lg:w-56 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
                    <div className="lg:text-right">
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatPrice(offer.total_amount, offer.currency)}</p>
                        <p className="text-[11px] text-slate-500">
                            {offer.passengers_count > 1 ? `${formatPrice(offer.per_passenger_total, offer.currency)} / pers. · ` : ""}
                            {offer.bookable ? "taxes et frais inclus" : offer.price_source === "aviasales" ? "prix constaté sur Aviasales" : "prix indicatif"}
                        </p>
                    </div>
                    {offer.bookable ? (
                        <button
                            type="button"
                            onClick={() => onSelect?.(offer)}
                            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-violet-700"
                        >
                            {actionLabel}
                        </button>
                    ) : onPartner ? (
                        <button
                            type="button"
                            onClick={() => onPartner(offer)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:from-orange-600 hover:to-rose-600"
                        >
                            Réserver sur {offer.partner_label || offer.provider_label} <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                    ) : (
                        <a
                            href={offer.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
                        >
                            {offer.partner_label ? `Réserver sur ${offer.partner_label}` : `Voir chez ${offer.provider_label}`} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 dark:border-slate-700 dark:bg-slate-900/30">
                <OfferBadges offer={offer} />
                {offer.segments?.length > 0 && (
                    <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                        Détails du vol <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
                    </button>
                )}
            </div>

            {open && (
                <div className="space-y-4 border-t border-slate-100 px-5 py-4 dark:border-slate-700">
                    <SegmentDetails offer={offer} />
                    <PriceBreakdown offer={offer} />
                </div>
            )}
        </article>
    );
}

export function PriceBreakdown({ offer }) {
    return (
        <dl className="grid gap-1 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900/50">
            {offer.base_amount != null && (
                <div className="flex justify-between"><dt className="text-slate-500">Tarif de la compagnie</dt><dd className="tabular-nums">{formatPrice(offer.base_amount, offer.currency)}</dd></div>
            )}
            {offer.airline_tax_amount != null && (
                <div className="flex justify-between"><dt className="text-slate-500">Taxes aéroportuaires et surcharges</dt><dd className="tabular-nums">{formatPrice(offer.airline_tax_amount, offer.currency)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-slate-500">Taxes et frais de service ({offer.fee_percent} %)</dt><dd className="tabular-nums">{formatPrice(offer.fee_amount, offer.currency)}</dd></div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-bold dark:border-slate-700"><dt>Total pour {offer.passengers_count} passager{offer.passengers_count > 1 ? "s" : ""}</dt><dd className="tabular-nums">{formatPrice(offer.total_amount, offer.currency)}</dd></div>
        </dl>
    );
}
