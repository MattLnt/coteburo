import { prisma } from "@/lib/prisma";

// Catégories d'une marque avec le nb de gammes publiées
export async function getCategoriesAvecGammes(marqueSlug = "buronomic") {
  const marque = await prisma.marque.findUnique({ where: { slug: marqueSlug } });
  if (!marque) return [];

  const categories = await prisma.categorie.findMany({
    where: { marqueId: marque.id },
    orderBy: { ordre: "asc" },
    include: { gammes: { where: { publie: true }, select: { id: true } } },
  });

  return categories.map((c) => ({
    id: c.id,
    nom: c.nom,
    slug: c.slug,
    nbGammes: c.gammes.length,
  }));
}

// FRONT — catégories + leurs sous-catégories, pour le méga-menu du header (gamme jamais exposée au client)
export async function getCategoriesMenu(marqueSlug = "buronomic") {
  const marque = await prisma.marque.findUnique({ where: { slug: marqueSlug } });
  if (!marque) return [];

  const categories = await prisma.categorie.findMany({
    where: { marqueId: marque.id },
    orderBy: { ordre: "asc" },
    include: {
      sousCategories: {
        orderBy: [{ ordre: "asc" }, { nom: "asc" }],
        select: { nom: true, slug: true },
      },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    nom: c.nom,
    slug: c.slug,
    icone: c.icone,
    sousCategories: c.sousCategories,
  }));
}

// Construit l'URL publique d'un produit à partir de sa catégorie (+ sous-catégorie éventuelle) et son slug.
// La gamme n'apparaît JAMAIS dans l'URL — à utiliser partout où on lie vers une fiche produit.
export function urlProduit({ categorieSlug, sousCategorieSlug, slug }) {
  if (!categorieSlug || !slug) return "/catalogue";
  return sousCategorieSlug ? `/${categorieSlug}/${sousCategorieSlug}/${slug}` : `/${categorieSlug}/${slug}`;
}

// Choisit la meilleure image disponible : image principale, sinon première photo de la galerie.
function imagePrincipaleOuGalerie(vitrine) {
  if (vitrine.imageUrl) return vitrine.imageUrl;
  if (Array.isArray(vitrine.images) && vitrine.images.length > 0) return vitrine.images[0];
  return null;
}

// Calcule le prix mini d'une carte, en combinant l'ancien modèle (produits importés)
// et le nouveau (déclinaisons libres) — une carte n'a jamais les deux à la fois en pratique.
// Exportée pour être réutilisée ailleurs (ex. API de recherche) sans dupliquer la logique.
export function calculerPrixMini(vitrine, surDevis) {
  if (surDevis) return vitrine.prixAPartir ?? null;

  const prixProduits = (vitrine.produits || [])
    .map((p) => p.prixVenteHT ?? p.prixPublicHT)
    .filter((x) => x != null && x > 0);

  const prixDeclinaisons = (Array.isArray(vitrine.declinaisons) ? vitrine.declinaisons : [])
    .map((d) => Number(d.prixVenteHT))
    .filter((x) => !Number.isNaN(x) && x > 0);

  const tous = [...prixProduits, ...prixDeclinaisons];
  return tous.length ? Math.min(...tous) : null;
}

// Détermine si la promo d'une vitrine (promoPct/promoDebut/promoFin) est active MAINTENANT,
// et calcule le prix réduit à partir d'un prix de base donné. Retourne toujours un objet cohérent,
// même si aucune promo n'est définie (enPromo: false).
export function appliquerPromoVitrine(vitrine, prixBase) {
  const pct = vitrine.promoPct;
  if (!pct || prixBase == null) return { enPromo: false, prixFinal: prixBase, prixBase, promoPct: null };

  const now = new Date();
  const debutOk = !vitrine.promoDebut || new Date(vitrine.promoDebut) <= now;
  const finOk = !vitrine.promoFin || new Date(vitrine.promoFin) >= now;
  if (!debutOk || !finOk) return { enPromo: false, prixFinal: prixBase, prixBase, promoPct: null };

  const prixFinal = Math.round(prixBase * (1 - pct / 100) * 100) / 100;
  return { enPromo: true, prixFinal, prixBase, promoPct: pct };
}

