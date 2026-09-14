import { prisma } from "@/lib/prisma";
import {
  prixLigne,
  prixUnitaire,
  prixVitrine,
  appliquerPromoVitrine,
  resoudrePrixDeclinaisons,
  resoudreVitrinePourPrix,
  calculerPrixMini,
  prixPublicsVitrine,
} from "@/lib/prixCatalogue";
import { getCampagnesActives, campagnesPourVitrine } from "@/lib/promotions";

// Ré-exportés pour que les pages qui chargent déjà le catalogue n'aient pas à
// importer deux modules. La définition vit dans lib/prixCatalogue.js.
export { prixLigne, prixUnitaire, prixVitrine, appliquerPromoVitrine, resoudreVitrinePourPrix, calculerPrixMini };

// Attache à chaque vitrine les campagnes qui la visent, pour que les fonctions
// de prix — pures, sans accès base — puissent les appliquer sans qu'on ait à
// faire traverser la liste à toute la chaîne d'appels.
export function attacherCampagnes(vitrines, campagnes) {
  const liste = Array.isArray(vitrines) ? vitrines : [vitrines];
  for (const v of liste) {
    if (v) v.campagnes = campagnesPourVitrine(v, campagnes);
  }
  return vitrines;
}

export async function getMargeGlobale() {
  const reglages = await prisma.reglages.findUnique({ where: { id: 1 }, select: { margeGlobale: true } });
  return reglages?.margeGlobale ?? 0.3;
}

function declinaisonsPubliques(declinaisonsResolues) {
  return declinaisonsResolues.map((d) => ({
    id: d.id,
    valeurs: d.valeurs,
    prixVenteHT: d.prixVenteHT,
  }));
}

// Finition envoyée au navigateur. paletteNom permet de sous-grouper les coloris
// par nuancier d'origine à l'intérieur d'une même option (ex. Tissu BeSoft / Step Mélange).
function finitionPublique(f) {
  return { id: f.id, nom: f.nom, imageUrl: f.imageUrl, couleur: f.couleur, paletteNom: f.paletteNom || null };
}

function slugCategoriePrincipale(categories, categoriePrincipaleId) {
  const list = Array.isArray(categories) ? categories : [];
  if (list.length === 0) return null;
  const principale = categoriePrincipaleId ? list.find((c) => c.id === categoriePrincipaleId) : null;
  return (principale || list[0])?.slug || null;
}

function categoriePrincipale(categories, categoriePrincipaleId) {
  const list = Array.isArray(categories) ? categories : [];
  if (list.length === 0) return null;
  const principale = categoriePrincipaleId ? list.find((c) => c.id === categoriePrincipaleId) : null;
  return principale || list[0] || null;
}

function slugSousCategoriePrincipale(sousCategories, sousCategoriePrincipaleId) {
  const list = Array.isArray(sousCategories) ? sousCategories : [];
  if (list.length === 0) return null;
  const principale = sousCategoriePrincipaleId ? list.find((s) => s.id === sousCategoriePrincipaleId) : null;
  return (principale || list[0])?.slug || null;
}

function sousCategoriePrincipale(sousCategories, sousCategoriePrincipaleId) {
  const list = Array.isArray(sousCategories) ? sousCategories : [];
  if (list.length === 0) return null;
  const principale = sousCategoriePrincipaleId ? list.find((s) => s.id === sousCategoriePrincipaleId) : null;
  return principale || list[0] || null;
}

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

export function urlProduit({ categorieSlug, sousCategorieSlug, slug }) {
  if (!categorieSlug || !slug) return "/catalogue";
  return sousCategorieSlug ? `/${categorieSlug}/${sousCategorieSlug}/${slug}` : `/${categorieSlug}/${slug}`;
}

// /produit/[slug] est l'URL historique du modèle Produit, dont les prix ne
// suivent pas la marge des Réglages. Chaque produit est désormais porté par une
// ProduitVitrine : ce helper retrouve l'URL de cette fiche pour que l'ancienne
// route se contente de rediriger. Renvoie null s'il n'y a pas de destination
// publiée — au routeur de décider quoi faire.
export async function urlVitrineDepuisProduit(slugOuCode) {
  const produit = await prisma.produit.findFirst({
    where: { OR: [{ slug: slugOuCode }, { codeRacine: slugOuCode }] },
    select: {
      vitrine: {
        select: {
          slug: true,
          publie: true,
          categoriePrincipaleId: true,
          sousCategoriePrincipaleId: true,
          gamme: { select: { publie: true } },
          categories: { select: { id: true, slug: true } },
          sousCategories: { select: { id: true, slug: true } },
        },
      },
    },
  });

  const v = produit?.vitrine;
  if (!v || !v.publie || !v.gamme?.publie) return null;

  const url = urlProduit({
    categorieSlug: slugCategoriePrincipale(v.categories, v.categoriePrincipaleId),
    sousCategorieSlug: slugSousCategoriePrincipale(v.sousCategories, v.sousCategoriePrincipaleId),
    slug: v.slug,
  });
  // urlProduit retombe sur "/catalogue" quand il manque la catégorie : ce n'est
  // pas une fiche, donc pas une cible de redirection permanente.
  return url === "/catalogue" ? null : url;
}

