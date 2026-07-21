"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

  const categories = await prisma.categorie.findMany({
    where: { marqueId: vitrine.gamme.marqueId },
    orderBy: { ordre: "asc" },
    include: { sousCategories: { orderBy: { ordre: "asc" }, select: { id: true, nom: true, slug: true } } },
  });

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
    prixMiniAuto,
    gammeId: vitrine.gamme.id,
    gammeNom: vitrine.gamme.nom,
    categorieId: vitrine.categories[0]?.id || null,
    sousCategorieId: vitrine.sousCategories[0]?.id || null,
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
    axesDeclinaisons, declinaisons,
    categorieId, sousCategorieId,
    bestSeller, promoPct, promoDebut, promoFin,
    venteSurDevis,
  } = data;

  const toNum = (v) => {
    if (v === "" || v == null) return null;
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isNaN(n) ? null : n;
  };
  const toDate = (v) => (v ? new Date(v + "T00:00:00") : null);

  const v = await prisma.produitVitrine.update({
    where: { id: vitrineId },
    data: {
      nom: nom?.trim() || "Sans nom",
      descriptif: descriptif ?? null,
      imageUrl: imageUrl ?? null,
      images: Array.isArray(images) ? images : [],
      sectionsDevis: Array.isArray(sectionsDevis) ? sectionsDevis : [],
      prixAPartir: toNum(prixAPartir),
      axesDeclinaisons: Array.isArray(axesDeclinaisons) ? axesDeclinaisons : [],
      declinaisons: Array.isArray(declinaisons) ? declinaisons : [],
      categories: { set: categorieId ? [{ id: categorieId }] : [] },
      sousCategories: { set: sousCategorieId ? [{ id: sousCategorieId }] : [] },
      bestSeller: !!bestSeller,
      promoPct: toNum(promoPct),
      promoDebut: toDate(promoDebut),
      promoFin: toDate(promoFin),
      venteSurDevis: !!venteSurDevis,
    },
    select: { gammeId: true },
  });

  revalidatePath(`/admin/architecture/${v.gammeId}`);
  revalidatePath(`/admin/architecture/${v.gammeId}/carte/${vitrineId}`);
  return { ok: true };
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