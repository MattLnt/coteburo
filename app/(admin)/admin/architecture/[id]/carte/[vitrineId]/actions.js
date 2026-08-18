"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function getCarteEdition(vitrineId) {
  const vitrine = await prisma.produitVitrine.findUnique({
    where: { id: vitrineId },
    include: {
      gamme: { select: { id: true, nom: true, venteSurDevis: true, marqueId: true } },
      categories: { select: { id: true } },
      sousCategories: { select: { id: true } },
      produits: {
        orderBy: { designation: "asc" },
        select: {
          codeRacine: true, designation: true,
          prixPublicHT: true, prixVenteHT: true,
          longueur: true, hauteur: true, profondeur: true, plateau: true, pied: true, options: true,
          _count: { select: { variantes: true } },
        },
      },
    },
  });
  if (!vitrine) return null;

  const prixListe = vitrine.produits.map((p) => p.prixVenteHT ?? p.prixPublicHT).filter((x) => x != null && x > 0);
  const prixMiniAuto = prixListe.length ? Math.min(...prixListe) : null;
  const surDevisEffectif = vitrine.gamme.venteSurDevis || vitrine.venteSurDevis;

  // Catégories GLOBALES (toutes marques confondues) : la taxonomie catégorie > sous-catégorie
  // est commune à tout le catalogue. On ne filtre PLUS par la marque de la gamme — sinon les
  // produits d'une marque sans catégorie propre (ex. OfficePro, Sokoa) n'auraient aucune
  // catégorie à sélectionner et se retrouveraient sans URL publique valide.
  const categories = await prisma.categorie.findMany({
    orderBy: { nom: "asc" },
    include: { sousCategories: { orderBy: { nom: "asc" }, select: { id: true, nom: true, slug: true } } },
  });

  // Marge globale définie dans les Réglages admin — utilisée pour calculer le prix de
  // vente à partir du prix tarif fournisseur, ligne par ligne dans l'onglet Prix.
  const reglages = await prisma.reglages.findUnique({ where: { id: 1 }, select: { margeGlobale: true } });
  const margeGlobale = reglages?.margeGlobale ?? 0.3;

  const categorieIds = vitrine.categories.map((c) => c.id);
  const sousCategorieIds = vitrine.sousCategories.map((s) => s.id);

  return {
    id: vitrine.id,
    nom: vitrine.nom,
    slug: vitrine.slug,
    descriptif: vitrine.descriptif || "",
    imageUrl: vitrine.imageUrl || null,
    images: vitrine.images || [],
    publie: vitrine.publie,
    venteSurDevis: vitrine.venteSurDevis,
    bestSeller: vitrine.bestSeller,
    promoPct: vitrine.promoPct ?? "",
    promoDebut: vitrine.promoDebut ? vitrine.promoDebut.toISOString().slice(0, 10) : "",
    promoFin: vitrine.promoFin ? vitrine.promoFin.toISOString().slice(0, 10) : "",
    gammeForceDevis: vitrine.gamme.venteSurDevis,
    surDevisEffectif,
    sectionsDevis: Array.isArray(vitrine.sectionsDevis) ? vitrine.sectionsDevis : [],
    axesDeclinaisons: Array.isArray(vitrine.axesDeclinaisons) ? vitrine.axesDeclinaisons : [],
    declinaisons: Array.isArray(vitrine.declinaisons) ? vitrine.declinaisons : [],
    prixAPartir: vitrine.prixAPartir ?? null,
    sansDeclinaisons: !!vitrine.sansDeclinaisons,
    prixUnitaireTarifHT: vitrine.prixUnitaireTarifHT ?? "",
    prixUnitaireHT: vitrine.prixUnitaireHT ?? "",
    prixUnitaireVerrouille: !!vitrine.prixUnitaireVerrouille,
    referenceUnitaire: vitrine.referenceUnitaire ?? "",
    optionsAdditionnelles: vitrine.optionsAdditionnelles ?? [],
    largeurMin: vitrine.largeurMin ?? "",
    largeurMax: vitrine.largeurMax ?? "",
    hauteurMin: vitrine.hauteurMin ?? "",
    hauteurMax: vitrine.hauteurMax ?? "",
    profondeurMin: vitrine.profondeurMin ?? "",
    profondeurMax: vitrine.profondeurMax ?? "",
    prixMiniAuto,
    margeGlobale,
    gammeId: vitrine.gamme.id,
    gammeNom: vitrine.gamme.nom,
    // Sélection multiple + catégorie/sous-catégorie principale (celles qui font l'URL)
    categorieIds,
    sousCategorieIds,
    categoriePrincipaleId:
      vitrine.categoriePrincipaleId && categorieIds.includes(vitrine.categoriePrincipaleId)
        ? vitrine.categoriePrincipaleId
        : (categorieIds[0] || null),
    sousCategoriePrincipaleId:
      vitrine.sousCategoriePrincipaleId && sousCategorieIds.includes(vitrine.sousCategoriePrincipaleId)
        ? vitrine.sousCategoriePrincipaleId
        : (sousCategorieIds[0] || null),
    categoriesDisponibles: categories.map((c) => ({
      id: c.id, nom: c.nom,
      sousCategories: c.sousCategories,
    })),
    produits: vitrine.produits.map((p) => ({
      codeRacine: p.codeRacine, designation: p.designation,
      prixPublicHT: p.prixPublicHT, prixVenteHT: p.prixVenteHT,
      longueur: p.longueur, hauteur: p.hauteur, profondeur: p.profondeur,
      plateau: p.plateau, pied: p.pied, options: p.options || [],
      nbVariantes: p._count.variantes,
    })),
  };
}

