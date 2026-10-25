import { useState } from "react";
import { Head } from "@inertiajs/react";
import { BedDouble, Info, Plane, ShoppingCart } from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";
import FlightCartSection from "@/Components/Cart/FlightCartSection";
import StayCartSection from "@/Components/Cart/StayCartSection";
import { formatPrice } from "@/Utils/flights";

export default function CartIndex({ flights, stays, defaults, cancelled, section }) {
    const [tab, setTab] = useState(section === "stays" || (!flights.items.length && stays.items.length) ? "stays" : "flights");
    const cancelledNotice = cancelled ? "Paiement annulé. Vos réservations sont toujours dans votre panier." : "";
    const tabs = [
        { key: "flights", label: "Vols", icon: Plane, count: flights.items.length, total: flights.summary, gradient: "from-sky-500 to-indigo-600" },
        { key: "stays", label: "Hébergements", icon: BedDouble, count: stays.items.length, total: stays.summary, gradient: "from-emerald-500 to-teal-600" },
    ];

    return (
        <GuestLayout>
            <Head title="Mon panier" />

            <div className="bg-gradient-to-r from-sky-500 via-indigo-600 to-emerald-500">
                <div className="mx-auto max-w-6xl px-4 pb-0 pt-10 text-white sm:px-6 lg:px-8">
                    <p className="flex items-center gap-2 text-sm font-medium text-white/80"><ShoppingCart className="h-4 w-4" /> Réservation</p>
                    <h1 className="text-3xl font-black">Votre panier</h1>
                    <p className="mt-1 text-sm text-white/80">Vols et hébergements sont réglés séparément : chaque prestataire a ses propres conditions.</p>

                    <div className="mt-6 flex gap-2">
                        {tabs.map((item) => {
                            const Icon = item.icon;
                            const active = tab === item.key;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setTab(item.key)}
                                    className={`flex items-center gap-3 rounded-t-2xl px-5 py-3 text-left transition ${active ? "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-white" : "bg-white/15 text-white hover:bg-white/25"}`}
                                >
                                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white`}><Icon className="h-4 w-4" /></span>
                                    <span>
                                        <span className="block text-sm font-black">{item.label} ({item.count})</span>
                                        {item.count > 0 && <span className={`block text-xs ${active ? "text-slate-500" : "text-white/80"}`}>{formatPrice(item.total.total_amount, item.total.currency)}</span>}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
                {flights.items.length > 0 && stays.items.length > 0 && (
                    <p className="flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        Vous réservez des vols et un hébergement : il s’agit de deux contrats distincts, payés séparément, et non d’un forfait touristique. Chaque prestataire reste responsable de la bonne exécution de sa prestation.
                    </p>
                )}
                {tab === "flights" ? (
                    <FlightCartSection items={flights.items} summary={flights.summary} defaults={defaults} initialNotice={section !== "stays" ? cancelledNotice : ""} />
                ) : (
                    <StayCartSection items={stays.items} summary={stays.summary} defaults={defaults} initialNotice={section === "stays" ? cancelledNotice : ""} />
                )}
            </div>
        </GuestLayout>
    );
}
