"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getRealisations() {
  return prisma.realisation.findMany({ orderBy: [{ ordre: "asc" }, { createdAt: "desc" }] });
}

export async function getRealisation(id) {
  const r = await prisma.realisation.findUnique({
    where: { id },
    include: { produitsLies: { select: { id: true, nom: true, imageUrl: true } } },
  });
  if (!r) return null;
  return { ...r, carnetChantier: Array.isArray(r.carnetChantier) ? r.carnetChantier : [] };
}

// Liste légère de tous les produits publiés, pour le sélecteur "Produits liés" dans l'admin
export async function getProduitsPourLiaison() {
  const vitrines = await prisma.produitVitrine.findMany({
    where: { publie: true, gamme: { publie: true } },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, imageUrl: true, gamme: { select: { nom: true } } },
  });
  return vitrines.map((v) => ({ id: v.id, nom: v.nom, imageUrl: v.imageUrl, gammeNom: v.gamme.nom }));
}

export async function createRealisation(data) {
  const base = slugify(data.titre || "realisation");
  let slug = base;
  let i = 1;
  while (await prisma.realisation.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  const count = await prisma.realisation.count();
  const r = await prisma.realisation.create({
    data: {
      titre: data.titre?.trim() || "Sans titre",
      client: data.client?.trim() || null,
      secteur: data.secteur?.trim() || null,
      surface: data.surface?.trim() || null,
      imageUrl: data.imageUrl || null,
      slug,
      publie: !!data.publie,
      ordre: count,
    },
  });
  revalidatePath("/admin/realisations");
  revalidatePath("/realisations");
  return { ok: true, id: r.id };
}

export async function updateRealisationInfos(id, data) {
  await prisma.realisation.update({
    where: { id },
    data: {
      titre: data.titre?.trim() || undefined,
      client: data.client?.trim() || null,
      secteur: data.secteur?.trim() || null,
      surface: data.surface?.trim() || null,
      imageUrl: data.imageUrl || null,
      publie: !!data.publie,
    },
  });
  revalidatePath("/admin/realisations");
  revalidatePath("/realisations");
  return { ok: true };
}

// Sauvegarde unique pour tout le contenu détaillé (récit, citation, galerie, avant/après, carnet, produits liés)
export async function sauverRealisationComplete(id, data) {
  const {
    recit, citationTexte, citationAuteur, citationPoste,
    galerie, avantImageUrl, apresImageUrl, carnetChantier, produitsLiesIds,
  } = data;

  await prisma.realisation.update({
    where: { id },
    data: {
      recit: recit || null,
      citationTexte: citationTexte || null,
      citationAuteur: citationAuteur || null,
      citationPoste: citationPoste || null,
      galerie: Array.isArray(galerie) ? galerie : [],
      avantImageUrl: avantImageUrl || null,
      apresImageUrl: apresImageUrl || null,
      carnetChantier: Array.isArray(carnetChantier) ? carnetChantier : [],
      produitsLies: { set: (produitsLiesIds || []).map((pid) => ({ id: pid })) },
    },
  });
  revalidatePath("/admin/realisations");
  revalidatePath(`/admin/realisations/${id}`);
  revalidatePath("/realisations");
  return { ok: true };
}

export async function deleteRealisation(id) {
  await prisma.realisation.delete({ where: { id } });
  revalidatePath("/admin/realisations");
  revalidatePath("/realisations");
  return { ok: true };
}

export async function toggleRealisationPublie(id, publie) {
  await prisma.realisation.update({ where: { id }, data: { publie: !!publie } });
  revalidatePath("/admin/realisations");
  revalidatePath("/realisations");
  return { ok: true };
}