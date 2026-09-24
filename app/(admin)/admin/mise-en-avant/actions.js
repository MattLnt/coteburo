"use server";

// La mise en avant : les douze premières cartes d'une catégorie ou d'un
// rayon, choisies à la main.
//
// Sans ça, le catalogue trie par nom et « Bureaux » s'ouvre sur un
// accroche-câbles. Une cible = une catégorie OU une sous-catégorie ; la
// liste est ordonnée, douze au plus, et se remplace en bloc à chaque geste.

import { exigerAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PLAFOND } from "./constantes";

// Trois cibles : une catégorie, un rayon, ou le catalogue entier — celui
// qu'on voit sans filtre. Une mise en avant du catalogue n'a ni catégorie
// ni rayon.
const filtreCible = (type, id) => type === "catalogue"
  ? { categorieId: null, sousCategorieId: null }
  : type === "categorie" ? { categorieId: id } : { sousCategorieId: id };
const ENTRE = { publie: true, accessoireSeul: false };

/** L'arbre des cibles, avec le nombre de fiches et de mises en avant. */
export async function listerCibles() {
  await exigerAdmin();
  const [nbFiches, nbEnAvant] = await Promise.all([
    prisma.produitVitrine.count({ where: ENTRE }),
    prisma.miseEnAvant.count({ where: filtreCible("catalogue") }),
  ]);
  const categories = await prisma.categorie.findMany({
    orderBy: { ordre: "asc" },
    select: {
      id: true, nom: true, slug: true,
      _count: { select: { vitrines: { where: ENTRE }, misesEnAvant: true } },
      sousCategories: {
        orderBy: { ordre: "asc" },
        select: {
          id: true, nom: true, slug: true,
          _count: { select: { vitrines: { where: ENTRE }, misesEnAvant: true } },
        },
      },
    },
  });
  return {
    catalogue: { nbFiches, nbEnAvant },
    categories: categories.map((c) => ({
      id: c.id, nom: c.nom, slug: c.slug,
      nbFiches: c._count.vitrines, nbEnAvant: c._count.misesEnAvant,
      sousCategories: c.sousCategories.map((s) => ({
        id: s.id, nom: s.nom, slug: s.slug,
        nbFiches: s._count.vitrines, nbEnAvant: s._count.misesEnAvant,
      })),
    })),
  };
}

/** Une cible : ses fiches en avant dans l'ordre, puis toutes les autres. */
export async function chargerCible(type, id) {
  await exigerAdmin();
  const where = type === "catalogue" ? {}
    : type === "categorie" ? { categories: { some: { id } } }
      : { sousCategories: { some: { id } } };

  const [fiches, enAvant] = await Promise.all([
    prisma.produitVitrine.findMany({
      where: { ...where, ...ENTRE },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, imageUrl: true, images: true, gamme: { select: { nom: true } } },
    }),
    prisma.miseEnAvant.findMany({
      where: filtreCible(type, id),
      orderBy: { ordre: "asc" },
      select: { vitrineId: true },
    }),
  ]);

  const carte = (v) => ({
    id: v.id, nom: v.nom, gammeNom: v.gamme?.nom || null,
    image: v.imageUrl || (Array.isArray(v.images) && v.images[0]) || null,
  });
  const parId = new Map(fiches.map((v) => [v.id, carte(v)]));
  // Une mise en avant dont la fiche a quitté le rayon ne s'affiche pas — et
  // le prochain enregistrement la fera disparaître, puisqu'on remplace en bloc.
  const avant = enAvant.map((m) => parId.get(m.vitrineId)).filter(Boolean);
  const dedans = new Set(avant.map((c) => c.id));
  return { enAvant: avant, autres: fiches.map(carte).filter((c) => !dedans.has(c.id)) };
}

/** Remplace la mise en avant d'une cible par cette liste, dans cet ordre. */
export async function definirMiseEnAvant(type, id, vitrineIds = []) {
  await exigerAdmin();
  const ids = [...new Set(vitrineIds.filter(Boolean))].slice(0, PLAFOND);
  const cible = filtreCible(type, id);
  await prisma.$transaction([
    prisma.miseEnAvant.deleteMany({ where: cible }),
    ...ids.map((vitrineId, ordre) => prisma.miseEnAvant.create({
      data: { vitrineId, ordre, ...cible },
    })),
  ]);
  revalidatePath("/admin/mise-en-avant");
  revalidatePath("/catalogue");
  return { ok: true, total: ids.length };
}