function imagePrincipaleOuGalerie(vitrine) {
  if (vitrine.imageUrl) return vitrine.imageUrl;
  if (Array.isArray(vitrine.images) && vitrine.images.length > 0) return vitrine.images[0];
  return null;
}

// ─────── PRIX FAISANT FOI, RECALCULÉ DEPUIS LA BASE ───────
//
// Le prix affiché sur la fiche est calculé dans le navigateur : c'est un
// affichage, jamais une référence. Tout document engageant — devis, commande —
// doit repartir de la base, sinon un panier périmé (ou trafiqué) fixe le prix.
//
// Prend des lignes { vitrineId, declinaisonId } et renvoie une Map
// vitrineId::declinaisonId → { prixHT, surDevis, motif }.
// motif vaut null quand le prix est sûr ; sinon il dit pourquoi il ne l'est pas.
export function clePrixLigne(vitrineId, declinaisonId) {
  return `${vitrineId || ""}::${declinaisonId || ""}`;
}

export async function prixDepuisBase(lignes) {
  const resultats = new Map();
  const ids = [...new Set((lignes || []).map((l) => l.vitrineId).filter(Boolean))];
  if (ids.length === 0) return resultats;

  const marge = await getMargeGlobale();
  const vitrines = await prisma.produitVitrine.findMany({
    where: { id: { in: ids } },
    // categories : indispensables pour savoir quelles campagnes visent la fiche.
    include: { gamme: { select: { venteSurDevis: true } }, categories: { select: { slug: true } } },
  });
  attacherCampagnes(vitrines, await getCampagnesActives());
  const parId = new Map(vitrines.map((v) => [v.id, v]));

  for (const l of lignes) {
    if (!l.vitrineId) continue;
    const cle = clePrixLigne(l.vitrineId, l.declinaisonId);
    if (resultats.has(cle)) continue;

    const v = parId.get(l.vitrineId);
    const surDevis = v ? v.gamme.venteSurDevis || v.venteSurDevis : false;
    resultats.set(cle, prixVitrine(v, { declinaisonId: l.declinaisonId, surDevis, marge }));
  }

  return resultats;
}

