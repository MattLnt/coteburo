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
    marques: Array.isArray(c.marques) ? c.marques : [],
    vitrineIds: c.vitrines.map((v) => v.vitrineId),
  }));
}

// Slug de la marque d'une fiche, telle que les requêtes la chargent : via sa
// gamme (gamme.marque.slug), ou posé à plat (marqueSlug) quand la gamme a été
// lue à part.
export function marqueSlugDeVitrine(vitrine) {
  return vitrine?.gamme?.marque?.slug || vitrine?.marqueSlug || null;
}

// Campagnes qui visent une vitrine donnée : nommément, par l'une de ses
// catégories, ou par sa marque. La vitrine doit porter ses `categories`
// (avec leur slug) et sa marque (voir marqueSlugDeVitrine).
export function campagnesPourVitrine(vitrine, campagnes = []) {
  if (!vitrine || !campagnes.length) return [];
  const slugs = (vitrine.categories || []).map((c) => c?.slug).filter(Boolean);
  const marque = marqueSlugDeVitrine(vitrine);
  return campagnes.filter(
    (c) => c.vitrineIds.includes(vitrine.id)
      || c.categories.some((s) => slugs.includes(s))
      || (marque && (c.marques || []).includes(marque))
  );
}

// Adresse du catalogue filtré sur ce que vise une campagne, quand elle vise
// un seul fournisseur : c'est le lien « Voir les promos Sokoa ». Null sinon,
// un mélange de cibles n'a pas d'adresse simple.
export function lienCampagne(campagne) {
  const marques = campagne?.marques || [];
  if (marques.length !== 1) return null;
  if ((campagne.categories || []).length || (campagne.vitrineIds || []).length) return null;
  return `/catalogue?marque=${encodeURIComponent(marques[0])}&promo=1`;
}