// ─────────── SAUVEGARDE UNIQUE : tout en un clic ───────────
export async function sauverCarteComplete(vitrineId, data) {
  const {
    nom, descriptif, imageUrl, images,
    sectionsDevis, prixAPartir,
    sansDeclinaisons, prixUnitaireTarifHT, prixUnitaireHT, prixUnitaireVerrouille, referenceUnitaire, optionsAdditionnelles,
    largeurMin, largeurMax, hauteurMin, hauteurMax, profondeurMin, profondeurMax,
    axesDeclinaisons, declinaisons,
    categorieIds, sousCategorieIds, categoriePrincipaleId, sousCategoriePrincipaleId,
    bestSeller, promoPct, promoDebut, promoFin,
    venteSurDevis, publie,
  } = data;

  const toNum = (v) => {
    if (v === "" || v == null) return null;
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isNaN(n) ? null : n;
  };
  const toEntier = (v) => {
    if (v === "" || v == null) return null;
    const n = parseInt(String(v), 10);
    return Number.isNaN(n) ? null : n;
  };
  const toDate = (v) => (v ? new Date(v + "T00:00:00") : null);

  const catIds = Array.isArray(categorieIds) ? categorieIds : [];
  const sousCatIds = Array.isArray(sousCategorieIds) ? sousCategorieIds : [];
  // Les principales doivent faire partie des sélections ; sinon on prend la première (ou rien).
  const principaleId = catIds.includes(categoriePrincipaleId) ? categoriePrincipaleId : (catIds[0] || null);
  const sousPrincipaleId = sousCatIds.includes(sousCategoriePrincipaleId) ? sousCategoriePrincipaleId : (sousCatIds[0] || null);

  const v = await prisma.produitVitrine.update({
    where: { id: vitrineId },
    data: {
      nom: nom?.trim() || "Sans nom",
      descriptif: descriptif ?? null,
      imageUrl: imageUrl ?? null,
      images: Array.isArray(images) ? images : [],
      sectionsDevis: Array.isArray(sectionsDevis) ? sectionsDevis : [],
      prixAPartir: toNum(prixAPartir),
      sansDeclinaisons: !!sansDeclinaisons,
      prixUnitaireTarifHT: toNum(prixUnitaireTarifHT),
      prixUnitaireHT: toNum(prixUnitaireHT),
      prixUnitaireVerrouille: !!prixUnitaireVerrouille,
      referenceUnitaire: (referenceUnitaire ?? "").trim() || null,
      optionsAdditionnelles: Array.isArray(optionsAdditionnelles)
        ? optionsAdditionnelles
            .filter((o) => o && (o.nom || "").trim())
            .map((o) => {
              const sansDecl = o.sansDeclinaisons ?? true;
              const prixVente = toNum(o.prixVenteHT ?? o.prixHT);
              return {
                id: o.id || undefined,
                nom: (o.nom || "").trim(),
                description: (o.description || "").trim() || null,
                images: Array.isArray(o.images) ? o.images : [],
                sansDeclinaisons: !!sansDecl,
                referenceUnitaire: (o.referenceUnitaire || "").trim() || null,
                // Prix unique
                prixTarifHT: toNum(o.prixTarifHT),
                prixVenteHT: prixVente,
                prixHT: prixVente,                 // compat ancien front
                reference: (o.reference || "").trim() || null, // compat
                // Déclinaisons (axes + finitions par valeur conservés tels quels)
                axes: Array.isArray(o.axes) ? o.axes : [],
                declinaisons: Array.isArray(o.declinaisons)
                  ? o.declinaisons.map((d) => ({
                      id: d.id,
                      valeurs: d.valeurs || {},
                      prixTarifHT: toNum(d.prixTarifHT),
                      prixVenteHT: toNum(d.prixVenteHT),
                      prixVerrouille: !!d.prixVerrouille,
                      referenceFournisseur: (d.referenceFournisseur || "").trim() || null,
                    }))
                  : [],
                // Finitions globales (coloris de l'option)
                groupesFinition: Array.isArray(o.groupesFinition)
                  ? o.groupesFinition
                      .filter((g) => g && ((g.nom || "").trim() || (g.finitions || []).length))
                      .map((g) => ({
                        id: g.id,
                        nom: (g.nom || "").trim(),
                        finitions: Array.isArray(g.finitions)
                          ? g.finitions.map((f) => ({ id: f.id, nom: f.nom, couleur: f.couleur || null, imageUrl: f.imageUrl || null }))
                          : [],
                      }))
                  : [],
              };
            })
        : [],
      largeurMin: toEntier(largeurMin),
      largeurMax: toEntier(largeurMax),
      hauteurMin: toEntier(hauteurMin),
      hauteurMax: toEntier(hauteurMax),
      profondeurMin: toEntier(profondeurMin),
      profondeurMax: toEntier(profondeurMax),
      axesDeclinaisons: Array.isArray(axesDeclinaisons) ? axesDeclinaisons : [],
      declinaisons: Array.isArray(declinaisons) ? declinaisons : [],
      categories: { set: catIds.map((id) => ({ id })) },
      sousCategories: { set: sousCatIds.map((id) => ({ id })) },
      categoriePrincipaleId: principaleId,
      sousCategoriePrincipaleId: sousPrincipaleId,
      bestSeller: !!bestSeller,
      promoPct: toNum(promoPct),
      promoDebut: toDate(promoDebut),
      promoFin: toDate(promoFin),
      venteSurDevis: !!venteSurDevis,
      publie: !!publie,
    },
    select: { gammeId: true },
  });

  revalidatePath(`/admin/architecture/${v.gammeId}`);
  revalidatePath(`/admin/architecture/${v.gammeId}/carte/${vitrineId}`);
  revalidatePath("/admin/produits");
  return { ok: true };
}

