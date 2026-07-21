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

export async function getGammeEdition(id) {
  const gamme = await prisma.gamme.findUnique({
    where: { id },
    include: {
      categories: { select: { id: true } },
      marque: { select: { id: true, nom: true } },
      _count: { select: { produits: true, vitrines: true, groupesFinition: true } },
    },
  });
  if (!gamme) return null;

  const categoriesMarque = await prisma.categorie.findMany({
    where: { marqueId: gamme.marqueId },
    orderBy: { ordre: "asc" },
    select: { id: true, nom: true },
  });

  return {
    gamme: {
      id: gamme.id,
      nom: gamme.nom,
      slug: gamme.slug,
      descriptif: gamme.descriptif || "",
      descriptionTech: gamme.descriptionTech || "",
      imageUrl: gamme.imageUrl || null,
      images: gamme.images || [],
      publie: gamme.publie,
      venteSurDevis: gamme.venteSurDevis,
      marqueNom: gamme.marque?.nom || "",
      categorieIds: gamme.categories.map((c) => c.id),
      nbProduits: gamme._count.produits,
      nbVitrines: gamme._count.vitrines,
      nbGroupesFinition: gamme._count.groupesFinition,
    },
    categoriesMarque,
  };
}

// Ne touche plus aux catégories ni au mode de vente de la gamme (retirés de l'admin — la
// catégorie qui compte pour l'URL est celle du produit, et le mode de vente se choisit
// désormais à la création de chaque produit, pas au niveau de la gamme entière).
export async function sauverInfosGamme(id, data) {
  const { nom, descriptif, descriptionTech, imageUrl, images } = data;
  await prisma.gamme.update({
    where: { id },
    data: {
      nom: nom?.trim() || "Sans nom",
      descriptif: descriptif ?? null,
      descriptionTech: descriptionTech ?? null,
      imageUrl: imageUrl ?? null,
      images: Array.isArray(images) ? images : [],
    },
  });
  revalidatePath("/admin/architecture");
  revalidatePath(`/admin/architecture/${id}`);
  return { ok: true };
}

/* ─────────────── CARTES (vitrines) ─────────────── */

export async function getVitrinesGamme(gammeId) {
  const vitrines = await prisma.produitVitrine.findMany({
    where: { gammeId },
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    include: { _count: { select: { produits: true } } },
  });
  return vitrines.map((v) => ({
    id: v.id,
    nom: v.nom,
    slug: v.slug,
    imageUrl: v.imageUrl || null,
    nbImages: (v.images || []).length,
    ordre: v.ordre,
    publie: v.publie,
    venteSurDevis: v.venteSurDevis,
    nbProduits: v._count.produits,
  }));
}

export async function renommerVitrine(id, nom) {
  await prisma.produitVitrine.update({ where: { id }, data: { nom: nom?.trim() || "Sans nom" } });
  const v = await prisma.produitVitrine.findUnique({ where: { id }, select: { gammeId: true } });
  if (v) revalidatePath(`/admin/architecture/${v.gammeId}`);
  return { ok: true };
}

export async function toggleVitrinePublication(id, publie) {
  await prisma.produitVitrine.update({ where: { id }, data: { publie } });
  const v = await prisma.produitVitrine.findUnique({ where: { id }, select: { gammeId: true } });
  if (v) revalidatePath(`/admin/architecture/${v.gammeId}`);
  return { ok: true };
}

export async function toggleVitrineDevis(id, venteSurDevis) {
  await prisma.produitVitrine.update({ where: { id }, data: { venteSurDevis } });
  const v = await prisma.produitVitrine.findUnique({ where: { id }, select: { gammeId: true } });
  if (v) revalidatePath(`/admin/architecture/${v.gammeId}`);
  return { ok: true };
}

export async function reordonnerVitrines(gammeId, idsOrdonnes) {
  await prisma.$transaction(
    idsOrdonnes.map((id, index) => prisma.produitVitrine.update({ where: { id }, data: { ordre: index } }))
  );
  revalidatePath(`/admin/architecture/${gammeId}`);
  return { ok: true };
}

export async function supprimerVitrine(id) {
  const v = await prisma.produitVitrine.findUnique({ where: { id }, select: { gammeId: true } });
  await prisma.produit.updateMany({ where: { vitrineId: id }, data: { vitrineId: null } });
  await prisma.produitVitrine.delete({ where: { id } });
  if (v) revalidatePath(`/admin/architecture/${v.gammeId}`);
  return { ok: true };
}

export async function creerVitrine(gammeId, { nom, venteSurDevis }) {
  const nomPropre = (nom || "").trim();
  if (!nomPropre) return { ok: false, error: "Le nom est obligatoire." };

  const slug = slugify(nomPropre);
  const existante = await prisma.produitVitrine.findUnique({ where: { gammeId_slug: { gammeId, slug } } });
  if (existante) return { ok: false, error: `Une carte nommée "${nomPropre}" existe déjà dans cette gamme.` };

  const dernier = await prisma.produitVitrine.findFirst({ where: { gammeId }, orderBy: { ordre: "desc" }, select: { ordre: true } });

  const vitrine = await prisma.produitVitrine.create({
    data: {
      nom: nomPropre,
      slug,
      gammeId,
      ordre: (dernier?.ordre ?? -1) + 1,
      publie: false,
      venteSurDevis: !!venteSurDevis,
    },
  });

  revalidatePath(`/admin/architecture/${gammeId}`);
  return { ok: true, id: vitrine.id };
}

/* ─────────────── FINITIONS ─────────────── */

export async function getFinitionsGamme(gammeId) {
  const groupes = await prisma.groupeFinition.findMany({
    where: { gammeId },
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

export async function renommerFinition(id, nom) {
  const f = await prisma.finition.update({ where: { id }, data: { nom: nom?.trim() || "Sans nom" }, select: { groupe: { select: { gammeId: true } } } });
  revalidatePath(`/admin/architecture/${f.groupe.gammeId}`);
  return { ok: true };
}

export async function majFinitionImage(id, { imageUrl, couleur }) {
  const f = await prisma.finition.update({
    where: { id },
    data: { imageUrl: imageUrl ?? null, couleur: couleur ?? null },
    select: { groupe: { select: { gammeId: true } } },
  });
  revalidatePath(`/admin/architecture/${f.groupe.gammeId}`);
  return { ok: true };
}

export async function renommerGroupeFinition(id, nom) {
  const g = await prisma.groupeFinition.update({ where: { id }, data: { nom: nom?.trim() || "Sans nom" }, select: { gammeId: true } });
  revalidatePath(`/admin/architecture/${g.gammeId}`);
  return { ok: true };
}