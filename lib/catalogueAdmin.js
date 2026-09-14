import { prisma } from "@/lib/prisma";

// Catalogue à plat pour les sélecteurs de l'admin — panneau « Ajouter un
// produit » du chiffrage de devis, et choix des produits liés d'une fiche.
//
// Tout est chargé d'un coup puis filtré côté navigateur : instantané, et le
// volume reste raisonnable (quelques centaines de fiches).
//
// `exclureOptions` écarte les accessoires — les fiches rangées dans une
// catégorie marquée estOption. Un devis peut légitimement contenir un
// accotoir ; une suggestion « Vous aimerez aussi » non.
export async function chargerCatalogueAdmin({ exclureOptions = false } = {}) {
  const [vitrines, categories] = await Promise.all([
    prisma.produitVitrine.findMany({
      where: { publie: true, gamme: { publie: true } },
      include: {
        gamme: { select: { id: true, nom: true } },
        categories: { select: { id: true, slug: true, nom: true, estOption: true }, take: 1 },
        sousCategories: { select: { id: true, slug: true, nom: true }, take: 1 },
      },
      orderBy: { nom: "asc" },
    }),
    prisma.categorie.findMany({
      orderBy: { ordre: "asc" },
      include: { sousCategories: { orderBy: { ordre: "asc" }, select: { id: true, nom: true, slug: true } } },
    }),
  ]);

  const retenues = exclureOptions
    ? vitrines.filter((v) => !v.categories.some((c) => c.estOption))
    : vitrines;

  const produits = retenues.map((v) => {
    const decl = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];

    // Libellé lisible d'une déclinaison : "180 cm / Avec retour"
    const libelle = (d) => {
      if (!d.valeurs) return d.reference || "Variante";
      return axes.map((a) => d.valeurs[a.id]).filter(Boolean).join(" / ") || (d.reference || "Variante");
    };

    const declinaisons = decl.map((d) => ({
      id: d.id,
      libelle: libelle(d),
      prixHT: Number(d.prixVenteHT) || 0,
      // Le tarif Buronomic porte l'éco-contribution sur chaque déclinaison :
      // on la remonte pour qu'elle suive le produit jusque dans la ligne de devis.
      ecoContribution: Number(d.ecoContribution) || 0,
      referenceFournisseur: d.referenceFournisseur || null,
    }));

    const prix = declinaisons.length > 0
      ? Math.min(...declinaisons.map((d) => d.prixHT).filter((p) => p > 0))
      : (v.prixUnitaireHT ?? null);

    // Pour un produit à prix unique, l'éco-contribution n'est pas dans les
    // déclinaisons : on prend celle de la première si elle existe.
    const ecoUnitaire = declinaisons.length
      ? (declinaisons.find((d) => d.ecoContribution > 0)?.ecoContribution ?? 0)
      : 0;

    return {
      id: v.id,
      nom: v.nom,
      gammeId: v.gamme.id,
      gammeNom: v.gamme.nom,
      imageUrl: (v.images && v.images[0]) || v.imageUrl || null,
      slug: v.slug,
      categorieId: v.categories[0]?.id || null,
      categorieNom: v.categories[0]?.nom || null,
      categorieSlug: v.categories[0]?.slug || null,
      sousCategorieId: v.sousCategories[0]?.id || null,
      sousCategorieNom: v.sousCategories[0]?.nom || null,
      sousCategorieSlug: v.sousCategories[0]?.slug || null,
      prixMini: Number.isFinite(prix) ? prix : null,
      prixUnitaire: v.prixUnitaireHT ?? null,
      ecoUnitaire,
      declinaisons,
    };
  });

  // On ne garde que les catégories qui contiennent réellement des produits.
  const idsUtilises = new Set(produits.map((p) => p.categorieId).filter(Boolean));
  const cats = categories
    .filter((c) => idsUtilises.has(c.id))
    .map((c) => ({
      id: c.id,
      nom: c.nom,
      sousCategories: c.sousCategories.filter((s) => produits.some((p) => p.sousCategorieId === s.id)),
    }));

  // Gammes réellement représentées, pour le filtre du sélecteur.
  const gammes = [...new Map(produits.map((p) => [p.gammeId, { id: p.gammeId, nom: p.gammeNom }])).values()]
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return { produits, categories: cats, gammes };
}

// Accents et casse ignorés — « etagere » doit trouver « Étagère ».
export function normaliser(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Filtrage commun aux deux sélecteurs : une seule règle, un seul endroit.
export function filtrerProduitsAdmin(produits, { recherche = "", gammeId = null, categorieId = null, sousCategorieId = null } = {}) {
  const q = normaliser(recherche.trim());
  return (produits || []).filter((p) => {
    if (gammeId && p.gammeId !== gammeId) return false;
    if (categorieId && p.categorieId !== categorieId) return false;
    if (sousCategorieId && p.sousCategorieId !== sousCategorieId) return false;
    if (q && !normaliser(`${p.nom} ${p.gammeNom}`).includes(q)) return false;
    return true;
  });
}
