import { PageLegale, Section, Placeholder } from "@/components/PageLegale";

export const metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <PageLegale titre="Mentions légales" maj="à compléter">
      <Section titre="Éditeur du site">
        <p>Le site <strong>coteburo.fr</strong> est édité par :</p>
        <p>
          <strong>Côté BURO</strong><br />
          Forme juridique : <Placeholder>SARL / SAS / EI à préciser</Placeholder><br />
          Capital social : <Placeholder>montant à préciser</Placeholder><br />
          Siège social : TECH&apos;INDUS — Bât D, Porte 8, 645 rue Mayor de Montricher, 13290 Aix-en-Provence<br />
          SIRET : <Placeholder>numéro SIRET à compléter</Placeholder><br />
          RCS : <Placeholder>ville et numéro RCS à compléter</Placeholder><br />
          N° TVA intracommunautaire : <Placeholder>FR à compléter</Placeholder><br />
          Téléphone : 07 81 02 06 31<br />
          Email : contact@coteburo.fr
        </p>
      </Section>

      <Section titre="Directeur de la publication">
        <p>Le directeur de la publication est <Placeholder>nom du gérant à compléter</Placeholder>, en qualité de <Placeholder>gérant / président</Placeholder>.</p>
      </Section>

      <Section titre="Hébergement">
        <p>Le site est hébergé par :</p>
        <p>
          <strong>Vercel Inc.</strong><br />
          340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis<br />
          Site : vercel.com
        </p>
        <p>La base de données est hébergée par <strong>Railway Corp.</strong> (railway.app).</p>
      </Section>

      <Section titre="Propriété intellectuelle">
        <p>L&apos;ensemble des éléments du site (textes, images, logos, charte graphique, structure) est la propriété de Côté BURO ou de ses partenaires, et est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation, modification ou exploitation, totale ou partielle, sans autorisation écrite préalable, est interdite.</p>
        <p>Les visuels et descriptions des produits sont fournis par les fabricants partenaires (notamment Buronomic) et restent leur propriété.</p>
      </Section>

      <Section titre="Données personnelles">
        <p>Les informations collectées sur le site font l&apos;objet d&apos;un traitement informatique destiné à la gestion des commandes et de la relation client. Pour en savoir plus sur la gestion de vos données et vos droits, consultez notre <a href="/confidentialite" className="text-orange hover:text-orange-dark font-medium">politique de confidentialité</a>.</p>
      </Section>

      <Section titre="Cookies">
        <p>Le site utilise des cookies nécessaires à son bon fonctionnement (session, panier). Pour plus d&apos;informations, consultez notre <a href="/confidentialite" className="text-orange hover:text-orange-dark font-medium">politique de confidentialité</a>.</p>
      </Section>

      <Section titre="Responsabilité">
        <p>Côté BURO s&apos;efforce d&apos;assurer l&apos;exactitude des informations diffusées sur le site, mais ne saurait être tenue responsable des erreurs, omissions, ou d&apos;une indisponibilité temporaire du service. Les photographies et descriptions des produits sont fournies à titre indicatif et n&apos;engagent pas contractuellement Côté BURO en cas d&apos;erreur.</p>
      </Section>

      <Section titre="Droit applicable">
        <p>Les présentes mentions légales sont régies par le droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux français seront seuls compétents.</p>
      </Section>
    </PageLegale>
  );
}