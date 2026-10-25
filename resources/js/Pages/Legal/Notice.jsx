import LegalShell, { LegalSection, Missing, Value } from "@/Components/LegalShell";

const Row = ({ label, value }) => (
    <div className="grid gap-1 border-b border-slate-100 py-2 last:border-0 dark:border-slate-700 sm:grid-cols-[14rem_1fr]">
        <dt className="font-semibold text-slate-800 dark:text-slate-200">{label}</dt>
        <dd><Value value={value} /></dd>
    </div>
);

export default function Notice({ legal, appUrl, directBooking }) {
    const incomplete = [legal.legal_form, legal.address, legal.siret, legal.director, legal.email, legal.host.name, legal.host.address].some((value) => !value);

    return (
        <LegalShell title="Mentions légales" subtitle="Éditeur, hébergeur et informations réglementaires du site." updatedAt="22 octobre 2026">
            {incomplete && (
                <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    Certaines informations obligatoires ne sont pas encore renseignées (<Missing />). Elles se complètent dans le fichier de configuration du site (variables <code>LEGAL_*</code>).
                </p>
            )}

            <LegalSection title="Éditeur du site">
                <dl>
                    <Row label="Raison sociale / nom" value={legal.company} />
                    <Row label="Forme juridique" value={legal.legal_form} />
                    <Row label="Adresse du siège" value={legal.address} />
                    <Row label="SIRET" value={legal.siret} />
                    <Row label="RCS" value={legal.rcs} />
                    <Row label="N° de TVA intracommunautaire" value={legal.vat} />
                    <Row label="Directeur de la publication" value={legal.director} />
                    <Row label="Contact" value={[legal.email, legal.phone].filter(Boolean).join(" · ")} />
                    <Row label="Site" value={appUrl} />
                </dl>
            </LegalSection>

            {directBooking ? (
                <LegalSection title="Activité d’intermédiaire de voyages">
                    <p>
                        {legal.company} agit en tant qu’<strong>intermédiaire</strong> : il met en relation ses clients avec des compagnies aériennes et des établissements d’hébergement, et réserve en leur nom et pour leur compte les prestations choisies. Les prestations de transport et d’hébergement sont exécutées sous la seule responsabilité de ces prestataires.
                    </p>
                    <dl>
                        <Row label="Immatriculation Atout France" value={legal.atout_france} />
                        <Row label="Garantie financière" value={legal.financial_guarantee} />
                        <Row label="Assurance responsabilité civile professionnelle" value={legal.insurance} />
                    </dl>
                    <p className="text-xs text-slate-500">La vente de services de voyage relève du Code du tourisme (articles L211-1 et suivants), qui prévoit une immatriculation au registre des opérateurs de voyages et de séjours tenu par Atout France.</p>
                </LegalSection>
            ) : (
                <LegalSection title="Liens partenaires et affiliation">
                    <p>
                        {legal.company} est un service de planification de voyage. Il ne vend aucune prestation de transport, d’hébergement ou d’activité :
                        les réservations sont conclues directement auprès de sites partenaires (Aviasales, Booking.com, Expedia, Airbnb, GetYourGuide, Viator…),
                        qui en sont les vendeurs et les seuls responsables. {legal.company} peut percevoir une commission d’affiliation sur ces réservations, sans surcoût pour l’utilisateur.
                    </p>
                </LegalSection>
            )}

            <LegalSection title="Hébergement du site">
                <dl>
                    <Row label="Hébergeur" value={legal.host.name} />
                    <Row label="Adresse" value={legal.host.address} />
                    <Row label="Téléphone" value={legal.host.phone} />
                </dl>
            </LegalSection>

            <LegalSection title="Prestataires techniques">
                <ul className="list-disc space-y-1 pl-5">
                    <li><strong>Stripe Payments Europe Ltd.</strong> (Irlande) — {directBooking ? "traitement sécurisé des paiements" : "paiement de l’abonnement Premium"}.</li>
                    <li><strong>Duffel Technology Ltd.</strong> (Royaume-Uni) — {directBooking ? "réservation et émission des billets d’avion" : "recherche de vols"}.</li>
                    {directBooking && <li><strong>Nuitée / LiteAPI</strong> — réservation instantanée d’hôtels.</li>}
                    {!directBooking && <li><strong>Travelpayouts</strong> — réseau d’affiliation des liens partenaires.</li>}
                    <li><strong>OpenStreetMap</strong> (© contributeurs OpenStreetMap, licence ODbL) — cartes et annuaire des hébergements.</li>
                    <li><strong>GeoNames</strong> (geonames.org, licence CC BY 4.0) — grandes villes proposées pour une destination trop large.</li>
                </ul>
            </LegalSection>

            <LegalSection title="Propriété intellectuelle">
                <p>La structure du site, ses textes, graphismes et son code sont la propriété de {legal.company}, sauf mention contraire. Toute reproduction sans autorisation est interdite. Les photos d’hébergements, logos de compagnies et marques citées (Booking.com, Airbnb, Expedia…) appartiennent à leurs titulaires respectifs.</p>
            </LegalSection>

            <LegalSection title="Médiation de la consommation">
                <p>Conformément à l’article L612-1 du Code de la consommation, en cas de litige non résolu avec notre service client sous 60 jours, vous pouvez recourir gratuitement au médiateur : {legal.mediator}.</p>
            </LegalSection>
        </LegalShell>
    );
}
