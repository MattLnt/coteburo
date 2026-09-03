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
const SUFFIXE = " NEW";

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

// Normalise et contrôle le JSON. Renvoie la liste des produits prêts à créer
// et les anomalies relevées. Utilisée par l'aperçu ET par l'import, pour que
// ce qui s'affiche soit exactement ce qui sera écrit.
async function preparer(texteJson, gammeId) {
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

  const categories = await prisma.categorie.findMany({
    include: { sousCategories: { select: { id: true, nom: true, slug: true } } },
  });

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

  // Slugs déjà pris dans la gamme cible — pour numéroter les doublons.
  const existants = gammeId
    ? (await prisma.produitVitrine.findMany({ where: { gammeId }, select: { slug: true, nom: true } }))
    : [];
  const slugsPris = new Set(existants.map((p) => p.slug));
  const nomsExistants = new Set(existants.map((p) => slugify(p.nom.replace(SUFFIXE, ""))));

  const prepares = [];
  const alertes = [];

  produitsSource.forEach((p, index) => {
    const nomBrut = (p.nom || "").trim();
    if (!nomBrut) {
      alertes.push({ type: "erreur", texte: `Produit ${index + 1} : nom manquant, il sera ignoré.` });
      return;
    }

    const nomFinal = nomBrut.endsWith(SUFFIXE) ? nomBrut : nomBrut + SUFFIXE;

    let slug = slugify(nomFinal);
    let i = 1;
    while (slugsPris.has(slug)) slug = `${slugify(nomFinal)}-${i++}`;
    slugsPris.add(slug);

    const estDoublon = nomsExistants.has(slugify(nomBrut));

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
    });
  });

  return { produits: prepares, alertes };
}

export async function analyserImport({ json, gammeId }) {
  const res = await preparer(json, gammeId || null);
  if (res.erreur) return { erreur: res.erreur };

  const gamme = gammeId
    ? await prisma.gamme.findUnique({ where: { id: gammeId }, select: { nom: true } })
    : null;

  return {
    gammeNom: gamme?.nom || null,
    produits: res.produits,
    alertes: res.alertes,
    total: res.produits.length,
  };
}

export async function lancerImport({ json, gammeId, nouvelleGammeNom }) {
  // ── Gamme cible ──
  let gammeIdFinal = gammeId || null;

  if (!gammeIdFinal) {
    const nomPropre = (nouvelleGammeNom || "").trim();
    if (!nomPropre) return { erreur: "Choisissez une gamme existante ou nommez la nouvelle." };

    const marque =
      (await prisma.marque.findFirst({ where: { slug: "buronomic" } })) ||
      (await prisma.marque.findFirst());
    if (!marque) return { erreur: "Aucune marque en base." };

    const slugGamme = slugify(nomPropre);
    const existante = await prisma.gamme.findUnique({ where: { slug: slugGamme } });
    if (existante) {
      gammeIdFinal = existante.id;
    } else {
      const creee = await prisma.gamme.create({
        data: { nom: nomPropre, slug: slugGamme, marqueId: marque.id, publie: false, venteSurDevis: false },
      });
      gammeIdFinal = creee.id;
    }
  }

  const res = await preparer(json, gammeIdFinal);
  if (res.erreur) return { erreur: res.erreur };
  if (res.produits.length === 0) return { erreur: "Aucun produit à importer." };

  const dernier = await prisma.produitVitrine.findFirst({
    where: { gammeId: gammeIdFinal },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });
  let ordre = (dernier?.ordre ?? -1) + 1;

  const creees = [];

  for (const p of res.produits) {
    // Les produits arrivent en brouillon : prix à saisir et photos à ajouter
    // avant publication.
    const vitrine = await prisma.produitVitrine.create({
      data: {
        nom: p.nom,
        slug: p.slug,
        gammeId: gammeIdFinal,
        ordre: ordre++,
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
      },
      select: { id: true },
    });

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

    creees.push({ id: vitrine.id, nom: p.nom });
  }

  revalidatePath("/admin/produits");
  revalidatePath(`/admin/architecture/${gammeIdFinal}`);

  return { ok: true, gammeId: gammeIdFinal, produits: creees };
}