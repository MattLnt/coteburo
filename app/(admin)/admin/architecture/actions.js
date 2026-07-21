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

export async function getGammesAdmin() {
  const gammes = await prisma.gamme.findMany({
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    include: {
      marque: { select: { nom: true } },
      categories: { select: { nom: true }, orderBy: { ordre: "asc" } },
      _count: { select: { produits: true, vitrines: true, groupesFinition: true } },
    },
  });
  return gammes.map((g) => ({
    id: g.id,
    nom: g.nom,
    slug: g.slug,
    marque: g.marque?.nom ?? null,
    categories: g.categories.map((c) => c.nom),
    imageUrl: g.imageUrl,
    publie: g.publie,
    nbProduits: g._count.produits,
    nbVitrines: g._count.vitrines,
    nbGroupesFinition: g._count.groupesFinition,
    aDescriptif: !!g.descriptif,
  }));
}

export async function togglePublicationGamme(id, publie) {
  await prisma.gamme.update({ where: { id }, data: { publie } });
  revalidatePath("/admin/architecture");
  return { ok: true };
}

// Suppression d'une gamme — action irréversible, tout ce qu'elle contient part avec elle
// (produits, finitions, favoris liés). Bloquée si d'anciens produits (import Buronomic) y sont
// encore rattachés, pour éviter un comportement imprévisible côté base de données.
export async function supprimerGamme(id) {
  const gamme = await prisma.gamme.findUnique({
    where: { id },
    select: {
      nom: true,
      _count: { select: { produits: true, vitrines: true, groupesFinition: true } },
    },
  });
  if (!gamme) return { ok: false, error: "Gamme introuvable." };

  if (gamme._count.produits > 0) {
    return {
      ok: false,
      error: `Cette gamme contient encore ${gamme._count.produits} ancien${gamme._count.produits > 1 ? "s" : ""} produit${gamme._count.produits > 1 ? "s" : ""} (import). Retire-les ou réassigne-les à une autre gamme avant de la supprimer.`,
    };
  }

  await prisma.gamme.delete({ where: { id } });
  revalidatePath("/admin/architecture");
  return { ok: true };
}

/* ─────────────── CRÉATION D'UNE GAMME ─────────────── */

export async function getDonneesCreationGamme() {
  const marques = await prisma.marque.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, slug: true } });
  const marqueParDefaut = marques.find((m) => m.slug === "buronomic") || marques[0] || null;
  const categories = marqueParDefaut
    ? await prisma.categorie.findMany({ where: { marqueId: marqueParDefaut.id }, orderBy: { ordre: "asc" }, select: { id: true, nom: true } })
    : [];
  return { marques, marqueParDefautId: marqueParDefaut?.id || null, categories };
}

export async function getCategoriesDeMarque(marqueId) {
  return prisma.categorie.findMany({ where: { marqueId }, orderBy: { ordre: "asc" }, select: { id: true, nom: true } });
}

export async function creerGamme({ nom, marqueId, categorieIds }) {
  const nomPropre = (nom || "").trim();
  if (!nomPropre) return { ok: false, error: "Le nom est obligatoire." };
  if (!marqueId) return { ok: false, error: "La marque est obligatoire." };

  const slug = slugify(nomPropre);
  const existante = await prisma.gamme.findUnique({ where: { slug } });
  if (existante) return { ok: false, error: `Une gamme nommée "${nomPropre}" existe déjà.` };

  const gamme = await prisma.gamme.create({
    data: {
      nom: nomPropre,
      slug,
      marqueId,
      publie: false,
      venteSurDevis: false,
      categories: { connect: (categorieIds || []).map((id) => ({ id })) },
    },
  });

  revalidatePath("/admin/architecture");
  return { ok: true, id: gamme.id };
}