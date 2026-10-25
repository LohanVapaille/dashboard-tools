import { Link } from "@inertiajs/react";
import LegalShell, { LegalSection } from "@/Components/LegalShell";

// Conditions du modèle « partenaires vendeurs » : le site planifie et oriente, les partenaires vendent.
export default function PartnerTerms({ seller, guestTripLimit, premiumPrice, embeddedHotels }) {
    return (
        <LegalShell title="Conditions générales d’utilisation" subtitle="Planification de voyage, liens vers nos partenaires et abonnement Premium." updatedAt="23 octobre 2026">
            <LegalSection id="service" title="1. Le service">
                <p>
                    {seller.name} est un outil de <strong>planification de voyage</strong> : itinéraire jour par jour, suggestions par intelligence artificielle,
                    carte, budget et dépenses partagées entre voyageurs. Pour réserver un vol, un hébergement ou une activité, le site vous oriente vers des sites
                    partenaires, avec vos dates et le nombre de voyageurs pré-remplis.
                </p>
            </LegalSection>

            <LegalSection id="partenaires" title="2. Réservations : le partenaire est votre vendeur">
                <p>
                    {seller.name} <strong>ne vend aucun billet, hébergement ni activité</strong> et n’encaisse aucun paiement pour ces prestations. En choisissant une offre
                    partenaire (Aviasales, Kiwi.com, Omio, BlaBlaCar, Booking.com, Expedia, Airbnb, GetYourGuide, Viator…), le site du partenaire s’ouvre dans une fenêtre dédiée :
                    la réservation est conclue <strong>directement entre vous et le partenaire</strong> (ou le prestataire vers lequel il vous dirige), selon ses propres conditions de vente.
                </p>
                {embeddedHotels && (
                    <p>
                        <strong>Hôtels réservables sur le site.</strong> Certains hôtels peuvent être réservés sans quitter {seller.name}. La réservation est alors vendue et
                        encaissée par <strong>Nuitée (LiteAPI)</strong>, au moyen de son module de paiement affiché dans la page : Nuitée est votre vendeur, débite votre carte,
                        transmet la réservation à l’hôtel et rembourse selon les conditions du tarif choisi, indiquées avant paiement. {seller.name} transmet votre demande,
                        affiche la confirmation et peut percevoir une commission de Nuitée, incluse dans le prix affiché. Si l’hôtel ne confirme pas la réservation, aucun
                        montant n’est prélevé.
                    </p>
                )}
                <p>
                    <strong>Carnet de réservations.</strong> Vous pouvez enregistrer dans votre voyage les réservations faites chez les partenaires (référence, dates, prix).
                    Ces informations sont saisies par vous et partagées avec les membres du voyage ; elles ne remplacent pas les documents émis par le vendeur.
                </p>
                <p>
                    Le partenaire est seul responsable du prix final, de la disponibilité, du paiement, de l’exécution de la prestation, des modifications,
                    annulations et remboursements, ainsi que du traitement des réclamations correspondantes. Les droits des passagers aériens (règlement (CE) n° 261/2004)
                    s’exercent auprès de la compagnie aérienne.
                </p>
                <p>
                    Les prix affichés sur {seller.name} sont <strong>indicatifs</strong> : ils proviennent des partenaires au moment de la recherche et peuvent évoluer.
                    Seul le prix confirmé sur le site du partenaire, avant paiement, vous engage.
                </p>
                <p>
                    Les prestations réservées séparément auprès de différents partenaires ne constituent pas un forfait touristique au sens de l’article L211-2 du Code du tourisme.
                </p>
            </LegalSection>

            <LegalSection id="remuneration" title="3. Comment le site est rémunéré">
                <p>
                    {seller.name} peut percevoir une <strong>commission d’affiliation</strong> de la part des partenaires lorsqu’une réservation est effectuée après avoir suivi
                    un lien du site. Cette commission est versée par le partenaire et <strong>n’augmente pas le prix que vous payez</strong>. Les liens concernés sont signalés
                    comme liens partenaires.
                </p>
                <p>
                    Le site est également financé par l’abonnement Premium{premiumPrice ? ` (${premiumPrice})` : ""}, sans engagement, résiliable à tout moment.
                </p>
            </LegalSection>

            <LegalSection id="classement" title="4. Classement des résultats">
                <p>Conformément à l’article L111-7 du Code de la consommation, nos critères de classement par défaut sont :</p>
                <ul className="list-disc space-y-1 pl-5">
                    <li><strong>Vols :</strong> compromis entre le prix et la durée du trajet ; tris par prix, durée ou horaire disponibles.</li>
                    <li><strong>Hébergements :</strong> note des voyageurs, classement en étoiles, équipements et distance au lieu recherché.</li>
                </ul>
                <p>Aucun partenaire ne paie pour être mieux classé, et le montant d’une éventuelle commission n’intervient pas dans le classement.</p>
            </LegalSection>

            <LegalSection id="ia" title="5. Suggestions par intelligence artificielle">
                <p>
                    Les programmes, étapes, activités et estimations de prix proposés par l’IA sont des suggestions indicatives, qui peuvent comporter des erreurs
                    (horaires, prix, fermetures, distances). Vérifiez-les auprès des sources officielles avant de vous engager.
                </p>
            </LegalSection>

            <LegalSection id="budget" title="6. Budget et dépenses partagées">
                <p>
                    Le module de budget est un outil de calcul : il aide les voyageurs à répartir leurs dépenses, mais {seller.name} n’intervient dans aucun paiement entre
                    eux et ne garantit pas les remboursements entre participants.
                </p>
            </LegalSection>

            <LegalSection id="premium" title="7. Abonnement Premium">
                <p>
                    Premium débloque des fonctions supplémentaires (générations IA étendues, dépenses partagées illimitées, carnet de voyage PDF), décrites sur la
                    page <Link href={route("billing.show")} className="font-semibold text-indigo-600 hover:underline">Premium</Link>. Le paiement est traité par Stripe ;
                    l’abonnement se renouvelle chaque mois et peut être résilié à tout moment, avec effet à la fin de la période payée. Vous disposez d’un droit de
                    rétractation de 14 jours (article L221-18 du Code de la consommation), auquel vous renoncez si vous demandez à utiliser le service Premium immédiatement.
                </p>
            </LegalSection>

            <LegalSection id="comptes" title="8. Comptes et accès invités">
                <p>
                    Sans compte, vous pouvez créer ou rejoindre jusqu’à {guestTripLimit} voyages depuis cet appareil, sous un pseudonyme visible des autres membres.
                    Le lien de partage d’un voyage donne accès à son contenu à toute personne qui le reçoit ; le propriétaire peut retirer un membre ou modifier ses droits à tout moment.
                </p>
            </LegalSection>

            <LegalSection id="responsabilite" title="9. Responsabilité">
                <p>
                    {seller.name} s’efforce de fournir des informations exactes mais ne peut garantir l’exactitude des données provenant des partenaires ou de sources ouvertes
                    (OpenStreetMap, GeoNames). Sa responsabilité ne saurait être engagée au titre d’une prestation réservée auprès d’un partenaire.
                </p>
            </LegalSection>

            <LegalSection id="reclamations" title="10. Réclamations et médiation">
                <p>
                    Une réclamation sur une réservation s’adresse au partenaire auprès duquel elle a été conclue. Pour toute question sur le site ou l’abonnement Premium :
                    {seller.email ? <> <strong>{seller.email}</strong>.</> : " notre service client."} À défaut de réponse satisfaisante sous 60 jours, vous pouvez saisir
                    gratuitement le médiateur de la consommation : {seller.mediator} (article L612-1 du Code de la consommation).
                </p>
                <p>Les présentes conditions sont soumises au droit français, sans vous priver de la protection des dispositions impératives de votre pays de résidence.</p>
            </LegalSection>
        </LegalShell>
    );
}