// ─────────── Changement de gamme d'un produit déjà créé ───────────
export async function getGammesPourRecherche() {
  return prisma.gamme.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });
}

export async function changerGammeProduit(vitrineId, { gammeId, nouvelleGammeNom }) {
  let gammeIdFinal = gammeId || null;

  if (!gammeIdFinal) {
    const nomPropre = (nouvelleGammeNom || "").trim();
    if (!nomPropre) return { ok: false, error: "Choisis une gamme existante ou indique le nom d'une nouvelle gamme." };

    const marque = (await prisma.marque.findFirst({ where: { slug: "buronomic" } })) || (await prisma.marque.findFirst());
    if (!marque) return { ok: false, error: "Aucune marque trouvée en base." };

    const slug = slugify(nomPropre);
    const existante = await prisma.gamme.findUnique({ where: { slug } });
    if (existante) {
      gammeIdFinal = existante.id;
    } else {
      const nouvelle = await prisma.gamme.create({
        data: { nom: nomPropre, slug, marqueId: marque.id, publie: true, venteSurDevis: false },
      });
      gammeIdFinal = nouvelle.id;
    }
  }

  const vitrine = await prisma.produitVitrine.findUnique({ where: { id: vitrineId }, select: { slug: true, gammeId: true } });
  if (!vitrine) return { ok: false, error: "Produit introuvable." };
  if (vitrine.gammeId === gammeIdFinal) return { ok: true, gammeId: gammeIdFinal };

  let slugFinal = vitrine.slug;
  let i = 1;
  while (await prisma.produitVitrine.findUnique({ where: { gammeId_slug: { gammeId: gammeIdFinal, slug: slugFinal } } })) {
    slugFinal = `${vitrine.slug}-${i++}`;
  }

  await prisma.produitVitrine.update({ where: { id: vitrineId }, data: { gammeId: gammeIdFinal, slug: slugFinal } });

  revalidatePath(`/admin/architecture/${vitrine.gammeId}`);
  revalidatePath(`/admin/architecture/${gammeIdFinal}`);
  revalidatePath(`/admin/architecture/${gammeIdFinal}/carte/${vitrineId}`);
  revalidatePath("/admin/produits");
  return { ok: true, gammeId: gammeIdFinal };
}

/* ─────────────── FINITIONS DU PRODUIT (rattachées à la vitrine, pas à la gamme) ─────────────── */

export async function getFinitionsProduit(vitrineId) {
  const groupes = await prisma.groupeFinition.findMany({
    where: { vitrineId },
    orderBy: { ordre: "asc" },
    include: { finitions: { orderBy: { ordre: "asc" } } },
  });
  return groupes.map((g) => ({
    id: g.id,
    nom: g.nom,
    ordre: g.ordre,
    finitions: g.finitions.map((f) => ({
      id: f.id, nom: f.nom, imageUrl: f.imageUrl || null, couleur: f.couleur || null, ordre: f.ordre,
    })),
  }));
}

