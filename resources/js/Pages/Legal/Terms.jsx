import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, BedDouble, Plane, Scale, ShieldCheck, Users } from "lucide-react";
import GuestLayout from "@/Layouts/GuestLayout";
import { formatPercent } from "@/Utils/flights";

const Section = ({ id, number, title, children }) => (
    <section id={id} className="scroll-mt-24 space-y-3">
        <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 dark:text-white">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 text-sm text-white">{number}</span>
            {title}
        </h3>
        <div className="space-y-3 pl-11 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</div>
    </section>
);

const Part = ({ icon: Icon, title, gradient, children }) => (
    <div className="space-y-8">
        <h2 className={`flex items-center gap-3 rounded-2xl bg-gradient-to-r ${gradient} px-5 py-3 text-base font-black uppercase tracking-wide text-white`}>
            <Icon className="h-5 w-5" /> {title}
        </h2>
        {children}
    </div>
);

export default function Terms({ seller, flightFeePercent, flightFeeLabel, stayFeePercent, stayFeeLabel, guestTripLimit }) {
    const toc = [
        ["general", "Dispositions générales", [["vendeur", "Qui sommes-nous"], ["prix", "Prix et frais"], ["paiement", "Commande et paiement"], ["frais", "Frais de service"], ["retractation", "Droit de rétractation"]]],
        ["vols", "Billets d’avion", [["vols-annulation", "Annulation par le passager"], ["vols-taxes", "Remboursement des taxes"], ["vols-261", "Retard, annulation, refus d’embarquement"], ["vols-bagages", "Bagages et assistance"]]],
        ["hebergements", "Hébergements", [["heb-role", "Contrat avec l’hébergeur"], ["heb-annulation", "Annulation et remboursement"], ["heb-sejour", "Taxe de séjour et sur place"], ["heb-probleme", "Problème à l’arrivée"], ["heb-partenaires", "Offres de sites partenaires"]]],
        ["autres", "Plateforme et données", [["forfait", "Vols + hébergement : pas de forfait"], ["classement", "Classement des résultats"], ["comptes", "Comptes et accès invités"], ["donnees", "Données personnelles"], ["reclamations", "Réclamations et médiation"]]],
    ];
    let counter = 0;
    const n = () => ++counter;

    return (
        <GuestLayout>
            <Head title="Conditions générales de vente et d’utilisation" />
            <div className="bg-gradient-to-r from-sky-500 via-indigo-600 to-emerald-500">
                <div className="mx-auto max-w-5xl px-4 py-10 text-white sm:px-6">
                    <p className="flex items-center gap-2 text-sm font-medium text-white/80"><Scale className="h-4 w-4" /> Informations légales</p>
                    <h1 className="text-3xl font-black">Conditions générales de vente et d’utilisation</h1>
                    <p className="mt-1 text-sm text-white/80">Vols, hébergements, remboursements, droits des voyageurs et protection de vos données.</p>
                </div>
            </div>

            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[16rem_1fr] lg:px-8">
                <nav className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-800 lg:sticky lg:top-24">
                    {toc.map(([id, label, items]) => (
                        <div key={id}>
                            <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
                            {items.map(([anchor, text]) => (
                                <a key={anchor} href={`#${anchor}`} className="block rounded-lg px-2 py-1 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/40">{text}</a>
                            ))}
                        </div>
                    ))}
                </nav>

                <article className="space-y-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-10">
                    <Part icon={ShieldCheck} title="Dispositions générales" gradient="from-slate-700 to-slate-900">
                        <Section id="vendeur" number={n()} title="Qui sommes-nous">
                            <p>
                                {seller.name}{seller.address ? `, ${seller.address}` : ""}{seller.email ? ` (contact : ${seller.email})` : ""} édite une application de préparation de voyages et agit uniquement en qualité d’<strong>intermédiaire</strong> : il réserve, au nom et pour le compte du client, des billets d’avion (via Duffel) et des hébergements (via Nuitée/LiteAPI). Il n’est ni transporteur ni hébergeur. Le contrat de transport ou d’hébergement est conclu directement entre le client et le prestataire, qui exécute la prestation sous sa seule responsabilité et selon ses propres conditions. {seller.name} reste responsable de la bonne transmission de la réservation et des erreurs de réservation qui lui sont imputables.
                            </p>
                        </Section>

                        <Section id="prix" number={n()} title="Prix et frais">
                            <p>Conformément au Code de la consommation (art. L112-1) et, pour l’aérien, à l’article 23 du règlement (CE) n° 1008/2008, le prix affiché dès les résultats de recherche est le prix final, toutes taxes comprises. Il se décompose en :</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li><strong>Vols :</strong> tarif de la compagnie, taxes et redevances aéroportuaires, bagages éventuellement ajoutés, et « {flightFeeLabel} » de {formatPercent(flightFeePercent)}.</li>
                                <li><strong>Hébergements :</strong> prix de l’hébergeur taxes incluses, et « {stayFeeLabel} » de {formatPercent(stayFeePercent)}. La taxe de séjour et certaines taxes locales peuvent être perçues sur place ; leur montant est affiché avant le paiement lorsqu’il est connu.</li>
                            </ul>
                            <p>Le détail figure sur chaque offre, dans le panier, sur la page de paiement et sur le reçu. Aucun frais n’est ajouté après le récapitulatif.</p>
                        </Section>

                        <Section id="paiement" number={n()} title="Commande et paiement">
                            <p>Le prix est revérifié auprès du prestataire à l’ajout au panier puis juste avant le paiement ; une offre est conservée au maximum 30 minutes. Toute variation vous est présentée avant débit.</p>
                            <p>Vols et hébergements sont réglés par deux paiements distincts. Le paiement est traité par Stripe (carte avec authentification forte 3-D Secure, Apple Pay, Google Pay) ; nous n’avons jamais accès à vos données de carte.</p>
                            <p>La réservation est confirmée immédiatement après le paiement. Si un prestataire ne peut pas la confirmer, le montant correspondant (frais compris) est remboursé automatiquement sur le moyen de paiement utilisé, généralement sous 5 à 10 jours ouvrés.</p>
                        </Section>

                        <Section id="frais" number={n()} title="Frais de service">
                            <p>Les « {flightFeeLabel} » ({formatPercent(flightFeePercent)} sur les vols) et les « {stayFeeLabel} » ({formatPercent(stayFeePercent)} sur les hébergements) rémunèrent notre service d’intermédiation : recherche et comparaison des offres, vérification du prix, réservation, émission, transmission des informations et assistance.</p>
                            <p>Ce service est rendu dès la confirmation de la réservation. En conséquence, <strong>les frais de service ne sont pas remboursables</strong>, y compris en cas d’annulation ou de modification à votre initiative, de non-présentation, ou d’annulation, de retard ou de modification décidés par la compagnie ou l’hébergement. Dans ces derniers cas, le remboursement ou l’indemnisation de la prestation elle-même relève du prestataire, que nous vous aidons à solliciter.</p>
                            <p>Seule exception : si la réservation n’a pas pu être confirmée ou le billet émis après votre paiement, aucun service n’a été rendu et la totalité du montant payé, frais compris, vous est remboursée automatiquement.</p>
                        </Section>

                        <Section id="retractation" number={n()} title="Droit de rétractation">
                            <p>Le délai de rétractation de 14 jours des ventes à distance ne s’applique pas :</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>aux contrats de transport de passagers (article L221-2 du Code de la consommation) ;</li>
                                <li>aux prestations d’hébergement fournies à une date ou une période déterminée (article L221-28, 12° du même code).</li>
                            </ul>
                            <p>Une réservation payée ne peut donc être annulée que selon les conditions du tarif choisi, toujours affichées avant l’achat.</p>
                        </Section>
                    </Part>

                    <Part icon={Plane} title="Billets d’avion" gradient="from-sky-500 to-indigo-600">
                        <Section id="vols-annulation" number={n()} title="Annulation par le passager">
                            <p>Chaque vol indique s’il est remboursable (avec ou sans pénalité) et modifiable. Les billets aller et retour sont émis séparément et annulables indépendamment depuis « Mes réservations ». Le montant remboursé par la compagnie vous est présenté avant confirmation.</p>
                            <p>Les {flightFeeLabel.toLowerCase()} ne sont pas remboursables (voir « Frais de service »). Le prix du billet est remboursé selon les règles du tarif ou les droits prévus par la réglementation, par la compagnie, et vous est reversé dès sa réception.</p>
                        </Section>
                        <Section id="vols-taxes" number={n()} title="Remboursement des taxes d’un billet non utilisé">
                            <p>Les taxes et redevances dont l’exigibilité dépend de l’embarquement effectif sont remboursées sur demande lorsque le billet n’a pas été utilisé, au plus tard 30 jours après la demande, gratuitement lorsqu’elle est faite en ligne (article L224-66 du Code de la consommation).</p>
                        </Section>
                        <Section id="vols-261" number={n()} title="Retard, annulation, refus d’embarquement">
                            <p>Le règlement (CE) n° 261/2004 s’applique aux vols au départ de l’Union européenne et aux vols vers l’UE opérés par une compagnie européenne. La compagnie qui opère le vol doit :</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>en cas d’annulation : rembourser sous 7 jours ou réacheminer, assister, et indemniser sauf information au moins 14 jours avant ou circonstances extraordinaires ;</li>
                                <li>en cas d’arrivée avec 3 h de retard ou plus : indemniser (CJUE, arrêt Sturgeon) ; à partir de 5 h, vous pouvez renoncer au voyage et être remboursé ;</li>
                                <li>en cas de refus d’embarquement : indemniser immédiatement et rembourser ou réacheminer.</li>
                            </ul>
                            <p>Indemnisation : <strong>250 €</strong> (jusqu’à 1 500 km), <strong>400 €</strong> (vols intra-UE de plus de 1 500 km et autres vols de 1 500 à 3 500 km), <strong>600 €</strong> (au-delà), réductible de 50 % en cas de réacheminement avec faible retard. La réclamation s’adresse à la compagnie ; en France, l’action en justice se prescrit par 5 ans.</p>
                        </Section>
                        <Section id="vols-bagages" number={n()} title="Bagages et assistance">
                            <p>Les bagages inclus et ceux achetés en option sont indiqués sur le billet. La responsabilité de la compagnie est encadrée par la Convention de Montréal : signalez tout dommage à l’aéroport et confirmez-le par écrit dans les 7 jours (21 jours en cas de retard de bagage).</p>
                            <p>Les personnes handicapées ou à mobilité réduite bénéficient d’une assistance gratuite (règlement (CE) n° 1107/2006) à demander à la compagnie au moins 48 h avant le départ.</p>
                        </Section>
                    </Part>

                    <Part icon={BedDouble} title="Hébergements" gradient="from-emerald-500 to-teal-600">
                        <Section id="heb-role" number={n()} title="Contrat avec l’hébergeur">
                            <p>Pour les hébergements marqués « Réservation instantanée », nous transmettons votre réservation à l’établissement par l’intermédiaire de Nuitée (LiteAPI), qui l’exécute selon ses conditions (horaires d’arrivée et de départ, règlement intérieur, caution éventuelle). Le classement en étoiles est celui déclaré par l’établissement ou par l’organisme officiel du pays (Atout France en France).</p>
                        </Section>
                        <Section id="heb-annulation" number={n()} title="Annulation et remboursement">
                            <p>Chaque tarif indique avant l’achat s’il est annulable gratuitement (et jusqu’à quelle date), partiellement remboursable ou non remboursable. L’annulation se fait depuis « Mes réservations » ; le montant remboursé par l’hébergement vous est affiché avant confirmation et reversé sur votre moyen de paiement.</p>
                            <p>Les {stayFeeLabel.toLowerCase()} ne sont pas remboursables (voir « Frais de service »). Le prix de l’hébergement est remboursé par l’établissement selon les conditions du tarif, et vous est reversé dès sa réception.</p>
                        </Section>
                        <Section id="heb-sejour" number={n()} title="Taxe de séjour et paiements sur place">
                            <p>La taxe de séjour (articles L2333-26 et suivants du Code général des collectivités territoriales en France) et certaines taxes locales à l’étranger sont souvent collectées directement par l’établissement. Les montants connus sont affichés avant le paiement sous la mention « à régler sur place ». Les services consommés sur place (minibar, parking…) sont facturés par l’établissement.</p>
                        </Section>
                        <Section id="heb-probleme" number={n()} title="Problème à l’arrivée">
                            <p>Si l’hébergement est indisponible (surréservation) ou ne correspond manifestement pas à sa description, signalez-le immédiatement à l’établissement et à notre service client. Nous vous aidons à obtenir un relogement de catégorie équivalente ou le remboursement des nuits non effectuées.</p>
                        </Section>
                        <Section id="heb-partenaires" number={n()} title="Offres de sites partenaires">
                            <p>Les hébergements sans prix proviennent de la base ouverte OpenStreetMap (© contributeurs OpenStreetMap, licence ODbL). Les boutons Booking.com, Airbnb, Expedia, Google Hotels ou « site officiel » vous redirigent vers ces sites avec vos dates pré-remplies : la réservation est alors conclue directement avec eux, selon leurs conditions, et nous n’en sommes pas partie. Nous pouvons percevoir une commission d’affiliation sur certaines de ces redirections, sans surcoût pour vous.</p>
                        </Section>
                    </Part>

                    <Part icon={Users} title="Plateforme et données" gradient="from-violet-500 to-fuchsia-600">
                        <Section id="forfait" number={n()} title="Vols + hébergement : pas de forfait">
                            <p>Les vols et les hébergements sont choisis, confirmés et payés séparément. Ils ne constituent pas un forfait touristique au sens de l’article L211-2 du Code du tourisme (directive (UE) 2015/2302). Vous ne bénéficiez donc pas des droits propres aux forfaits : chaque prestataire est seul responsable de la bonne exécution de sa prestation, et les droits applicables sont ceux décrits pour chaque type de réservation.</p>
                        </Section>
                        <Section id="classement" number={n()} title="Classement des résultats">
                            <p>Conformément à l’article L111-7 du Code de la consommation, voici nos critères de classement par défaut (« Recommandés ») :</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li><strong>Vols :</strong> compromis entre le prix total et la durée du trajet ; tris par prix, durée ou horaire disponibles.</li>
                                <li><strong>Hébergements :</strong> offres réservables dans l’application en premier, puis note des voyageurs, classement en étoiles, nombre d’équipements et distance au centre de la recherche.</li>
                            </ul>
                            <p>Aucun prestataire ne paie pour être mieux classé. Le montant de nos frais est le même quel que soit le prestataire.</p>
                        </Section>
                        <Section id="comptes" number={n()} title="Comptes et accès invités">
                            <p>Sans compte, vous pouvez créer ou rejoindre jusqu’à {guestTripLimit} voyages depuis cet appareil, sous un pseudonyme visible des autres membres. L’assistant de génération d’itinéraire par IA et les réservations nécessitent un compte. En créant un compte, vos voyages d’invité y sont automatiquement rattachés.</p>
                            <p>Le lien de partage d’un voyage donne accès à son contenu à toute personne qui le reçoit ; le propriétaire peut retirer un membre ou modifier ses droits à tout moment.</p>
                        </Section>
                        <Section id="donnees" number={n()} title="Données personnelles">
                            <p>Responsable de traitement : {seller.name}. Les données des voyageurs (identité, date de naissance, coordonnées) sont transmises aux compagnies aériennes, aux hébergements et à Duffel pour exécuter les réservations, et à Stripe pour le paiement (base légale : exécution du contrat). Elles sont conservées pendant la durée nécessaire à la gestion des réservations puis 10 ans pour les pièces comptables.</p>
                            <p>Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité (RGPD){seller.email ? `, à exercer à ${seller.email}` : ""}, et pouvez saisir la CNIL (www.cnil.fr).</p>
                        </Section>
                        <Section id="reclamations" number={n()} title="Réclamations et médiation">
                            <p>Toute réclamation peut être adressée {seller.email ? <>à <strong>{seller.email}</strong></> : "à notre service client"}. À défaut de réponse satisfaisante sous 60 jours, vous pouvez saisir gratuitement le médiateur de la consommation : {seller.mediator} (article L612-1 du Code de la consommation).</p>
                            <p>Les présentes conditions sont soumises au droit français, sans vous priver de la protection des dispositions impératives de votre pays de résidence.</p>
                        </Section>
                    </Part>

                    <p className="border-t border-slate-200 pt-6 text-xs text-slate-400 dark:border-slate-700">
                        {seller.name}{seller.address ? ` · ${seller.address}` : ""}{seller.email ? ` · ${seller.email}` : ""}
                    </p>
                    <Link href={route("trips.index")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Retour à mes voyages</Link>
                </article>
            </div>
        </GuestLayout>
    );
}
