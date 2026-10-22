import LegalShell, { LegalSection, Value } from "@/Components/LegalShell";
import { openCookieSettings } from "@/Utils/consent";

export default function Privacy({ legal, sessionCookie, sessionMinutes, affiliateEnabled }) {
    const cookies = [
        [sessionCookie, "Maintien de votre session (connexion, panier)", `${sessionMinutes} min d’inactivité`, "Nécessaire"],
        ["XSRF-TOKEN", "Protection des formulaires contre la falsification de requêtes", "Durée de la session", "Nécessaire"],
        ["remember_web_…", "Option « Se souvenir de moi » à la connexion", "Jusqu’à la déconnexion", "Nécessaire"],
        ["guest_token", "Accès à vos voyages sans compte, sur cet appareil", "1 an", "Nécessaire"],
        ["guest_name", "Pseudo choisi pour rejoindre un voyage sans compte", "1 an", "Nécessaire"],
        ["tp_consent", "Mémorisation de vos choix sur les cookies", "6 mois", "Nécessaire"],
        ["Stockage local « flights.home »", "Mémorise votre aéroport de départ habituel", "Jusqu’à effacement du navigateur", "Nécessaire (préférence)"],
        ...(affiliateEnabled ? [["Cookies Travelpayouts (tpembars.com)", "Affiliation : nous rémunérer quand vous réservez chez un partenaire", "Fixée par Travelpayouts", "Soumis à consentement"]] : []),
    ];

    return (
        <LegalShell title="Confidentialité et cookies" subtitle="Quelles données nous traitons, pourquoi, combien de temps, et vos droits." updatedAt="22 octobre 2026">
            <LegalSection title="Responsable du traitement">
                <p>{legal.company}, <Value value={legal.address} />. Contact pour toute question sur vos données : <Value value={legal.email} />.</p>
            </LegalSection>

            <LegalSection title="Données traitées et finalités">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/50">
                            <tr><th className="p-2">Données</th><th className="p-2">Pourquoi</th><th className="p-2">Base légale</th><th className="p-2">Conservation</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            <tr><td className="p-2">Compte : nom, e-mail, photo, mot de passe chiffré</td><td className="p-2">Accès à votre espace et à vos voyages</td><td className="p-2">Contrat</td><td className="p-2">Jusqu’à suppression du compte</td></tr>
                            <tr><td className="p-2">Contenu des voyages : étapes, activités, notes, photos</td><td className="p-2">Fonctionnement du planificateur et partage avec les membres</td><td className="p-2">Contrat</td><td className="p-2">Jusqu’à suppression du voyage ou du compte</td></tr>
                            <tr><td className="p-2">Invités : identifiant d’appareil, pseudo</td><td className="p-2">Accès sans compte à un voyage partagé</td><td className="p-2">Intérêt légitime</td><td className="p-2">1 an</td></tr>
                            <tr><td className="p-2">Réservations : identité, date de naissance, e-mail, téléphone des voyageurs</td><td className="p-2">Transmission aux compagnies et hébergements, gestion de la réservation</td><td className="p-2">Contrat</td><td className="p-2">Durée de la réservation, puis 5 ans (prescription)</td></tr>
                            <tr><td className="p-2">Paiements : montant, référence Stripe (jamais vos données de carte)</td><td className="p-2">Facturation, remboursements, lutte contre la fraude</td><td className="p-2">Obligation légale</td><td className="p-2">10 ans (pièces comptables)</td></tr>
                            <tr><td className="p-2">Position géographique (si vous l’autorisez)</td><td className="p-2">Proposer l’aéroport le plus proche — calculée sur l’instant, non conservée</td><td className="p-2">Consentement (autorisation du navigateur)</td><td className="p-2">Non conservée</td></tr>
                        </tbody>
                    </table>
                </div>
            </LegalSection>

            <LegalSection title="Destinataires">
                <p>Vos données ne sont jamais vendues. Elles sont transmises uniquement aux prestataires nécessaires : compagnies aériennes et hébergements réservés, Duffel (billets d’avion), Nuitée/LiteAPI (hôtels), Stripe (paiement), notre hébergeur et le service d’envoi d’e-mails. Certains de ces prestataires sont situés hors de l’Union européenne (Royaume-Uni, États-Unis) : les transferts sont encadrés par une décision d’adéquation de la Commission européenne ou par des clauses contractuelles types.</p>
            </LegalSection>

            <LegalSection title="Vos droits">
                <p>Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de vos données, ainsi que du droit de définir des directives sur leur sort après votre décès (RGPD et loi Informatique et Libertés). Écrivez à <Value value={legal.email} /> ; nous répondons sous un mois. Vous pouvez aussi supprimer votre compte depuis votre profil, et introduire une réclamation auprès de la CNIL (www.cnil.fr).</p>
            </LegalSection>

            <LegalSection id="cookies" title="Cookies et traceurs">
                <p>Nous n’utilisons <strong>aucun cookie publicitaire ni outil de mesure d’audience</strong>. Les cookies strictement nécessaires sont exemptés de consentement (article 82 de la loi Informatique et Libertés). Les cookies d’affiliation ne sont déposés qu’avec votre accord, que vous pouvez retirer à tout moment.</p>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/50">
                            <tr><th className="p-2">Nom</th><th className="p-2">Finalité</th><th className="p-2">Durée</th><th className="p-2">Catégorie</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {cookies.map(([name, purpose, duration, category]) => (
                                <tr key={name}><td className="p-2 font-mono">{name}</td><td className="p-2">{purpose}</td><td className="p-2">{duration}</td><td className="p-2">{category}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p>Services tiers sans cookie sur notre domaine : les cartes (OpenStreetMap), les logos de compagnies et les photos d’hôtels sont chargés depuis les serveurs de leurs fournisseurs, qui reçoivent votre adresse IP. La page de paiement est hébergée par Stripe, qui y dépose ses propres cookies de sécurité anti-fraude.</p>
                <button type="button" onClick={openCookieSettings} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Modifier mes choix sur les cookies</button>
            </LegalSection>
        </LegalShell>
    );
}