// Gammes publiées (optionnellement filtrées par catégorie) — many-to-many
export async function getGammes({ marqueSlug = "buronomic", categorieSlug = null } = {}) {
  const marque = await prisma.marque.findUnique({ where: { slug: marqueSlug } });
  if (!marque) return [];

  const where = { marqueId: marque.id, publie: true };
  if (categorieSlug) {
    where.categories = { some: { marqueId: marque.id, slug: categorieSlug } };
  }

  const gammes = await prisma.gamme.findMany({
    where,
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    include: {
      categories: { select: { nom: true, slug: true }, orderBy: { ordre: "asc" } },
      _count: { select: { produits: true, vitrines: true } },
    },
  });

  return gammes.map((g) => ({
    id: g.id,
    nom: g.nom,
    slug: g.slug,
    descriptif: g.descriptif,
    imageUrl: g.imageUrl,
    images: g.images,
    categories: g.categories.map((c) => ({ nom: c.nom, slug: c.slug })),
    nbProduits: g._count.produits,
    nbCartes: g._count.vitrines,
    bestSeller: g.bestSeller,
    enAvant: g.enAvant,
  }));
}

// FRONT — gamme + ses cartes (avec prix mini "à partir de") + finitions gamme
export async function getGammeFront(slug) {
  const gamme = await prisma.gamme.findUnique({
    where: { slug },
    include: {
      marque: { select: { nom: true } },
      categories: { select: { nom: true, slug: true }, orderBy: { ordre: "asc" } },
      groupesFinition: {
        where: { vitrineId: null },
        orderBy: { ordre: "asc" },
        include: { finitions: { orderBy: { ordre: "asc" } } },
      },
      vitrines: {
        where: { publie: true },
        orderBy: [{ ordre: "asc" }, { nom: "asc" }],
        include: {
          produits: { select: { prixVenteHT: true, prixPublicHT: true } },
          categories: { select: { slug: true }, take: 1 },
          sousCategories: { select: { slug: true }, take: 1 },
        },
      },
    },
  });
  if (!gamme || !gamme.publie) return null;

  const cartes = gamme.vitrines.map((v) => {
    const surDevis = gamme.venteSurDevis || v.venteSurDevis;
    const prixMini = calculerPrixMini(v, surDevis);
    return {
      id: v.id,
      nom: v.nom,
      slug: v.slug,
      imageUrl: imagePrincipaleOuGalerie(v) || gamme.imageUrl || null,
      prixMini,
      surDevis,
      nbProduits: v.produits.length,
      categorieSlug: v.categories[0]?.slug || null,
      sousCategorieSlug: v.sousCategories[0]?.slug || null,
    };
  });

  return {
    id: gamme.id,
    nom: gamme.nom,
    slug: gamme.slug,
    descriptif: gamme.descriptif,
    descriptionTech: gamme.descriptionTech,
    imageUrl: gamme.imageUrl,
    images: gamme.images || [],
    marqueNom: gamme.marque?.nom || "Buronomic",
    categories: gamme.categories.map((c) => ({ nom: c.nom, slug: c.slug })),
    cartes,
    groupesFinition: gamme.groupesFinition.map((grp) => ({
      id: grp.id,
      nom: grp.nom,
      finitions: grp.finitions.map((f) => ({ id: f.id, nom: f.nom, imageUrl: f.imageUrl, couleur: f.couleur })),
    })),
  };
}

