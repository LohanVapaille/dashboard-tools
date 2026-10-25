import { useState } from "react";
import { BadgeCheck, MapPin, ShieldCheck, Star, Zap } from "lucide-react";
import { formatPrice } from "@/Utils/flights";
import { amenityMeta, mapThumbnail, typeMeta } from "@/Utils/stays";

export function Stars({ count, className = "h-3.5 w-3.5" }) {
    if (!count) return null;
    return (
        <span className="inline-flex items-center gap-0.5 text-amber-400" title={`${count} étoile${count > 1 ? "s" : ""}`}>
            {Array.from({ length: count }, (_, index) => <Star key={index} className={`${className} fill-current`} />)}
        </span>
    );
}

/** Photo de l'hébergement, ou à défaut la carte du quartier avec un repère. */
export function PropertyCover({ property, className = "h-48" }) {
    const [failed, setFailed] = useState(false);
    const type = typeMeta[property.type] || typeMeta.hotel;
    const TypeIcon = type.icon;

    if (property.photos?.[0] && !failed) {
        return <img src={property.photos[0]} alt="" loading="lazy" onError={() => setFailed(true)} className={`${className} w-full object-cover`} />;
    }

    const tile = mapThumbnail(property.lat, property.lng);
    const size = 640; // tuile agrandie pour couvrir la carte ; le point de l'hébergement est recentré
    return (
        <div
            className={`relative ${className} w-full overflow-hidden bg-slate-200`}
            style={{
                backgroundImage: `url(${tile.url})`,
                backgroundSize: `${size}px ${size}px`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: `calc(50% - ${(parseFloat(tile.pinLeft) / 100 - 0.5) * size}px) calc(50% - ${(parseFloat(tile.pinTop) / 100 - 0.5) * size}px)`,
            }}
        >
            <div className={`absolute inset-0 bg-gradient-to-t ${type.gradient} opacity-30 mix-blend-multiply`} />
            <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-xl ring-4 ring-white/50">
                <TypeIcon className="h-5 w-5" />
            </span>
        </div>
    );
}

export default function StayPropertyCard({ property, onOpen, highlighted, onHover }) {
    const type = typeMeta[property.type] || typeMeta.hotel;
    const amenities = (property.amenities || []).filter((key) => amenityMeta[key]).slice(0, 5);

    return (
        <article
            onMouseEnter={() => onHover?.(property.id)}
            onMouseLeave={() => onHover?.(null)}
            className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:bg-slate-800 ${highlighted ? "border-emerald-400 ring-2 ring-emerald-300" : "border-slate-200 dark:border-slate-700"}`}
            onClick={() => onOpen(property)}
        >
            <div className="relative">
                <PropertyCover property={property} />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow">
                    {type.label}
                </span>
                {property.bookable ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                        <Zap className="h-3 w-3" /> Réservation instantanée
                    </span>
                ) : null}
                {property.rating && (
                    <span className="absolute bottom-3 right-3 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-black text-white shadow">
                        {property.rating.toFixed(1)}
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
                <div>
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 font-bold leading-snug text-slate-900 group-hover:text-emerald-700 dark:text-white">{property.name}</h4>
                        <Stars count={property.stars} />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{property.distance_km} km du centre{property.address ? ` · ${property.address}` : ""}</span>
                    </p>
                </div>

                {amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {amenities.map((key) => {
                            const Icon = amenityMeta[key].icon;
                            return (
                                <span key={key} title={amenityMeta[key].label} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    <Icon className="h-3 w-3" /> {amenityMeta[key].label}
                                </span>
                            );
                        })}
                    </div>
                )}

                <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                    {property.price ? (
                        <div>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{formatPrice(property.price.total_amount, property.price.currency)}</p>
                            <p className="text-[11px] text-slate-500">
                                {property.price.nights} nuit{property.price.nights > 1 ? "s" : ""} · {formatPrice(property.price.per_night, property.price.currency)} / nuit · taxes incluses
                            </p>
                            {property.free_cancellation && (
                                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><ShieldCheck className="h-3 w-3" /> Annulation possible</p>
                            )}
                        </div>
                    ) : property.members_only ? (
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Prix membres · connectez-vous pour les voir</p>
                    ) : (
                        <p className="text-xs text-slate-500">Comparez les prix sur Booking, Airbnb, Expedia…</p>
                    )}
                    <span className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-white shadow ${property.bookable ? "bg-gradient-to-r from-emerald-600 to-teal-600" : "bg-slate-800"}`}>
                        {property.bookable ? "Voir les chambres" : "Voir l’offre"}
                    </span>
                </div>
                {property.brand && <p className="flex items-center gap-1 text-[11px] text-slate-400"><BadgeCheck className="h-3 w-3" /> {property.brand}</p>}
            </div>
        </article>
    );
}
