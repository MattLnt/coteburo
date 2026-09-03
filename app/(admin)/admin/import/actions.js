"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Identifiant court, au même format que ceux générés par l'éditeur de carte
// ("pw3ge") — les déclinaisons y sont référencées par id.
function idCourt() {
  return Math.random().toString(36).slice(2, 7);
}

const entier = (v) => {
  if (v === "" || v == null) return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
};

// Suffixe apposé à tous les produits importés : permet de les repérer d'un
// coup d'œil dans l'admin et évite les collisions de slug avec l'existant.
const SUFFIXE = " - NEW";

// Nom sans le suffixe, pour comparer un produit du fichier à ceux en base
// quelle que soit la casse, les accents ou la présence du « - NEW ».
const cleNom = (nom) => slugify((nom || "").replace(SUFFIXE, ""));

export async function getContexteImport() {
  const [gammes, categories] = await Promise.all([
    prisma.gamme.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, marque: { select: { nom: true } } },
    }),
    prisma.categorie.findMany({
      orderBy: { nom: "asc" },
      include: { sousCategories: { orderBy: { nom: "asc" }, select: { id: true, nom: true } } },
    }),
  ]);

  return {
    gammes: gammes.map((g) => ({ id: g.id, nom: g.nom, marque: g.marque?.nom || "" })),
    categories: categories.map((c) => ({
      id: c.id,
      nom: c.nom,
      sousCategories: c.sousCategories,
    })),
  };
}

// Trouve ou crée une gamme par son nom. Utilisé pour la gamme cible du fichier
// et pour celles qu'un produit désigne lui-même (les accessoires vivent dans
// leur propre gamme, pas dans celle de la collection importée).
async function resoudreGamme(nom, { creer = true } = {}) {
  const propre = (nom || "").trim();
  if (!propre) return null;

  const slug = slugify(propre);
  const existante = await prisma.gamme.findUnique({ where: { slug } });
  if (existante) return existante.id;
  if (!creer) return null;

  const marque =
    (await prisma.marque.findFirst({ where: { slug: "buronomic" } })) ||
    (await prisma.marque.findFirst());
  if (!marque) return null;

  const creee = await prisma.gamme.create({
    data: { nom: propre, slug, marqueId: marque.id, publie: false, venteSurDevis: false },
  });
  return creee.id;
}

