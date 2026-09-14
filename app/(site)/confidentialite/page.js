import { PageLegale, Section, Placeholder } from "@/components/PageLegale";
import { SOCIETE, adresseUneLigne } from "@/lib/societe";

export const metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <PageLegale titre="Politique de confidentialité" sousTitre="Protection de vos données personnelles" maj="15 septembre 2026">
      <Section titre="1. Responsable du traitement">
        <p>Le responsable du traitement des données personnelles collectées sur coteburo.fr est la société <strong>{SOCIETE.nom}</strong>, {SOCIETE.formeCourte} au capital de {SOCIETE.capital}, dont le siège social est situé {adresseUneLigne()}.</p>
        <p>Contact pour toute question relative à vos données : {SOCIETE.email}</p>
      </Section>

      <Section titre="2. Données collectées">
        <p>Nous collectons les données que vous nous communiquez directement, notamment lors d&apos;une commande ou d&apos;une prise de contact :</p>
        <p>
          • Identité : prénom, nom, société le cas échéant<br />
          • Coordonnées : email, téléphone, adresse de livraison<br />
          • Données de commande : produits, montants, historique<br />
          • Données de navigation : cookies techniques nécessaires au fonctionnement du site
        </p>
        <p>Vos données bancaires ne sont jamais collectées ni conservées par Côté BURO : elles sont traitées directement et exclusivement par notre prestataire de paiement sécurisé Stripe.</p>
      </Section>

      <Section titre="3. Finalités du traitement">
        <p>Vos données sont utilisées pour :</p>
        <p>
          • Traiter et suivre vos commandes<br />
          • Vous contacter concernant votre commande (livraison, montage)<br />
          • Répondre à vos demandes de contact ou de devis<br />
          • Respecter nos obligations légales et comptables<br />
          • Améliorer nos services
        </p>
      </Section>

      <Section titre="4. Base légale">
        <p>Le traitement de vos données repose sur l&apos;exécution du contrat de vente (traitement des commandes), le respect d&apos;obligations légales (facturation, comptabilité), et votre consentement le cas échéant.</p>
      </Section>

      <Section titre="5. Destinataires des données">
        <p>Vos données sont destinées aux services internes de Côté BURO et à ses sous-traitants techniques strictement nécessaires : Stripe (paiement), Resend (envoi d&apos;emails), Vercel et Railway (hébergement). Ces prestataires sont tenus à des obligations de confidentialité et de sécurité.</p>
        <p>Vos données ne sont jamais vendues ni cédées à des tiers à des fins commerciales.</p>
      </Section>

      {/* Obligation d'information de l'article 13.1.f du RGPD : le transfert
          hors Union européenne doit être annoncé, avec le mécanisme qui
          l'encadre. Nos quatre sous-traitants techniques sont américains. */}
      <Section titre="5 bis. Transferts hors Union européenne">
        <p>Stripe, Resend, Vercel et Railway sont des sociétés établies aux États-Unis. Certaines de vos données y sont donc hébergées ou traitées, hors de l&apos;Union européenne.</p>
        <p>Ces transferts sont encadrés soit par la certification de ces prestataires au <em>Data Privacy Framework</em> UE–États-Unis, soit par les clauses contractuelles types adoptées par la Commission européenne, qui offrent des garanties appropriées au sens de l&apos;article 46 du RGPD.</p>
        <p>Vous pouvez obtenir une copie de ces garanties en écrivant à {SOCIETE.email}.</p>
      </Section>

      <Section titre="6. Durée de conservation">
        <p>Vos données de commande sont conservées pour la durée nécessaire au traitement puis archivées conformément aux obligations légales (notamment 10 ans pour les documents comptables). Les données de contact sont conservées <Placeholder>durée à préciser, ex : 3 ans</Placeholder> après le dernier contact.</p>
      </Section>

      <Section titre="7. Vos droits">
        <p>Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
        <p>
          • Droit d&apos;accès à vos données<br />
          • Droit de rectification<br />
          • Droit à l&apos;effacement (« droit à l&apos;oubli »)<br />
          • Droit à la limitation du traitement<br />
          • Droit d&apos;opposition<br />
          • Droit à la portabilité de vos données
        </p>
        <p>Pour exercer ces droits, contactez-nous à {SOCIETE.email}. Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).</p>
      </Section>

      <Section titre="8. Cookies">
        <p>Le site utilise uniquement des cookies techniques nécessaires à son bon fonctionnement (gestion de la session et du panier). Ces cookies ne nécessitent pas de consentement préalable car ils sont indispensables au service demandé.</p>
        <p>Le site n&apos;utilise pas de cookies publicitaires ou de traçage à des fins marketing.</p>
      </Section>

      <Section titre="9. Sécurité">
        <p>Côté BURO met en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès, altération, divulgation ou destruction non autorisés. Les paiements sont sécurisés et chiffrés via Stripe.</p>
      </Section>
    </PageLegale>
  );
}