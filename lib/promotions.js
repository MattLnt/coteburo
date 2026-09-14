import { prisma } from "@/lib/prisma";

// Campagnes de promotion — l'onglet « Promotions » de l'admin.
//
// Elles ciblaient le modèle Produit, vide depuis la migration vers
// ProduitVitrine : créer une campagne n'avait donc plus aucun effet, nulle
// part. Elles visent désormais des vitrines et des catégories réelles.
//
// À ne pas confondre avec ProduitVitrine.promoPct, la promo propre à une
// fiche. Les deux coexistent ; quand les deux s'appliquent, c'est le prix le
// plus bas qui l'emporte — jamais de cumul (voir appliquerPromoVitrine).

// Campagnes en cours : actives et dans leur période.
export async function getCampagnesActives() {
  const now = new Date();
  const campagnes = await prisma.promotion.findMany({
    where: {
      actif: true,
      AND: [
        { OR: [{ dateDebut: null }, { dateDebut: { lte: now } }] },
        { OR: [{ dateFin: null }, { dateFin: { gte: now } }] },
      ],
    },
    include: { vitrines: { select: { vitrineId: true } } },
  });

  // Forme allégée, sérialisable, utilisable par les fonctions pures de prix.
  return campagnes.map((c) => ({
    id: c.id,
    nom: c.nom,
    typeRemise: c.typeRemise,
    valeur: c.valeur,
    // Message du bandeau, rédigé avec la campagne.
    messageBandeau: c.messageBandeau || null,
    categories: Array.isArray(c.categories) ? c.categories : [],
    vitrineIds: c.vitrines.map((v) => v.vitrineId),
  }));
}

// Campagnes qui visent une vitrine donnée : soit nommément, soit par l'une de
// ses catégories. La vitrine doit porter ses `categories` (avec leur slug).
export function campagnesPourVitrine(vitrine, campagnes = []) {
  if (!vitrine || !campagnes.length) return [];
  const slugs = (vitrine.categories || []).map((c) => c?.slug).filter(Boolean);
  return campagnes.filter(
    (c) => c.vitrineIds.includes(vitrine.id) || c.categories.some((s) => slugs.includes(s))
  );
}