// Normalise et contrôle le JSON. Renvoie la liste des produits prêts à créer
// et les anomalies relevées. Utilisée par l'aperçu ET par l'import, pour que
// ce qui s'affiche soit exactement ce qui sera écrit.
async function preparer(texteJson, gammeParDefautId, gammeParDefautNom) {
  let brut;
  try {
    brut = JSON.parse(texteJson);
  } catch (e) {
    return { erreur: `JSON invalide : ${e.message}` };
  }

  const produitsSource = Array.isArray(brut) ? brut : brut.produits;
  if (!Array.isArray(produitsSource) || produitsSource.length === 0) {
    return { erreur: "Aucun produit trouvé. Le JSON doit contenir un tableau « produits »." };
  }

  const [categories, toutesGammes, existants] = await Promise.all([
    prisma.categorie.findMany({
      include: { sousCategories: { select: { id: true, nom: true, slug: true } } },
    }),
    prisma.gamme.findMany({ select: { id: true, nom: true, slug: true } }),
    prisma.produitVitrine.findMany({ select: { id: true, slug: true, nom: true, gammeId: true } }),
  ]);

  // Correspondance par slug du nom : « Bureaux direction » trouve la
  // catégorie quelle que soit la casse ou les accents.
  const trouverCategorie = (nom) => {
    if (!nom) return null;
    const cible = slugify(nom);
    return categories.find((c) => slugify(c.nom) === cible || c.slug === cible) || null;
  };
  const trouverSousCategorie = (cat, nom) => {
    if (!cat || !nom) return null;
    const cible = slugify(nom);
    return cat.sousCategories.find((s) => slugify(s.nom) === cible || s.slug === cible) || null;
  };
  const trouverGamme = (nom) => {
    if (!nom) return null;
    const cible = slugify(nom);
    return toutesGammes.find((g) => slugify(g.nom) === cible || g.slug === cible) || null;
  };

  const slugsParGamme = new Map();
  for (const p of existants) {
    if (!slugsParGamme.has(p.gammeId)) slugsParGamme.set(p.gammeId, new Set());
    slugsParGamme.get(p.gammeId).add(p.slug);
  }
  const nomsExistants = new Set(existants.map((p) => cleNom(p.nom)));
  // Accessoires déjà en base, indexés par nom : un produit peut se lier à eux
  // sans qu'ils figurent dans le fichier.
  const vitrinesParNom = new Map(existants.map((p) => [cleNom(p.nom), p.id]));

  const prepares = [];
  const alertes = [];

  produitsSource.forEach((p, index) => {
    const nomBrut = (p.nom || "").trim();
    if (!nomBrut) {
      alertes.push({ type: "erreur", texte: `Produit ${index + 1} : nom manquant, il sera ignoré.` });
      return;
    }

    const nomFinal = nomBrut.endsWith(SUFFIXE) ? nomBrut : nomBrut + SUFFIXE;

    // Gamme : celle indiquée par le produit, sinon celle choisie à l'import.
    const gammeDemandee = (p.gamme || "").trim();
    const gammeExistante = gammeDemandee ? trouverGamme(gammeDemandee) : null;
    const gammeCibleId = gammeDemandee ? (gammeExistante?.id || null) : gammeParDefautId;
    const gammeCibleNom = gammeDemandee || gammeParDefautNom || null;

    if (gammeDemandee && !gammeExistante) {
      alertes.push({ type: "info", texte: `${nomBrut} : la gamme « ${gammeDemandee} » sera créée.` });
    }

    // Unicité du slug dans la gamme de destination.
    const pris = slugsParGamme.get(gammeCibleId) || new Set();
    if (!slugsParGamme.has(gammeCibleId)) slugsParGamme.set(gammeCibleId, pris);
    let slug = slugify(nomFinal);
    let i = 1;
    while (pris.has(slug)) slug = `${slugify(nomFinal)}-${i++}`;
    pris.add(slug);

    const estDoublon = nomsExistants.has(cleNom(nomBrut));

    // ── Catégories ──
    const cat = trouverCategorie(p.categorie);
    const sousCat = trouverSousCategorie(cat, p.sousCategorie);
    if (p.categorie && !cat) {
      alertes.push({ type: "attention", texte: `${nomBrut} : catégorie « ${p.categorie} » introuvable, à rattacher à la main.` });
    }
    if (p.sousCategorie && cat && !sousCat) {
      alertes.push({ type: "attention", texte: `${nomBrut} : sous-catégorie « ${p.sousCategorie} » introuvable dans ${cat.nom}.` });
    }

    // ── Axes et déclinaisons ──
    const axes = Array.isArray(p.axesDeclinaisons)
      ? p.axesDeclinaisons
          .filter((a) => a && a.nom)
          .map((a) => ({
            id: a.id || slugify(a.nom),
            nom: a.nom,
            valeurs: Array.isArray(a.valeurs) ? a.valeurs : [],
          }))
      : [];

    const declinaisons = Array.isArray(p.declinaisons)
      ? p.declinaisons.map((d) => ({
          id: d.id || idCourt(),
          valeurs: d.valeurs || {},
          // Les prix sont des chaînes dans l'éditeur : on garde ce format,
          // vides par défaut puisqu'ils seront saisis depuis le catalogue.
          prixTarifHT: d.prixTarifHT != null ? String(d.prixTarifHT) : "",
          prixVenteHT: d.prixVenteHT != null ? String(d.prixVenteHT) : "",
          prixVerrouille: !!d.prixVerrouille,
          referenceFournisseur: (d.referenceFournisseur || "").trim() || null,
        }))
      : [];

    const sansDeclinaisons = p.sansDeclinaisons != null
      ? !!p.sansDeclinaisons
      : declinaisons.length === 0;

    // Une déclinaison dont les valeurs ne correspondent à aucun axe ne
    // s'affichera pas sur la fiche : autant le signaler tout de suite.
    if (!sansDeclinaisons && axes.length > 0) {
      const idsAxes = axes.map((a) => a.id);
      declinaisons.forEach((d) => {
        const manquants = idsAxes.filter((ax) => !(ax in (d.valeurs || {})));
        if (manquants.length > 0) {
          alertes.push({ type: "attention", texte: `${nomBrut} : la déclinaison ${d.referenceFournisseur || d.id} ne renseigne pas ${manquants.join(", ")}.` });
        }
      });
    }

    // ── Finitions ──
    const groupesFinition = Array.isArray(p.groupesFinition)
      ? p.groupesFinition
          .filter((g) => g && g.nom)
          .map((g, gi) => ({
            nom: g.nom,
            ordre: gi,
            finitions: (Array.isArray(g.finitions) ? g.finitions : [])
              .filter((f) => f && f.nom)
              .map((f, fi) => ({
                nom: f.nom,
                couleur: f.couleur || null,
                imageUrl: f.imageUrl || null,
                paletteNom: f.paletteNom || null,
                ordre: fi,
              })),
          }))
      : [];

    const dim = p.dimensions || {};

    prepares.push({
      nom: nomFinal,
      nomOrigine: nomBrut,
      slug,
      estDoublon,
      gammeDemandee: gammeDemandee || null,
      gammeCibleId,
      gammeCibleNom,
      descriptif: p.descriptif || null,
      categorieId: cat?.id || null,
      categorieNom: cat?.nom || null,
      sousCategorieId: sousCat?.id || null,
      sousCategorieNom: sousCat?.nom || null,
      largeurMin: entier(dim.largeurMin),
      largeurMax: entier(dim.largeurMax),
      hauteurMin: entier(dim.hauteurMin),
      hauteurMax: entier(dim.hauteurMax),
      profondeurMin: entier(dim.profondeurMin),
      profondeurMax: entier(dim.profondeurMax),
      sansDeclinaisons,
      referenceUnitaire: (p.referenceUnitaire || "").trim() || null,
      axesDeclinaisons: axes,
      declinaisons,
      groupesFinition,
      // Noms bruts : la résolution en identifiants se fait plus bas, une fois
      // qu'on connaît tous les produits du fichier.
      optionsLiees: Array.isArray(p.optionsLiees) ? p.optionsLiees.filter(Boolean) : [],
    });
  });

  // ── Liaison des accessoires ──
  // Un produit peut se lier à un accessoire du même fichier ou à un accessoire
  // déjà en base. Les premiers n'ont pas encore d'identifiant : on les repère
  // par leur nom, et l'import les crée avant les produits qui s'y rattachent.
  const nomsDuFichier = new Set(prepares.map((p) => cleNom(p.nom)));

  for (const p of prepares) {
    p.optionsResolues = [];
    for (const nomOption of p.optionsLiees) {
      const cle = cleNom(nomOption);
      if (nomsDuFichier.has(cle)) {
        p.optionsResolues.push({ cle, nom: nomOption, source: "fichier" });
      } else if (vitrinesParNom.has(cle)) {
        p.optionsResolues.push({ cle, nom: nomOption, source: "base", id: vitrinesParNom.get(cle) });
      } else {
        alertes.push({ type: "attention", texte: `${p.nomOrigine} : accessoire « ${nomOption} » introuvable, la liaison sera ignorée.` });
      }
    }
  }

  // Les accessoires d'abord : ils doivent exister avant les produits qui s'y
  // rattachent. Un accessoire est un produit référencé par un autre.
  const clesAccessoires = new Set(
    prepares.flatMap((p) => p.optionsResolues.filter((o) => o.source === "fichier").map((o) => o.cle))
  );
  prepares.sort((a, b) => {
    const aAcc = clesAccessoires.has(cleNom(a.nom)) ? 0 : 1;
    const bAcc = clesAccessoires.has(cleNom(b.nom)) ? 0 : 1;
    return aAcc - bAcc;
  });

  return { produits: prepares, alertes };
}

