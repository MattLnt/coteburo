import { prisma } from "@/lib/prisma";
import { getCampagnesActives, lienCampagne, aUneRemise } from "@/lib/promotions";

// Bandeau promotionnel du site — à ne pas confondre avec bandeauActif /
// bandeauTexte, qui portent l'adresse de la société et le téléphone.
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
  return partiesRemise(campagne).join(" · ") || "Promotion en cours";
}

// Les remises d'une campagne, une par entrée : « −25 % Buronomic »,
// « −20 % OfficePro ». Le bandeau en fait des pastilles, l'admin une phrase.
export function partiesRemise(campagne) {
  const fmt = (n) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  const parts = [];
  // La remise générale ne compte que si elle vise quelque chose.
  const generale = campagne.valeur > 0 && ((campagne.categories || []).length || (campagne.vitrineIds || []).length);
  if (generale) {
    parts.push(campagne.typeRemise === "montant" ? `${fmt(campagne.valeur)} € de remise` : `−${fmt(campagne.valeur)} %`);
  }
  // Puis un taux par fournisseur : « −25 % Buronomic · −20 % Sokoa ».
  for (const m of campagne.marques || []) parts.push(`−${fmt(m.pct)} % ${m.nom}`);
  return parts;
}

// Le taux le plus fort qu'une campagne consent, pour choisir celle à
// annoncer. Un montant ne se compare pas à un pourcentage : il compte 0.
function tauxMax(campagne) {
  const generale = campagne.typeRemise === "pourcentage" && campagne.valeur > 0
    && ((campagne.categories || []).length || (campagne.vitrineIds || []).length) ? campagne.valeur : 0;
  return Math.max(generale, ...(campagne.marques || []).map((m) => m.pct));
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
  // Seules les campagnes qui remisent réellement et qui veulent s'afficher.
  const campagne = campagnes
    .filter((c) => c.afficherBandeau && aUneRemise(c))
    .sort((a, b) => tauxMax(b) - tauxMax(a))[0] || null;

  // Sans campagne en cours, rien à annoncer : un bandeau qui promet une remise
  // inexistante serait mensonger.
  if (!campagne) return null;

  // À défaut de message rédigé, on retombe sur la remise chiffrée plutôt que
  // d'afficher un bandeau vide.
  const redige = (campagne.messageBandeau || "").trim();
  // Un message rédigé s'affiche tel quel. À défaut, les remises chiffrées,
  // une pastille chacune (parties) — le texte joint reste là pour les
  // endroits qui ne veulent qu'une ligne.
  return {
    message: redige || libelleRemise(campagne),
    parties: redige ? [] : partiesRemise(campagne),
    href: lienCampagne(campagne),
  };
}
