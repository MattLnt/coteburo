import { prisma } from "@/lib/prisma";
import { prixVenteEffectif } from "@/lib/prixDeclinaison";

// Récupère la marge globale actuelle des Réglages — utilisée pour calculer le prix de
// vente des déclinaisons non verrouillées, partout sur le site public.
async function getMargeGlobale() {
  const reglages = await prisma.reglages.findUnique({ where: { id: 1 }, select: { margeGlobale: true } });
  return reglages?.margeGlobale ?? 0.3;
}

// Remplace le prixVenteHT de chaque ligne de déclinaison par son prix effectif
// (verrouillé → tel quel ; sinon → tarif × (1 + marge)), sans toucher au reste de la ligne.
// Usage interne uniquement (calcul du prix mini) — ne jamais envoyer le résultat tel quel
// au navigateur, voir declinaisonsPubliques() ci-dessous.
function resoudrePrixDeclinaisons(declinaisons, marge) {
  return (Array.isArray(declinaisons) ? declinaisons : []).map((d) => ({
    ...d,
    prixVenteHT: prixVenteEffectif(d, marge),
  }));
}

// Version d'une déclinaison envoyée au navigateur — uniquement ce dont la fiche produit
// a besoin pour afficher les choix et le prix de vente. Ne contient JAMAIS prixTarifHT,
// prixVerrouille, ni referenceFournisseur : ce sont des informations commerciales internes
// (coût d'achat fournisseur, code interne) qui n'ont rien à faire dans le code source public.
function declinaisonsPubliques(declinaisonsResolues) {
  return declinaisonsResolues.map((d) => ({
    id: d.id,
    valeurs: d.valeurs,
    prixVenteHT: d.prixVenteHT,
  }));
}

// Slug de la catégorie qui fait l'URL du produit : la catégorie principale choisie en admin
// (categoriePrincipaleId), avec repli sur la première catégorie si aucune principale valide.
// Les entrées `categories` doivent contenir au moins { id, slug }.
function slugCategoriePrincipale(categories, categoriePrincipaleId) {
  const list = Array.isArray(categories) ? categories : [];
  if (list.length === 0) return null;
  const principale = categoriePrincipaleId ? list.find((c) => c.id === categoriePrincipaleId) : null;
  return (principale || list[0])?.slug || null;
}

// Catégorie principale complète ({ id, slug, nom, ... }) — repli sur la première.
function categoriePrincipale(categories, categoriePrincipaleId) {
  const list = Array.isArray(categories) ? categories : [];
  if (list.length === 0) return null;
  const principale = categoriePrincipaleId ? list.find((c) => c.id === categoriePrincipaleId) : null;
  return principale || list[0] || null;
}

// Slug de la sous-catégorie qui fait l'URL du produit : la sous-catégorie principale choisie
// en admin (sousCategoriePrincipaleId), avec repli sur la première. Peut être null (pas de
// sous-catégorie). Les entrées `sousCategories` doivent contenir au moins { id, slug }.
function slugSousCategoriePrincipale(sousCategories, sousCategoriePrincipaleId) {
  const list = Array.isArray(sousCategories) ? sousCategories : [];
  if (list.length === 0) return null;
  const principale = sousCategoriePrincipaleId ? list.find((s) => s.id === sousCategoriePrincipaleId) : null;
  return (principale || list[0])?.slug || null;
}