// FRONT — une carte précise + ses produits (attributs) + finitions (gamme + produit) + déclinaisons libres + mode de vente
// Usage interne : identifiée par gamme+slug. Pour l'URL publique (catégorie-based), voir getCarteFrontParCategorie().
export async function getCarteFront(gammeSlug, carteSlug) {
  const gamme = await prisma.gamme.findUnique({
    where: { slug: gammeSlug },
    select: { id: true, nom: true, slug: true, publie: true, imageUrl: true, venteSurDevis: true },
  });
  if (!gamme || !gamme.publie) return null;

  const vitrine = await prisma.produitVitrine.findFirst({
    where: { gammeId: gamme.id, slug: carteSlug, publie: true },
    include: {
      produits: {
        orderBy: { designation: "asc" },
        select: {
          codeRacine: true,
          designation: true,
          prixPublicHT: true,
          prixVenteHT: true,
          longueur: true,
          hauteur: true,
          profondeur: true,
          plateau: true,
          pied: true,
          options: true,
        },
      },
      groupesFinition: {
        orderBy: { ordre: "asc" },
        include: { finitions: { orderBy: { ordre: "asc" } } },
      },
      categories: { select: { slug: true, nom: true }, take: 1 },
      sousCategories: { select: { slug: true, nom: true }, take: 1 },
    },
  });
  if (!vitrine) return null;

  const axesDeclinaisons = Array.isArray(vitrine.axesDeclinaisons) ? vitrine.axesDeclinaisons : [];
  const declinaisons = Array.isArray(vitrine.declinaisons) ? vitrine.declinaisons : [];
  const categorieSlug = vitrine.categories[0]?.slug || null;
  const categorieNom = vitrine.categories[0]?.nom || null;
  const sousCategorieSlug = vitrine.sousCategories[0]?.slug || null;
  const sousCategorieNom = vitrine.sousCategories[0]?.nom || null;

  // Finitions gamme (ancien système, pastilles sélectionnables) — non touché
  const groupesGamme = await prisma.groupeFinition.findMany({
    where: { gammeId: gamme.id, vitrineId: null },
    orderBy: { ordre: "asc" },
    include: { finitions: { orderBy: { ordre: "asc" } } },
  });
  const groupesFinition = groupesGamme.map((grp) => ({
    id: grp.id,
    nom: grp.nom,
    finitions: grp.finitions.map((f) => ({ id: f.id, nom: f.nom, imageUrl: f.imageUrl, couleur: f.couleur })),
  }));

  // Finitions produit (nouveau système, purement informatif)
  const finitionsProduit = vitrine.groupesFinition.map((grp) => ({
    id: grp.id,
    nom: grp.nom,
    finitions: grp.finitions.map((f) => ({ id: f.id, nom: f.nom, imageUrl: f.imageUrl, couleur: f.couleur })),
  }));

  const surDevis = gamme.venteSurDevis || vitrine.venteSurDevis;
  const images = (vitrine.images && vitrine.images.length ? vitrine.images : (vitrine.imageUrl ? [vitrine.imageUrl] : []));
  const prixMini = calculerPrixMini(vitrine, surDevis);

  // Autres produits de la même catégorie (jamais "autres modèles de la gamme" — la gamme est invisible au client)
  const autresRaw = categorieSlug
    ? await prisma.produitVitrine.findMany({
        where: {
          publie: true,
          NOT: { id: vitrine.id },
          gamme: { publie: true },
          categories: { some: { slug: categorieSlug } },
        },
        orderBy: [{ ordre: "asc" }, { nom: "asc" }],
        take: 8,
        include: {
          produits: { select: { prixVenteHT: true, prixPublicHT: true } },
          gamme: { select: { venteSurDevis: true } },
          categories: { select: { slug: true }, take: 1 },
          sousCategories: { select: { slug: true }, take: 1 },
        },
      })
    : [];
  const autresCartes = autresRaw.map((v) => {
    const surDevisAutre = v.gamme.venteSurDevis || v.venteSurDevis;
    return {
      id: v.id, nom: v.nom, slug: v.slug,
      imageUrl: imagePrincipaleOuGalerie(v),
      prixMini: calculerPrixMini(v, surDevisAutre),
      surDevis: surDevisAutre,
      categorieSlug: v.categories[0]?.slug || null,
      sousCategorieSlug: v.sousCategories[0]?.slug || null,
    };
  });

  return {
    gammeNom: gamme.nom,
    gammeSlug: gamme.slug,
    surDevis,
    carte: {
      id: vitrine.id,
      nom: vitrine.nom,
      slug: vitrine.slug,
      categorieSlug,
      categorieNom,
      sousCategorieSlug,
      sousCategorieNom,
      descriptif: vitrine.descriptif,
      images: images.length ? images : (gamme.imageUrl ? [gamme.imageUrl] : []),
      prixMini,
      prixAPartir: vitrine.prixAPartir ?? null,
      sectionsDevis: Array.isArray(vitrine.sectionsDevis) ? vitrine.sectionsDevis : [],
      axesDeclinaisons,
      declinaisons,
      finitionsProduit,
      produits: vitrine.produits.map((p) => ({
        codeRacine: p.codeRacine,
        designation: p.designation,
        prixPublicHT: p.prixPublicHT,
        prixVenteHT: p.prixVenteHT,
        longueur: p.longueur,
        hauteur: p.hauteur,
        profondeur: p.profondeur,
        plateau: p.plateau,
        pied: p.pied,
        options: p.options || [],
      })),
    },
    groupesFinition,
    autresCartes,
  };
}

