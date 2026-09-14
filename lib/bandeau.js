import { prisma } from "@/lib/prisma";
import { getCampagnesActives } from "@/lib/promotions";

// Bandeau promotionnel du site — à ne pas confondre avec bandeauActif /
// bandeauTexte, qui portent l'adresse du showroom et le téléphone.
//
// Le message est rédigé dans la campagne elle-même : c'est elle qui sait ce
// qu'elle annonce. Les réglages généraux ne gardent que l'interrupteur.
//
// Il s'adosse donc aux campagnes : la remise annoncée est celle qui s'applique
// réellement aux prix, et le bandeau disparaît de lui-même quand la campagne
// expire. getCampagnesActives ne renvoie que les campagnes en cours, dates
// comprises — il n'y a rien à désactiver à la main.

// Exporté pour que l'admin montre, à l'activation du bandeau, la remise qui
// sera annoncée à défaut de message rédigé.
export function libelleRemise(campagne) {
  if (campagne.typeRemise === "montant") {
    const montant = Number(campagne.valeur).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    return `${montant} € de remise`;
  }
  return `−${Number(campagne.valeur).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

export async function getBandeauPromo() {
  const reglages = await prisma.reglages.findUnique({
    where: { id: 1 },
    select: { bandeauPromoActif: true },
  });
  if (!reglages?.bandeauPromoActif) return null;

  const campagnes = await getCampagnesActives();

  // On annonce la campagne la plus généreuse : deux bandeaux empilés seraient
  // illisibles, et c'est celle-là qui fait venir.
  const campagne = campagnes
    .filter((c) => c.valeur > 0)
    .sort((a, b) => {
      // Un pourcentage et un montant ne se comparent pas directement ; à défaut,
      // le pourcentage passe devant, c'est ce qui parle le plus au client.
      if (a.typeRemise === b.typeRemise) return b.valeur - a.valeur;
      return a.typeRemise === "pourcentage" ? -1 : 1;
    })[0] || null;

  // Sans campagne en cours, rien à annoncer : un bandeau qui promet une remise
  // inexistante serait mensonger.
  if (!campagne) return null;

  // À défaut de message rédigé, on retombe sur la remise chiffrée plutôt que
  // d'afficher un bandeau vide.
  const message = (campagne.messageBandeau || "").trim() || libelleRemise(campagne);
  return { message };
}
