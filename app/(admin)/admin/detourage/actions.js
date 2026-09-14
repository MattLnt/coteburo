"use server";

import { exigerAdmin } from "@/lib/session";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Le détourage tourne dans le navigateur — la bibliothèque @imgly ne
// fonctionne que côté client. Ces actions servent donc uniquement à
// fournir la liste des images et à enregistrer les URL détourées.

export async function getProduitsAvecImages(marqueSlug) {
  await exigerAdmin();
  const produits = await prisma.produitVitrine.findMany({
    where: {
      ...(marqueSlug ? { gamme: { marque: { slug: marqueSlug } } } : {}),
      OR: [
        { imageUrl: { not: null } },
        { images: { isEmpty: false } },
      ],
    },
    select: {
      id: true,
      nom: true,
      imageUrl: true,
      images: true,
      gamme: { select: { nom: true, marque: { select: { nom: true, slug: true } } } },
    },
    orderBy: [{ gamme: { nom: "asc" } }, { nom: "asc" }],
  });

  return produits.map((p) => {
    const galerie = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    // La vignette peut ne pas figurer dans la galerie : on la remet en
    // tête pour que le traitement la couvre aussi.
    const toutes = p.imageUrl && !galerie.includes(p.imageUrl)
      ? [p.imageUrl, ...galerie]
      : galerie;

    return {
      id: p.id,
      nom: p.nom,
      gamme: p.gamme.nom,
      marque: p.gamme.marque?.nom || "",
      imageUrl: p.imageUrl,
      images: toutes,
    };
  });
}

export async function getMarques() {
  await exigerAdmin();
  const marques = await prisma.marque.findMany({
    orderBy: { nom: "asc" },
    select: {
      slug: true,
      nom: true,
      _count: { select: { gammes: true } },
    },
  });
  return marques.filter((m) => m._count.gammes > 0);
}

// Enregistre les images détourées d'un produit.
//
// On reçoit la liste complète dans son nouvel ordre : les images
// détourées ont une nouvelle URL Cloudinary, les autres gardent
// l'ancienne. La vignette reste la première.
export async function enregistrerImages(produitId, images) {
  await exigerAdmin();
  if (!Array.isArray(images) || !images.length) {
    return { ok: false, message: "Liste d'images vide." };
  }

  try {
    await prisma.produitVitrine.update({
      where: { id: produitId },
      data: { imageUrl: images[0], images },
    });
    revalidatePath("/admin/detourage");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e?.message || "Enregistrement impossible." };
  }
}