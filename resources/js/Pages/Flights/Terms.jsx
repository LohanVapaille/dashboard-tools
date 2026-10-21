import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Scale } from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";
import { formatPercent } from "@/Utils/flights";

const Section = ({ id, number, title, children }) => (
    <section id={id} className="scroll-mt-24 space-y-3">
        <h2 className="flex items-center gap-3 text-lg font-black text-slate-900 dark:text-white">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 text-sm text-white">{number}</span>
            {title}
        </h2>
        <div className="space-y-3 pl-11 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</div>
    </section>
);

export default function Terms({ seller, feePercent, feeLabel }) {
    const sections = [
        ["role", "Rôle du vendeur"],
        ["prix", "Prix affichés"],
        ["commande", "Commande, paiement et émission"],
        ["retractation", "Absence de droit de rétractation"],
        ["annulation", "Annulation et modification par le passager"],
        ["taxes", "Remboursement des taxes d’un billet non utilisé"],
        ["ue261", "Annulation, retard ou refus d’embarquement"],
        ["bagages", "Bagages et assistance"],
        ["donnees", "Données personnelles"],
        ["reclamations", "Réclamations et médiation"],
    ];

    return (
        <GuestLayout>
            <Head title="Conditions de vente — billets d’avion" />
            <div className="bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600">
                <div className="mx-auto max-w-4xl px-4 py-10 text-white sm:px-6">
                    <p className="flex items-center gap-2 text-sm font-medium text-indigo-100"><Scale className="h-4 w-4" /> Informations légales</p>
                    <h1 className="text-3xl font-black">Conditions de vente des billets d’avion</h1>
                    <p className="mt-1 text-sm text-indigo-100">Remboursements, annulations et droits des passagers.</p>
                </div>
            </div>

            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[15rem_1fr] lg:px-8">
                <nav className="h-fit space-y-1 rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800 lg:sticky lg:top-24">
                    {sections.map(([id, label], index) => (
                        <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/40">
                            {index + 1}. {label}
                        </a>
                    ))}
                </nav>

                <article className="space-y-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-10">
                    <Section id="role" number={1} title="Rôle du vendeur">
                        <p>
                            {seller.name} agit en qualité d’intermédiaire : il réserve et émet, au nom du passager, des billets auprès des compagnies aériennes par l’intermédiaire de son partenaire technologique Duffel. Le contrat de transport est conclu entre le passager et la compagnie, dont les conditions générales de transport s’appliquent (bagages, enregistrement, documents de voyage).
                        </p>
                        <p>La vente d’un vol seul ne constitue pas un forfait touristique au sens du Code du tourisme.</p>
                    </Section>

                    <Section id="prix" number={2} title="Prix affichés">
                        <p>
                            Conformément à l’article 23 du règlement (CE) n° 1008/2008, le prix affiché dès la recherche est le prix final à payer. Il comprend :
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>le tarif de la compagnie aérienne ;</li>
                            <li>les taxes, redevances aéroportuaires et surcharges perçues par la compagnie ;</li>
                            <li>les « {feeLabel} » de {seller.name}, soit {formatPercent(feePercent)} du prix de la compagnie.</li>
                        </ul>
                        <p>Le détail de ces montants est indiqué sur chaque vol, dans le panier, sur la page de paiement et sur le reçu. Aucun frais n’est ajouté après le récapitulatif.</p>
                    </Section>

                    <Section id="commande" number={3} title="Commande, paiement et émission">
                        <p>
                            Le tarif est revérifié auprès de la compagnie au moment de l’ajout au panier puis juste avant le paiement. Une offre reste réservée au maximum 30 minutes dans le panier. Si le prix change, le nouveau montant vous est présenté avant tout débit.
                        </p>
                        <p>
                            Le paiement est traité par Stripe (carte bancaire avec authentification forte 3-D Secure, Apple Pay, Google Pay). {seller.name} n’a jamais accès à vos données de carte.
                        </p>
                        <p>
                            Les billets sont émis immédiatement après le paiement. Si une compagnie ne peut pas émettre un billet, la totalité du montant correspondant (vol et frais) est remboursée automatiquement sur le moyen de paiement utilisé ; le délai d’apparition sur votre compte est généralement de 5 à 10 jours ouvrés.
                        </p>
                        <p>La confirmation de commande, la référence de réservation de la compagnie et le reçu sont envoyés par e-mail et restent consultables dans « Mes réservations ».</p>
                    </Section>

                    <Section id="retractation" number={4} title="Absence de droit de rétractation">
                        <p>
                            Les contrats de transport de passagers sont exclus du droit de rétractation de 14 jours applicable aux ventes à distance (article L221-2 du Code de la consommation). Une fois le paiement effectué, la réservation ne peut être annulée que dans les conditions du tarif choisi (article 5).
                        </p>
                    </Section>

                    <Section id="annulation" number={5} title="Annulation et modification par le passager">
                        <p>
                            Chaque vol indique avant l’achat s’il est <strong>remboursable</strong> (avec ou sans frais) et <strong>modifiable</strong>. Ces règles sont fixées par la compagnie.
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Tarif remboursable : l’annulation se fait depuis « Mes réservations ». Le montant remboursé par la compagnie, déduction faite de ses éventuelles pénalités, vous est affiché avant confirmation puis reversé sur votre moyen de paiement.</li>
                            <li>Tarif non remboursable : seul le remboursement des taxes liées à l’embarquement est possible (article 6).</li>
                            <li>Les {feeLabel.toLowerCase()} rémunèrent un service déjà rendu (recherche, émission, gestion) et ne sont pas remboursés en cas d’annulation à l’initiative du passager. Ils sont remboursés si le billet n’a pas pu être émis.</li>
                            <li>Un vol aller-retour acheté en deux billets distincts (aller et retour) : chaque billet est annulable indépendamment.</li>
                        </ul>
                    </Section>

                    <Section id="taxes" number={6} title="Remboursement des taxes d’un billet non utilisé">
                        <p>
                            Lorsqu’un billet n’est plus valable et n’a pas été utilisé, les taxes et redevances individualisées dont l’exigibilité dépend de l’embarquement effectif du passager (par exemple certaines taxes d’aéroport) sont remboursées sur simple demande, au plus tard 30 jours après sa réception (article L224-66 du Code de la consommation).
                        </p>
                        <p>La demande se fait en ligne depuis « Mes réservations » et est <strong>gratuite</strong>.</p>
                    </Section>

                    <Section id="ue261" number={7} title="Annulation, retard ou refus d’embarquement par la compagnie">
                        <p>
                            Le règlement (CE) n° 261/2004 s’applique aux vols au départ d’un aéroport de l’Union européenne, et aux vols à destination de l’UE opérés par une compagnie européenne. La compagnie qui opère le vol est seule débitrice de ces droits :
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[28rem] text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/50">
                                    <tr><th className="p-2">Situation</th><th className="p-2">Vos droits</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    <tr><td className="p-2 font-semibold">Vol annulé</td><td className="p-2">Remboursement du billet sous 7 jours ou réacheminement, assistance, et indemnisation sauf si prévenu au moins 14 jours avant ou circonstances extraordinaires.</td></tr>
                                    <tr><td className="p-2 font-semibold">Arrivée avec 3 h de retard ou plus</td><td className="p-2">Indemnisation forfaitaire (jurisprudence CJUE, arrêt Sturgeon), sauf circonstances extraordinaires.</td></tr>
                                    <tr><td className="p-2 font-semibold">Retard de 5 h ou plus au départ</td><td className="p-2">Droit au remboursement du billet si vous renoncez au voyage.</td></tr>
                                    <tr><td className="p-2 font-semibold">Refus d’embarquement (surréservation)</td><td className="p-2">Indemnisation immédiate, remboursement ou réacheminement, et assistance.</td></tr>
                                    <tr><td className="p-2 font-semibold">Attente à l’aéroport</td><td className="p-2">Repas, rafraîchissements, communications et, si nécessaire, hôtel et transfert.</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p>
                            Montant de l’indemnisation : <strong>250 €</strong> pour les vols jusqu’à 1 500 km, <strong>400 €</strong> pour les vols intracommunautaires de plus de 1 500 km et les autres vols de 1 500 à 3 500 km, <strong>600 €</strong> au-delà. Il peut être réduit de 50 % en cas de réacheminement avec un faible retard à l’arrivée.
                        </p>
                        <p>
                            La réclamation est à adresser à la compagnie ; nous vous transmettons sur demande les éléments de votre réservation. En France, l’action en justice se prescrit par 5 ans.
                        </p>
                    </Section>

                    <Section id="bagages" number={8} title="Bagages et assistance">
                        <p>
                            La responsabilité de la compagnie pour les bagages est encadrée par la Convention de Montréal. Signalez tout dommage dès l’arrivée et confirmez par écrit à la compagnie dans les 7 jours (21 jours pour un retard de bagage).
                        </p>
                        <p>
                            Les personnes handicapées ou à mobilité réduite bénéficient d’une assistance gratuite (règlement (CE) n° 1107/2006) : signalez votre besoin à la compagnie au moins 48 heures avant le départ.
                        </p>
                    </Section>

                    <Section id="donnees" number={9} title="Données personnelles">
                        <p>
                            Les données des passagers (identité, date de naissance, coordonnées) sont transmises à la compagnie aérienne et à Duffel pour l’émission du billet, et à Stripe pour le paiement. Elles sont conservées pendant la durée nécessaire à la gestion de la réservation et aux obligations comptables. Vous disposez d’un droit d’accès, de rectification et d’effacement (RGPD){seller.email ? ` en écrivant à ${seller.email}` : ""}.
                        </p>
                    </Section>

                    <Section id="reclamations" number={10} title="Réclamations et médiation">
                        <p>
                            Toute réclamation peut être adressée {seller.email ? <>à <strong>{seller.email}</strong></> : "au service client"}. À défaut de réponse satisfaisante dans un délai de 60 jours, vous pouvez saisir gratuitement le médiateur : {seller.mediator}.
                        </p>
                        <p>Les présentes conditions sont soumises au droit français, sans vous priver de la protection des dispositions impératives de votre pays de résidence.</p>
                    </Section>

                    <p className="border-t border-slate-200 pt-6 text-xs text-slate-400 dark:border-slate-700">
                        {seller.name}{seller.address ? ` · ${seller.address}` : ""}{seller.email ? ` · ${seller.email}` : ""}
                    </p>

                    <Link href={route("trips.index")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline">
                        <ArrowLeft className="h-4 w-4" /> Retour à mes voyages
                    </Link>
                </article>
            </div>
        </GuestLayout>
    );
}