// Sous-catégorie principale complète ({ id, slug, nom, ... }) — repli sur la première, ou null.
function sousCategoriePrincipale(sousCategories, sousCategoriePrincipaleId) {
  const list = Array.isArray(sousCategories) ? sousCategories : [];
  if (list.length === 0) return null;
  const principale = sousCategoriePrincipaleId ? list.find((s) => s.id === sousCategoriePrincipaleId) : null;
  return principale || list[0] || null;
}

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
// Attend un prixVenteHT déjà résolu sur chaque déclinaison (voir resoudrePrixDeclinaisons) —
// ne recalcule jamais tarif+marge lui-même, pour rester une pure fonction d'agrégation.
// Exportée pour être réutilisée ailleurs (ex. API de recherche) sans dupliquer la logique.
export function calculerPrixMini(vitrine, surDevis, marge = null) {
  if (surDevis) return vitrine.prixAPartir ?? null;

  // Produit à prix unique (sans déclinaisons) :
  // verrouillé → prix de vente saisi ; sinon → fournisseur × (1 + marge).
  if (vitrine.sansDeclinaisons) {
    const vente = Number(vitrine.prixUnitaireHT);
    if (vitrine.prixUnitaireVerrouille && !Number.isNaN(vente) && vente > 0) return vente;
    const tarif = Number(vitrine.prixUnitaireTarifHT);
    if (!Number.isNaN(tarif) && tarif > 0 && marge != null) return Math.round(tarif * (1 + marge) * 100) / 100;
    if (!Number.isNaN(vente) && vente > 0) return vente;
    return null;
  }

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
          categories: { select: { id: true, slug: true } },
          sousCategories: { select: { id: true, slug: true } },
        },
      },
    },
  });
  if (!gamme || !gamme.publie) return null;

  const marge = await getMargeGlobale();

  const cartes = gamme.vitrines.map((v) => {
    const surDevis = gamme.venteSurDevis || v.venteSurDevis;
    const vPourPrix = { ...v, declinaisons: resoudrePrixDeclinaisons(v.declinaisons, marge) };
    const prixMini = calculerPrixMini(vPourPrix, surDevis, marge);
    return {
      id: v.id,
      nom: v.nom,
      slug: v.slug,
      imageUrl: imagePrincipaleOuGalerie(v) || gamme.imageUrl || null,
      prixMini,
      surDevis,
      nbProduits: v.produits.length,
      categorieSlug: slugCategoriePrincipale(v.categories, v.categoriePrincipaleId),
      sousCategorieSlug: slugSousCategoriePrincipale(v.sousCategories, v.sousCategoriePrincipaleId),
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

  const marge = await getMargeGlobale();

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
      categories: { select: { id: true, slug: true, nom: true } },
      sousCategories: { select: { id: true, slug: true, nom: true } },
    },
  });
  if (!vitrine) return null;

  const axesDeclinaisons = Array.isArray(vitrine.axesDeclinaisons) ? vitrine.axesDeclinaisons : [];
  // Version complète (avec tarif, verrouillage...) — sert uniquement au calcul interne du
  // prix mini. La version envoyée au navigateur est filtrée juste en dessous.
  const declinaisonsResolues = resoudrePrixDeclinaisons(vitrine.declinaisons, marge);
  // Version publique — jamais de prixTarifHT, prixVerrouille, ni referenceFournisseur
  // (coût d'achat et code fournisseur : informations commerciales internes).
  const declinaisons = declinaisonsPubliques(declinaisonsResolues);
  // Catégorie + sous-catégorie principales (celles qui font l'URL) — repli sur la première.
  const catPrincipale = categoriePrincipale(vitrine.categories, vitrine.categoriePrincipaleId);
  const categorieSlug = catPrincipale?.slug || null;
  const categorieNom = catPrincipale?.nom || null;
  const sousCatPrincipale = sousCategoriePrincipale(vitrine.sousCategories, vitrine.sousCategoriePrincipaleId);
  const sousCategorieSlug = sousCatPrincipale?.slug || null;
  const sousCategorieNom = sousCatPrincipale?.nom || null;

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
  const prixMini = calculerPrixMini({ ...vitrine, declinaisons: declinaisonsResolues }, surDevis, marge);

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
          categories: { select: { id: true, slug: true } },
          sousCategories: { select: { id: true, slug: true } },
        },
      })
    : [];
  const autresCartes = autresRaw.map((v) => {
    const surDevisAutre = v.gamme.venteSurDevis || v.venteSurDevis;
    const vPourPrix = { ...v, declinaisons: resoudrePrixDeclinaisons(v.declinaisons, marge) };
    return {
      id: v.id, nom: v.nom, slug: v.slug,
      imageUrl: imagePrincipaleOuGalerie(v),
      prixMini: calculerPrixMini(vPourPrix, surDevisAutre, marge),
      surDevis: surDevisAutre,
      categorieSlug: slugCategoriePrincipale(v.categories, v.categoriePrincipaleId),
      sousCategorieSlug: slugSousCategoriePrincipale(v.sousCategories, v.sousCategoriePrincipaleId),
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
      optionsAdditionnelles: Array.isArray(vitrine.optionsAdditionnelles) ? vitrine.optionsAdditionnelles : [],
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

// Options disponibles pour construire les filtres (catégories+sous-catégories, marques, dimensions)
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

  // Bornes de dimensions disponibles (pour caler les curseurs du filtre)
  const whereVitrines = {
    publie: true,
    gamme: { publie: true, ...(marqueSlug ? { marque: { slug: marqueSlug } } : {}) },
  };
  const agg = await prisma.produitVitrine.aggregate({
    where: whereVitrines,
    _min: { largeurMin: true, hauteurMin: true, profondeurMin: true },
    _max: { largeurMax: true, hauteurMax: true, profondeurMax: true },
  });
  const dimensions = {
    largeur: { min: agg._min.largeurMin ?? null, max: agg._max.largeurMax ?? null },
    hauteur: { min: agg._min.hauteurMin ?? null, max: agg._max.hauteurMax ?? null },
    profondeur: { min: agg._min.profondeurMin ?? null, max: agg._max.profondeurMax ?? null },
  };

  return {
    marques,
    gammes,
    categories: categories.map((c) => ({
      id: c.id,
      nom: c.nom,
      slug: c.slug,
      sousCategories: c.sousCategories,
    })),
    dimensions,
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
  largeurMinF = null,
  largeurMaxF = null,
  hauteurMinF = null,
  hauteurMaxF = null,
  profondeurMinF = null,
  profondeurMaxF = null,
  tri = "nom",
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

  // Filtres dimensions : chevauchement de plages.
  // Un produit [min..max] correspond à une recherche [borneMin..borneMax] si
  // produit.max >= borneMin ET produit.min <= borneMax.
  if (largeurMinF != null) where.largeurMax = { gte: largeurMinF };
  if (largeurMaxF != null) where.largeurMin = { lte: largeurMaxF };
  if (hauteurMinF != null) where.hauteurMax = { gte: hauteurMinF };
  if (hauteurMaxF != null) where.hauteurMin = { lte: hauteurMaxF };
  if (profondeurMinF != null) where.profondeurMax = { gte: profondeurMinF };
  if (profondeurMaxF != null) where.profondeurMin = { lte: profondeurMaxF };

  const vitrines = await prisma.produitVitrine.findMany({
    where,
    orderBy: [{ nom: "asc" }],
    include: {
      gamme: { select: { nom: true, slug: true, venteSurDevis: true, marque: { select: { nom: true, slug: true } } } },
      categories: { select: { id: true, nom: true, slug: true } },
      sousCategories: { select: { id: true, nom: true, slug: true } },
      produits: { select: { prixVenteHT: true, prixPublicHT: true } },
    },
  });

  const marge = await getMargeGlobale();

  let cartes = vitrines.map((v) => {
    const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
    const vPourPrix = { ...v, declinaisons: resoudrePrixDeclinaisons(v.declinaisons, marge) };
    const prixMini = calculerPrixMini(vPourPrix, surDevis, marge);
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
      categories: v.categories.map((c) => ({ nom: c.nom, slug: c.slug })),
      sousCategories: v.sousCategories.map((s) => ({ nom: s.nom, slug: s.slug })),
      categorieSlug: slugCategoriePrincipale(v.categories, v.categoriePrincipaleId),
      sousCategorieSlug: slugSousCategoriePrincipale(v.sousCategories, v.sousCategoriePrincipaleId),
      largeurMin: v.largeurMin ?? null,
      largeurMax: v.largeurMax ?? null,
      hauteurMin: v.hauteurMin ?? null,
      hauteurMax: v.hauteurMax ?? null,
      profondeurMin: v.profondeurMin ?? null,
      profondeurMax: v.profondeurMax ?? null,
    };
  });

  if (prixMin != null) cartes = cartes.filter((c) => c.prixMini == null || c.prixMini >= prixMin);
  if (prixMax != null) cartes = cartes.filter((c) => c.prixMini == null || c.prixMini <= prixMax);

  // Tri (les prix nuls / sur devis vont toujours en fin de liste pour les tris par prix)
  const parNom = (a, b) => a.nom.localeCompare(b.nom, "fr");
  if (tri === "prix-asc") {
    cartes.sort((a, b) => {
      if (a.prixMini == null && b.prixMini == null) return parNom(a, b);
      if (a.prixMini == null) return 1;
      if (b.prixMini == null) return -1;
      return a.prixMini - b.prixMini;
    });
  } else if (tri === "prix-desc") {
    cartes.sort((a, b) => {
      if (a.prixMini == null && b.prixMini == null) return parNom(a, b);
      if (a.prixMini == null) return 1;
      if (b.prixMini == null) return -1;
      return b.prixMini - a.prixMini;
    });
  } else {
    cartes.sort(parNom);
  }

  return cartes;
}