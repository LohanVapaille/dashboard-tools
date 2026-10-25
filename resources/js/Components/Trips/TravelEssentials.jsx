import { CarFront, ExternalLink, PlaneLanding, ShieldAlert, Smartphone } from "lucide-react";
import { usePartnerBooking } from "@/Components/Reservations/TripReservations";
import { TRANSPORT_KINDS } from "@/Components/Reservations/kinds";

/** Pays visités, dans l'ordre du voyage, sans doublon (détectés côté serveur pour chaque étape). */
const countriesOf = (trip) => [...new Map((trip.stays || []).filter((stay) => stay.country).map((stay) => [stay.country.code, stay.country])).values()];

/**
 * « Préparer le départ » : services utiles au voyage, réservés chez des partenaires affiliés.
 * Chaque lien s'ouvre dans la fenêtre partenaire (lien affilié calculé par le serveur).
 */
export default function TravelEssentials({ trip }) {
    const partner = usePartnerBooking(trip, TRANSPORT_KINDS);
    const countries = countriesOf(trip);
    const abroad = countries.filter((country) => country.code !== "FR");
    const first = trip.stays?.[0];
    const city = first?.location_name?.split(",")[0];

    const cards = [
        abroad.length > 0 && {
            key: "esim",
            Icon: Smartphone,
            title: `Internet en ${abroad.map((country) => country.name).join(", ")}`,
            text: "eSIM à installer avant le départ : pas de frais d’itinérance, pas de carte à acheter sur place.",
            gradient: "from-violet-500 to-fuchsia-500",
            links: [
                ["Airalo", `https://www.airalo.com/${abroad[0].slug}-esim`],
                ["Saily", `https://saily.com/esim-${abroad[0].slug}/`],
                ["Yesim", "https://yesim.app/"],
            ],
        },
        city && {
            key: "transfer",
            Icon: PlaneLanding,
            title: `Transfert aéroport → ${city}`,
            text: "Chauffeur réservé à l’avance, qui vous attend à l’arrivée avec votre nom.",
            gradient: "from-sky-500 to-indigo-500",
            draft: { kind: "car", title: `Transfert aéroport → ${city}`, starts_at: first.arrival_date ? `${first.arrival_date}T12:00` : "" },
            links: [
                ["Welcome Pickups", "https://www.welcomepickups.com/"],
                ["GetTransfer", "https://gettransfer.com/fr"],
            ],
        },
        city && {
            key: "car",
            Icon: CarFront,
            title: "Louer une voiture",
            text: "Comparez les loueurs pour vos étapes, assurance et kilométrage compris.",
            gradient: "from-amber-500 to-orange-500",
            draft: { kind: "car", title: `Location de voiture · ${city}`, starts_at: first.arrival_date ? `${first.arrival_date}T10:00` : "", ends_at: trip.end_date ? `${trip.end_date}T10:00` : "" },
            links: [
                ["AutoEurope", "https://www.autoeurope.fr/"],
                ["QEEQ", "https://www.qeeq.com/"],
            ],
        },
        {
            key: "airhelp",
            Icon: ShieldAlert,
            title: "Vol retardé ou annulé ?",
            text: "Jusqu’à 600 € d’indemnité par passager (règlement européen 261/2004), même plusieurs années après.",
            gradient: "from-rose-500 to-red-500",
            links: [["Vérifier avec AirHelp", "https://www.airhelp.com/fr/"]],
        },
    ].filter(Boolean);

    return (
        <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Préparer le départ</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <article key={card.key} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-start gap-3">
                            <span className={`rounded-xl bg-gradient-to-br p-2 text-white shadow ${card.gradient}`}><card.Icon className="h-5 w-5" /></span>
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white">{card.title}</h4>
                                <p className="mt-0.5 text-xs text-slate-500">{card.text}</p>
                            </div>
                        </div>
                        <div className="mt-auto flex flex-wrap gap-1.5">
                            {card.links.map(([label, url]) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => partner.open(url, card.draft ? { ...card.draft, provider: label } : null)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200"
                                >
                                    {label} <ExternalLink className="h-3 w-3" />
                                </button>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
            <p className="text-[11px] text-slate-400">Liens partenaires : réservation et paiement chez le partenaire. Nous pouvons percevoir une commission, sans surcoût pour vous.</p>
            {partner.element}
        </section>
    );
}