// Transforme un produit-accessoire (ProduitVitrine d'une catégorie "estOption") en objet
// "option" tel que l'attend le hook useOptionsAcheteur côté client.
function accessoireVersOption(a, marge) {
  const declResolues = resoudrePrixDeclinaisons(a.declinaisons, marge);
  const declPub = declinaisonsPubliques(declResolues);

  // Les minorations portent un montant négatif — le client retire une pièce et
  // le devis la déduit. prixUnitaire applique la même règle que partout ailleurs :
  // le prix doit exister, pas être positif, et un négatif échappe à la marge.
  const prixFixe = a.sansDeclinaisons ? prixUnitaire(a, marge) : null;

  const desc = (a.descriptif || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  return {
    id: a.id,
    vitrineId: a.id,
    estProduitLie: true,
    nom: a.nom,
    description: desc || null,
    images: (a.images && a.images.length ? a.images : (a.imageUrl ? [a.imageUrl] : [])),
    sansDeclinaisons: !!a.sansDeclinaisons,
    axes: Array.isArray(a.axesDeclinaisons) ? a.axesDeclinaisons : [],
    declinaisons: declPub,
    groupesFinition: (a.groupesFinition || []).map((g) => ({
      id: g.id,
      nom: g.nom,
      finitions: g.finitions.map((f) => ({ id: f.id, nom: f.nom, couleur: f.couleur, imageUrl: f.imageUrl, paletteNom: f.paletteNom || null })),
    })),
    prixVenteHT: prixFixe,
    prixHT: prixFixe,
    slug: a.slug,
    categorieSlug: slugCategoriePrincipale(a.categories, a.categoriePrincipaleId),
    sousCategorieSlug: slugSousCategoriePrincipale(a.sousCategories, a.sousCategoriePrincipaleId),
  };
}

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
      groupesFinition: {
        orderBy: { ordre: "asc" },
        include: { finitions: { orderBy: { ordre: "asc" } } },
      },
      categories: { select: { id: true, slug: true, nom: true } },
      sousCategories: { select: { id: true, slug: true, nom: true } },
      // Pas de filtre sur "publie" : un accessoire n'existe que par le produit
      // auquel il se rattache. Le laisser en brouillon le garde hors du
      // catalogue et de la recherche — beaucoup n'ont pas de visuel — tout en
      // le rendant sélectionnable dans l'onglet Options de la fiche.
      optionsLiees: {
        orderBy: { nom: "asc" },
        include: {
          groupesFinition: { orderBy: { ordre: "asc" }, include: { finitions: { orderBy: { ordre: "asc" } } } },
          categories: { select: { id: true, slug: true } },
          sousCategories: { select: { id: true, slug: true } },
        },
      },
    },
  });
  if (!vitrine) return null;

  // sansDeclinaisons fait autorité : le prix vient de prixUnitaire*, pas des
  // déclinaisons. Basculer un produit en prix unique ne purge pas ses anciennes
  // lignes en base — les envoyer à la fiche lui ferait afficher un prix résiduel
  // (tarif × marge) à la place du prix unique. On les coupe ici, à la source.
  const sansDeclinaisons = !!vitrine.sansDeclinaisons;
  const axesDeclinaisons = sansDeclinaisons || !Array.isArray(vitrine.axesDeclinaisons) ? [] : vitrine.axesDeclinaisons;
  const catPrincipale = categoriePrincipale(vitrine.categories, vitrine.categoriePrincipaleId);
  const categorieSlug = catPrincipale?.slug || null;
  const categorieNom = catPrincipale?.nom || null;
  const sousCatPrincipale = sousCategoriePrincipale(vitrine.sousCategories, vitrine.sousCategoriePrincipaleId);
  const sousCategorieSlug = sousCatPrincipale?.slug || null;
  const sousCategorieNom = sousCatPrincipale?.nom || null;

  const groupesGamme = await prisma.groupeFinition.findMany({
    where: { gammeId: gamme.id, vitrineId: null },
    orderBy: { ordre: "asc" },
    include: { finitions: { orderBy: { ordre: "asc" } } },
  });
  const groupesFinition = groupesGamme.map((grp) => ({
    id: grp.id,
    nom: grp.nom,
    finitions: grp.finitions.map(finitionPublique),
  }));

  const finitionsProduit = vitrine.groupesFinition.map((grp) => ({
    id: grp.id,
    nom: grp.nom,
    finitions: grp.finitions.map(finitionPublique),
  }));

  const optionsInline = Array.isArray(vitrine.optionsAdditionnelles) ? vitrine.optionsAdditionnelles : [];
  const optionsLiees = (vitrine.optionsLiees || []).map((a) => accessoireVersOption(a, marge));
  const optionsAdditionnelles = [...optionsInline, ...optionsLiees];

  const surDevis = gamme.venteSurDevis || vitrine.venteSurDevis;
  const images = (vitrine.images && vitrine.images.length ? vitrine.images : (vitrine.imageUrl ? [vitrine.imageUrl] : []));

  // Tous les prix de la fiche sont arrêtés ici, promo comprise. Le navigateur
  // n'en recalcule aucun : il sélectionne une déclinaison et lit son montant.
  attacherCampagnes(vitrine, await getCampagnesActives());
  const prixPublics = prixPublicsVitrine(vitrine, { surDevis, marge });
  const prixMini = prixPublics.prixMini;

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
          gamme: { select: { venteSurDevis: true } },
          categories: { select: { id: true, slug: true } },
          sousCategories: { select: { id: true, slug: true } },
        },
      })
    : [];
  const autresCartes = autresRaw.map((v) => {
    const surDevisAutre = v.gamme.venteSurDevis || v.venteSurDevis;
    const vPourPrix = resoudreVitrinePourPrix(v, marge);
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
      prixMiniBase: prixPublics.prixMiniBase,
      enPromo: prixPublics.enPromo,
      promoPct: prixPublics.promoPct,
      prixAPartir: vitrine.prixAPartir ?? null,
      // La fiche doit trancher sur ce champ plutôt que de déduire le mode de
      // vente de l'absence d'axes ou de produits.
      sansDeclinaisons,
      sectionsDevis: Array.isArray(vitrine.sectionsDevis) ? vitrine.sectionsDevis : [],
      optionsAdditionnelles,
      axesDeclinaisons,
      declinaisons: prixPublics.declinaisons,
      finitionsProduit,
    },
    groupesFinition,
    autresCartes,
  };
}

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
    },
  });

  const marge = await getMargeGlobale();
  attacherCampagnes(vitrines, await getCampagnesActives());

  let cartes = vitrines.map((v) => {
    const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
    const vPourPrix = resoudreVitrinePourPrix(v, marge);
    // Le prix de la carte inclut la remise : sinon le catalogue annonce un
    // montant que la fiche contredit deux clics plus loin.
    const promo = surDevis
      ? { prixFinal: calculerPrixMini(vPourPrix, surDevis, marge), prixBase: null, enPromo: false, promoPct: null }
      : appliquerPromoVitrine(v, calculerPrixMini(vPourPrix, surDevis, marge));
    const prixMini = promo.prixFinal;
    return {
      id: v.id,
      nom: v.nom,
      slug: v.slug,
      imageUrl: imagePrincipaleOuGalerie(v),
      prixMini,
      prixMiniBase: promo.enPromo ? promo.prixBase : null,
      promoPct: promo.enPromo ? promo.promoPct : null,
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