// FRONT — résout une carte à partir de catégorie (+ sous-catégorie) + slug produit.
// C'est LA fonction à utiliser pour la page publique — la gamme n'apparaît jamais dans l'URL.
export async function getCarteFrontParCategorie(categorieSlug, sousCategorieSlug, carteSlug) {
  const where = {
    publie: true,
    slug: carteSlug,
    gamme: { publie: true },
    categories: { some: { slug: categorieSlug } },
  };
  if (sousCategorieSlug) {
    where.sousCategories = { some: { slug: sousCategorieSlug } };
  }

  const vitrine = await prisma.produitVitrine.findFirst({
    where,
    select: { gamme: { select: { slug: true } } },
  });
  if (!vitrine) return null;

  return getCarteFront(vitrine.gamme.slug, carteSlug);
}

// ─────────────── CATALOGUE (grille filtrable de cartes, toutes gammes confondues) ───────────────

// Options disponibles pour construire les filtres (catégories+sous-catégories, marques)
export async function getFiltresCatalogue(marqueSlug = null) {
  const whereMarque = marqueSlug ? { slug: marqueSlug } : {};
  const marques = await prisma.marque.findMany({
    where: whereMarque,
    select: { nom: true, slug: true },
    orderBy: { nom: "asc" },
  });

  const categories = await prisma.categorie.findMany({
    where: marqueSlug ? { marque: { slug: marqueSlug } } : {},
    orderBy: { ordre: "asc" },
    include: { sousCategories: { orderBy: { ordre: "asc" }, select: { id: true, nom: true, slug: true } } },
  });

  const gammes = await prisma.gamme.findMany({
    where: { publie: true, ...(marqueSlug ? { marque: { slug: marqueSlug } } : {}) },
    orderBy: { nom: "asc" },
    select: { nom: true, slug: true },
  });

  return {
    marques,
    gammes,
    categories: categories.map((c) => ({
      id: c.id,
      nom: c.nom,
      slug: c.slug,
      sousCategories: c.sousCategories,
    })),
  };
}

// Grille de cartes filtrée — le cœur de la page /catalogue
export async function getCartesFiltrables({
  marqueSlug = null,
  categorieSlug = null,
  sousCategorieSlug = null,
  gammeSlug = null,
  prixMin = null,
  prixMax = null,
} = {}) {
  const where = {
    publie: true,
    gamme: {
      publie: true,
      ...(marqueSlug ? { marque: { slug: marqueSlug } } : {}),
      ...(gammeSlug ? { slug: gammeSlug } : {}),
    },
  };
  if (categorieSlug) where.categories = { some: { slug: categorieSlug } };
  if (sousCategorieSlug) where.sousCategories = { some: { slug: sousCategorieSlug } };

  const vitrines = await prisma.produitVitrine.findMany({
    where,
    orderBy: [{ nom: "asc" }],
    include: {
      gamme: { select: { nom: true, slug: true, venteSurDevis: true, marque: { select: { nom: true, slug: true } } } },
      categories: { select: { nom: true, slug: true } },
      sousCategories: { select: { nom: true, slug: true } },
      produits: { select: { prixVenteHT: true, prixPublicHT: true } },
    },
  });

  let cartes = vitrines.map((v) => {
    const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
    const prixMini = calculerPrixMini(v, surDevis);
    return {
      id: v.id,
      nom: v.nom,
      slug: v.slug,
      imageUrl: imagePrincipaleOuGalerie(v),
      prixMini,
      surDevis,
      gammeNom: v.gamme.nom,
      gammeSlug: v.gamme.slug,
      marqueNom: v.gamme.marque?.nom || null,
      marqueSlug: v.gamme.marque?.slug || null,
      categories: v.categories,
      sousCategories: v.sousCategories,
      categorieSlug: v.categories[0]?.slug || null,
      sousCategorieSlug: v.sousCategories[0]?.slug || null,
    };
  });

  if (prixMin != null) cartes = cartes.filter((c) => c.prixMini == null || c.prixMini >= prixMin);
  if (prixMax != null) cartes = cartes.filter((c) => c.prixMini == null || c.prixMini <= prixMax);

  return cartes;
}