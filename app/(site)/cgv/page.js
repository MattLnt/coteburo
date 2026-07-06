import { PageLegale, Section, Placeholder } from "@/components/PageLegale";

export const metadata = { title: "Conditions Générales de Vente" };

export default function CGVPage() {
  return (
    <PageLegale titre="Conditions Générales de Vente" maj="à compléter">
      <Section titre="Article 1 — Objet et champ d'application">
        <p>Les présentes Conditions Générales de Vente (CGV) régissent les ventes de mobilier et d&apos;équipements de bureau conclues entre la société Côté BURO (ci-après « le Vendeur ») et tout client (ci-après « le Client ») via le site coteburo.fr. Toute commande implique l&apos;acceptation sans réserve des présentes CGV.</p>
        <p>Le Vendeur se réserve le droit de modifier ses CGV à tout moment. Les CGV applicables sont celles en vigueur à la date de la commande.</p>
      </Section>

      <Section titre="Article 2 — Produits">
        <p>Les produits proposés à la vente sont ceux figurant sur le site, dans la limite des stocks disponibles auprès de nos fournisseurs. Les photographies et descriptifs sont fournis à titre indicatif et peuvent présenter de légères différences avec le produit livré (teintes, finitions), sans que cela n&apos;engage la responsabilité du Vendeur.</p>
        <p>Certains produits sont proposés avec des finitions personnalisables (structure, plateau, coloris, tissu). Le Client est responsable du choix des finitions au moment de la commande.</p>
      </Section>

      <Section titre="Article 3 — Prix">
        <p>Les prix sont indiqués en euros, hors taxes (HT) et toutes taxes comprises (TTC), la TVA applicable étant de 20 %. Les prix ne comprennent pas les frais de livraison et de montage, qui font l&apos;objet d&apos;un devis spécifique selon le lieu et la nature de la commande.</p>
        <p>Le Vendeur se réserve le droit de modifier ses prix à tout moment, étant entendu que le prix applicable est celui en vigueur au moment de la validation de la commande.</p>
        <p>Une éco-participation peut s&apos;appliquer sur certains produits, conformément à la réglementation en vigueur ; elle est alors indiquée sur la fiche produit.</p>
      </Section>

      <Section titre="Article 4 — Commande">
        <p>Le Client passe commande directement sur le site. La commande n&apos;est définitivement enregistrée qu&apos;après validation du paiement. Un email de confirmation récapitulant la commande est envoyé au Client.</p>
        <p>Le Vendeur se réserve le droit d&apos;annuler ou de refuser toute commande en cas de litige antérieur, de suspicion de fraude, ou d&apos;indisponibilité du produit. En cas d&apos;indisponibilité après commande, le Client est informé et remboursé le cas échéant.</p>
      </Section>

      <Section titre="Article 5 — Paiement">
        <p>Le paiement s&apos;effectue en ligne par carte bancaire, via notre prestataire de paiement sécurisé <strong>Stripe</strong>. Les données bancaires du Client sont traitées directement par Stripe et ne sont jamais conservées par le Vendeur.</p>
        <p>Pour les commandes importantes ou les projets d&apos;aménagement, un règlement par virement ou selon un échéancier peut être convenu sur devis.</p>
      </Section>

      <Section titre="Article 6 — Livraison et montage">
        <p>Les zones et délais de livraison sont précisés lors de l&apos;établissement du devis de livraison. La livraison et le montage font l&apos;objet d&apos;une prestation spécifique, chiffrée selon le lieu, le volume et la nature des produits.</p>
        <p>Les délais de livraison sont donnés à titre indicatif. Un retard ne peut donner lieu à annulation de la commande, retenue ou indemnité, sauf disposition légale impérative.</p>
        <p>Il appartient au Client de vérifier l&apos;état des produits à la livraison et d&apos;émettre toute réserve auprès du transporteur en cas de dommage apparent.</p>
      </Section>

      <Section titre="Article 7 — Droit de rétractation">
        <p>Conformément à l&apos;article L.221-18 du Code de la consommation, le Client particulier (non professionnel) dispose d&apos;un délai de <strong>14 jours</strong> à compter de la réception des produits pour exercer son droit de rétractation, sans avoir à justifier de motif.</p>
        <p>Ce droit ne s&apos;applique pas aux biens confectionnés selon les spécifications du Client ou nettement personnalisés (article L.221-28 du Code de la consommation), ce qui concerne notamment les produits avec finitions personnalisées.</p>
        <p>Les frais de retour sont à la charge du Client. Le produit doit être retourné dans son état et son emballage d&apos;origine. Le remboursement intervient dans les 14 jours suivant la récupération du bien.</p>
      </Section>

      <Section titre="Article 8 — Garanties">
        <p>Tous les produits bénéficient de la garantie légale de conformité (articles L.217-3 et suivants du Code de la consommation) et de la garantie contre les vices cachés (articles 1641 et suivants du Code civil).</p>
        <p>En complément, Côté BURO fait bénéficier ses clients d&apos;une <strong>garantie de 7 ans</strong> sur le mobilier, selon les conditions du fabricant.</p>
      </Section>

      <Section titre="Article 9 — Réclamations et médiation">
        <p>Pour toute réclamation, le Client peut contacter le Vendeur à contact@coteburo.fr ou au 07 81 02 06 31.</p>
        <p>Conformément à l&apos;article L.612-1 du Code de la consommation, le Client consommateur peut recourir gratuitement à un médiateur de la consommation : <Placeholder>coordonnées du médiateur à compléter</Placeholder>.</p>
        <p>Le Client peut également recourir à la plateforme européenne de règlement en ligne des litiges : ec.europa.eu/consumers/odr</p>
      </Section>

      <Section titre="Article 10 — Droit applicable et litiges">
        <p>Les présentes CGV sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité. À défaut, les tribunaux compétents seront ceux du ressort du siège social du Vendeur, sous réserve des dispositions légales impératives applicables aux consommateurs.</p>
      </Section>
    </PageLegale>
  );
}