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

export async function getCategoriesAdmin() {
  const marque = (await prisma.marque.findFirst({ where: { slug: "buronomic" } })) || (await prisma.marque.findFirst());
  if (!marque) return [];

  const categories = await prisma.categorie.findMany({
    where: { marqueId: marque.id },
    orderBy: { ordre: "asc" },
    include: {
      sousCategories: {
        orderBy: { ordre: "asc" },
        include: { _count: { select: { vitrines: true } } },
      },
      _count: { select: { vitrines: true } },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    nom: c.nom,
    slug: c.slug,
    icone: c.icone,
    estOption: c.estOption,
    nbProduits: c._count.vitrines,
    sousCategories: c.sousCategories.map((s) => ({
      id: s.id,
      nom: s.nom,
      slug: s.slug,
      nbProduits: s._count.vitrines,
    })),
  }));
}

export async function creerCategorie(nom, icone) {
  const nomPropre = (nom || "").trim();
  if (!nomPropre) return { ok: false, error: "Le nom est obligatoire." };

  const marque = (await prisma.marque.findFirst({ where: { slug: "buronomic" } })) || (await prisma.marque.findFirst());
  if (!marque) return { ok: false, error: "Aucune marque trouvée en base." };

  const slug = slugify(nomPropre);
  const existante = await prisma.categorie.findUnique({ where: { marqueId_slug: { marqueId: marque.id, slug } } });
  if (existante) return { ok: false, error: `Une catégorie nommée "${nomPropre}" existe déjà.` };

  const dernier = await prisma.categorie.findFirst({ where: { marqueId: marque.id }, orderBy: { ordre: "desc" }, select: { ordre: true } });

  const categorie = await prisma.categorie.create({
    data: { nom: nomPropre, slug, marqueId: marque.id, ordre: (dernier?.ordre ?? -1) + 1, icone: icone || null },
  });

  revalidatePath("/admin/architecture");
  revalidatePath("/", "layout");
  return { ok: true, id: categorie.id };
}

export async function renommerCategorie(id, nom) {
  const nomPropre = (nom || "").trim();
  if (!nomPropre) return { ok: false, error: "Le nom est obligatoire." };
  await prisma.categorie.update({ where: { id }, data: { nom: nomPropre } });
  revalidatePath("/admin/architecture");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changerIconeCategorie(id, icone) {
  await prisma.categorie.update({ where: { id }, data: { icone } });
  revalidatePath("/admin/architecture");
  revalidatePath("/", "layout");
  return { ok: true };
}

// Bascule une catégorie en "catégorie d'accessoires" : ses produits deviennent
// sélectionnables comme options/accessoires d'autres produits (et l'onglet Options
// est masqué pour les produits qui appartiennent à une telle catégorie).
export async function basculerOptionCategorie(id, valeur) {
  await prisma.categorie.update({ where: { id }, data: { estOption: !!valeur } });
  revalidatePath("/admin/architecture");
  revalidatePath("/", "layout");
  return { ok: true };
}

// Suppression d'une catégorie — bloquée si des produits y sont encore rattachés
// (directement, ou via l'une de ses sous-catégories), pour ne jamais laisser un produit sans URL valide.
export async function supprimerCategorie(id) {
  const categorie = await prisma.categorie.findUnique({
    where: { id },
    include: {
      _count: { select: { vitrines: true } },
      sousCategories: { include: { _count: { select: { vitrines: true } } } },
    },
  });
  if (!categorie) return { ok: false, error: "Catégorie introuvable." };

  const nbProduitsSousCategories = categorie.sousCategories.reduce((s, sc) => s + sc._count.vitrines, 0);
  const total = categorie._count.vitrines + nbProduitsSousCategories;
  if (total > 0) {
    return { ok: false, error: `${total} produit${total > 1 ? "s" : ""} utilise${total > 1 ? "nt" : ""} encore cette catégorie. Réassigne-les avant de la supprimer.` };
  }

  await prisma.categorie.delete({ where: { id } });
  revalidatePath("/admin/architecture");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function creerSousCategorie(categorieId, nom) {
  const nomPropre = (nom || "").trim();
  if (!nomPropre) return { ok: false, error: "Le nom est obligatoire." };

  const slug = slugify(nomPropre);
  const existante = await prisma.sousCategorie.findUnique({ where: { categorieId_slug: { categorieId, slug } } });
  if (existante) return { ok: false, error: `Une sous-catégorie nommée "${nomPropre}" existe déjà ici.` };

  const dernier = await prisma.sousCategorie.findFirst({ where: { categorieId }, orderBy: { ordre: "desc" }, select: { ordre: true } });

  const sousCategorie = await prisma.sousCategorie.create({
    data: { id: `${categorieId}-${slug}-${Date.now().toString(36)}`, nom: nomPropre, slug, categorieId, ordre: (dernier?.ordre ?? -1) + 1 },
  });

  revalidatePath("/admin/architecture");
  revalidatePath("/", "layout");
  return { ok: true, id: sousCategorie.id };
}

export async function renommerSousCategorie(id, nom) {
  const nomPropre = (nom || "").trim();
  if (!nomPropre) return { ok: false, error: "Le nom est obligatoire." };
  await prisma.sousCategorie.update({ where: { id }, data: { nom: nomPropre } });
  revalidatePath("/admin/architecture");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function supprimerSousCategorie(id) {
  const sc = await prisma.sousCategorie.findUnique({ where: { id }, include: { _count: { select: { vitrines: true } } } });
  if (!sc) return { ok: false, error: "Sous-catégorie introuvable." };
  if (sc._count.vitrines > 0) {
    return { ok: false, error: `${sc._count.vitrines} produit${sc._count.vitrines > 1 ? "s" : ""} utilise${sc._count.vitrines > 1 ? "nt" : ""} encore cette sous-catégorie.` };
  }
  await prisma.sousCategorie.delete({ where: { id } });
  revalidatePath("/admin/architecture");
  revalidatePath("/", "layout");
  return { ok: true };
}