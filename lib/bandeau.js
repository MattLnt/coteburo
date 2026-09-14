import { prisma } from "@/lib/prisma";
import { getCampagnesActives } from "@/lib/promotions";

// Bandeau promotionnel du site — à ne pas confondre avec bandeauActif /
// bandeauTexte, qui portent l'adresse du showroom et le téléphone.
//
// Il s'adosse aux campagnes : la remise annoncée est celle qui s'applique
// réellement aux prix, et le bandeau disparaît de lui-même quand la campagne
// expire. getCampagnesActives ne renvoie que les campagnes en cours, dates
// comprises — il n'y a donc rien à désactiver à la main.
//
// Le texte libre vient en complément, pour annoncer autre chose qu'une remise
// (un salon, une fermeture, un délai). Il s'affiche même sans campagne.

// Exporté pour que l'admin montre, à l'activation du bandeau, la remise qui
// sera réellement annoncée — et non une promesse à vérifier ailleurs.
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
    select: { bandeauPromoActif: true, bandeauPromoTexte: true },
  });
  if (!reglages?.bandeauPromoActif) return null;

  const texte = (reglages.bandeauPromoTexte || "").trim() || null;
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

  let promo = null;
  if (campagne) {
    // Nom lisible des catégories visées, pour « −10 % sur Acoustique ».
    const slugs = campagne.categories || [];
    const cats = slugs.length
      ? await prisma.categorie.findMany({ where: { slug: { in: slugs } }, select: { nom: true, slug: true } })
      : [];
    const noms = [...new Set(cats.map((c) => c.nom))];

    const cible = noms.length
      ? `sur ${noms.join(", ")}`
      : campagne.vitrineIds.length
      ? "sur une sélection de produits"
      : null;

    promo = {
      message: [libelleRemise(campagne), cible].filter(Boolean).join(" "),
      // Lien seulement si une seule catégorie est visée : au-delà, il n'y a pas
      // de destination évidente.
      href: cats.length === 1 ? `/catalogue?categorie=${cats[0].slug}` : "/catalogue",
    };
  }

  // Rien à dire : ni campagne en cours, ni texte. On n'affiche pas un bandeau vide.
  if (!promo && !texte) return null;

  return { promo, texte };
}
