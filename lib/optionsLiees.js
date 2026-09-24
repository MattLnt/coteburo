// Les fiches qu'on peut proposer en option d'une autre.
//
// L'ancien sélecteur ne montrait que les catégories marquées estOption. Les
// compléments sont devenus un rayon de Bureaux le 23 septembre 2026, et la
// liste s'est vidée sans que rien ne le dise.
//
// Un candidat, c'est une fiche du rayon Compléments & accessoires, une fiche
// de la même gamme, ou une fiche déjà liée — jamais la fiche elle-même. Le
// reste du catalogue se trouve par la recherche de l'écran.
//
// Reçoit le client Prisma : les actions de deux écrans l'appellent.

export const RAYON_COMPLEMENTS = "complements-accessoires";

export async function listerCandidatsOptions(prisma, vitrineId) {
  const fiche = await prisma.produitVitrine.findUnique({
    where: { id: vitrineId },
    select: { gammeId: true, optionsLiees: { select: { id: true } } },
  });
  if (!fiche) return [];
  const dejaLiees = new Set(fiche.optionsLiees.map((o) => o.id));

  const vitrines = await prisma.produitVitrine.findMany({
    where: {
      id: { not: vitrineId },
      OR: [
        { sousCategories: { some: { slug: RAYON_COMPLEMENTS } } },
        { gammeId: fiche.gammeId },
        { id: { in: [...dejaLiees] } },
      ],
    },
    orderBy: { nom: "asc" },
    select: {
      id: true, nom: true, imageUrl: true, images: true, publie: true, gammeId: true,
      gamme: { select: { nom: true } },
      sousCategories: { select: { nom: true, slug: true }, take: 1 },
    },
  });

  return vitrines.map((v) => ({
    id: v.id,
    nom: v.nom,
    image: v.imageUrl || (Array.isArray(v.images) && v.images[0]) || null,
    publie: v.publie,
    gammeNom: v.gamme?.nom || null,
    rayonNom: v.sousCategories[0]?.nom || null,
    memeGamme: v.gammeId === fiche.gammeId,
    estComplement: v.sousCategories[0]?.slug === RAYON_COMPLEMENTS,
    liee: dejaLiees.has(v.id),
  }));
}