export async function analyserImport({ json, gammeId, nouvelleGammeNom }) {
  const gamme = gammeId
    ? await prisma.gamme.findUnique({ where: { id: gammeId }, select: { nom: true } })
    : null;

  const res = await preparer(json, gammeId || null, gamme?.nom || nouvelleGammeNom || null);
  if (res.erreur) return { erreur: res.erreur };

  return {
    gammeNom: gamme?.nom || nouvelleGammeNom || null,
    produits: res.produits,
    alertes: res.alertes,
    total: res.produits.length,
  };
}

export async function lancerImport({ json, gammeId, nouvelleGammeNom }) {
  // ── Gamme par défaut, pour les produits qui n'en désignent aucune ──
  let gammeIdFinal = gammeId || null;
  let gammeNomFinal = null;

  if (gammeIdFinal) {
    const g = await prisma.gamme.findUnique({ where: { id: gammeIdFinal }, select: { nom: true } });
    gammeNomFinal = g?.nom || null;
  } else {
    const nomPropre = (nouvelleGammeNom || "").trim();
    if (!nomPropre) return { erreur: "Choisissez une gamme existante ou nommez la nouvelle." };
    gammeIdFinal = await resoudreGamme(nomPropre);
    if (!gammeIdFinal) return { erreur: "Impossible de créer la gamme — aucune marque en base." };
    gammeNomFinal = nomPropre;
  }

  const res = await preparer(json, gammeIdFinal, gammeNomFinal);
  if (res.erreur) return { erreur: res.erreur };
  if (res.produits.length === 0) return { erreur: "Aucun produit à importer." };

  // Les gammes désignées par un produit et qui n'existent pas encore sont
  // créées maintenant, avant la boucle d'insertion.
  const gammesResolues = new Map();
  for (const p of res.produits) {
    if (!p.gammeDemandee || p.gammeCibleId) continue;
    if (!gammesResolues.has(p.gammeDemandee)) {
      const id = await resoudreGamme(p.gammeDemandee);
      gammesResolues.set(p.gammeDemandee, id);
    }
  }

  // Position de départ dans chaque gamme touchée.
  const ordreParGamme = new Map();
  const prochainOrdre = async (gid) => {
    if (!ordreParGamme.has(gid)) {
      const dernier = await prisma.produitVitrine.findFirst({
        where: { gammeId: gid },
        orderBy: { ordre: "desc" },
        select: { ordre: true },
      });
      ordreParGamme.set(gid, (dernier?.ordre ?? -1) + 1);
    }
    const n = ordreParGamme.get(gid);
    ordreParGamme.set(gid, n + 1);
    return n;
  };

  // Identifiants des produits créés, par nom : les accessoires du fichier
  // s'y retrouvent au moment de lier les produits qui les utilisent.
  const idsCrees = new Map();
  const creees = [];

  for (const p of res.produits) {
    const gid = p.gammeCibleId || gammesResolues.get(p.gammeDemandee) || gammeIdFinal;
    if (!gid) continue;

    // Les accessoires viennent en premier dans la liste (tri fait à la
    // préparation), donc leurs identifiants sont déjà connus ici.
    const idsOptions = p.optionsResolues
      .map((o) => (o.source === "base" ? o.id : idsCrees.get(o.cle)))
      .filter(Boolean);

    // Les produits arrivent en brouillon : prix à saisir et photos à ajouter
    // avant publication.
    const vitrine = await prisma.produitVitrine.create({
      data: {
        nom: p.nom,
        slug: p.slug,
        gammeId: gid,
        ordre: await prochainOrdre(gid),
        publie: false,
        venteSurDevis: false,
        descriptif: p.descriptif,
        largeurMin: p.largeurMin,
        largeurMax: p.largeurMax,
        hauteurMin: p.hauteurMin,
        hauteurMax: p.hauteurMax,
        profondeurMin: p.profondeurMin,
        profondeurMax: p.profondeurMax,
        sansDeclinaisons: p.sansDeclinaisons,
        referenceUnitaire: p.referenceUnitaire,
        axesDeclinaisons: p.axesDeclinaisons,
        declinaisons: p.declinaisons,
        categories: p.categorieId ? { connect: { id: p.categorieId } } : undefined,
        sousCategories: p.sousCategorieId ? { connect: { id: p.sousCategorieId } } : undefined,
        categoriePrincipaleId: p.categorieId,
        sousCategoriePrincipaleId: p.sousCategorieId,
        optionsLiees: idsOptions.length > 0 ? { connect: idsOptions.map((id) => ({ id })) } : undefined,
      },
      select: { id: true },
    });

    idsCrees.set(cleNom(p.nom), vitrine.id);

    // Les finitions sont des tables à part, créées après la vitrine.
    for (const g of p.groupesFinition) {
      await prisma.groupeFinition.create({
        data: {
          nom: g.nom,
          ordre: g.ordre,
          vitrineId: vitrine.id,
          finitions: { create: g.finitions },
        },
      });
    }

    creees.push({ id: vitrine.id, nom: p.nom, gammeId: gid, nbOptions: idsOptions.length });
  }

  revalidatePath("/admin/produits");
  for (const gid of new Set(creees.map((c) => c.gammeId))) {
    revalidatePath(`/admin/architecture/${gid}`);
  }

  return { ok: true, gammeId: gammeIdFinal, produits: creees };
}