async function gammeIdDeVitrine(vitrineId) {
  const v = await prisma.produitVitrine.findUnique({ where: { id: vitrineId }, select: { gammeId: true } });
  return v?.gammeId || null;
}

async function gammeIdDeGroupe(groupeId) {
  const g = await prisma.groupeFinition.findUnique({ where: { id: groupeId }, select: { vitrineId: true, vitrine: { select: { gammeId: true } } } });
  return { vitrineId: g?.vitrineId || null, gammeId: g?.vitrine?.gammeId || null };
}

export async function creerGroupeFinitionProduit(vitrineId, nom) {
  const nomPropre = (nom || "").trim();
  if (!nomPropre) return { ok: false, error: "Le nom est obligatoire." };

  const dernier = await prisma.groupeFinition.findFirst({ where: { vitrineId }, orderBy: { ordre: "desc" }, select: { ordre: true } });
  const groupe = await prisma.groupeFinition.create({
    data: { nom: nomPropre, vitrineId, ordre: (dernier?.ordre ?? -1) + 1 },
  });

  const gammeId = await gammeIdDeVitrine(vitrineId);
  if (gammeId) revalidatePath(`/admin/architecture/${gammeId}/carte/${vitrineId}`);
  return { ok: true, id: groupe.id };
}

export async function creerFinitionProduit(groupeId, nom) {
  const nomPropre = (nom || "").trim();
  if (!nomPropre) return { ok: false, error: "Le nom est obligatoire." };

  const dernier = await prisma.finition.findFirst({ where: { groupeId }, orderBy: { ordre: "desc" }, select: { ordre: true } });
  const finition = await prisma.finition.create({
    data: { nom: nomPropre, groupeId, ordre: (dernier?.ordre ?? -1) + 1 },
  });

  const { vitrineId, gammeId } = await gammeIdDeGroupe(groupeId);
  if (gammeId && vitrineId) revalidatePath(`/admin/architecture/${gammeId}/carte/${vitrineId}`);
  return { ok: true, id: finition.id };
}

export async function renommerFinitionProduit(id, nom) {
  const f = await prisma.finition.update({
    where: { id }, data: { nom: nom?.trim() || "Sans nom" },
    select: { groupe: { select: { vitrineId: true, vitrine: { select: { gammeId: true } } } } },
  });
  const gammeId = f.groupe?.vitrine?.gammeId, vitrineId = f.groupe?.vitrineId;
  if (gammeId && vitrineId) revalidatePath(`/admin/architecture/${gammeId}/carte/${vitrineId}`);
  return { ok: true };
}

export async function majFinitionImageProduit(id, { imageUrl, couleur }) {
  const f = await prisma.finition.update({
    where: { id },
    data: { imageUrl: imageUrl ?? null, couleur: couleur ?? null },
    select: { groupe: { select: { vitrineId: true, vitrine: { select: { gammeId: true } } } } },
  });
  const gammeId = f.groupe?.vitrine?.gammeId, vitrineId = f.groupe?.vitrineId;
  if (gammeId && vitrineId) revalidatePath(`/admin/architecture/${gammeId}/carte/${vitrineId}`);
  return { ok: true };
}

export async function renommerGroupeFinitionProduit(id, nom) {
  const g = await prisma.groupeFinition.update({
    where: { id }, data: { nom: nom?.trim() || "Sans nom" },
    select: { vitrineId: true, vitrine: { select: { gammeId: true } } },
  });
  if (g.vitrine?.gammeId && g.vitrineId) revalidatePath(`/admin/architecture/${g.vitrine.gammeId}/carte/${g.vitrineId}`);
  return { ok: true };
}

export async function supprimerGroupeFinitionProduit(id) {
  const g = await prisma.groupeFinition.findUnique({ where: { id }, select: { vitrineId: true, vitrine: { select: { gammeId: true } } } });
  await prisma.groupeFinition.delete({ where: { id } });
  if (g?.vitrine?.gammeId && g.vitrineId) revalidatePath(`/admin/architecture/${g.vitrine.gammeId}/carte/${g.vitrineId}`);
  return { ok: true };
}

export async function supprimerFinitionProduit(id) {
  const f = await prisma.finition.findUnique({ where: { id }, select: { groupe: { select: { vitrineId: true, vitrine: { select: { gammeId: true } } } } } });
  await prisma.finition.delete({ where: { id } });
  const gammeId = f?.groupe?.vitrine?.gammeId, vitrineId = f?.groupe?.vitrineId;
  if (gammeId && vitrineId) revalidatePath(`/admin/architecture/${gammeId}/carte/${vitrineId}`);
  return { ok: true };
}