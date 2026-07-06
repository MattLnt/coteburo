"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProduit(codeRacine, data) {
  const toNum = (v) => {
    if (v === "" || v == null) return null;
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isNaN(n) ? null : n;
  };

  const images = Array.isArray(data.images) ? data.images : [];

  await prisma.produit.update({
    where: { codeRacine },
    data: {
      designation: data.designation?.trim() || undefined,
      categorie: data.categorie || null,
      sousCategorie: data.sousCategorie || null,
      descriptionWeb: data.descriptionWeb?.trim() || null,
      prixAchatHT: toNum(data.prixAchatHT),
      prixVenteHT: toNum(data.prixVenteHT),
      prixVerrouille: !!data.prixVerrouille,
      publie: !!data.publie,
      bestSeller: !!data.bestSeller,
      enAvant: !!data.enAvant,
      images: images,
      imageUrl: images[0] || null,
    },
  });

  revalidatePath("/admin/produits");
  revalidatePath(`/admin/produits/${codeRacine}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleProduitFlag(codeRacine, champ, valeur) {
  // champ autorisé : "bestSeller", "enAvant", "publie"
  if (!["bestSeller", "enAvant", "publie"].includes(champ)) {
    return { ok: false };
  }
  await prisma.produit.update({
    where: { codeRacine },
    data: { [champ]: !!valeur },
  });
  revalidatePath("/admin/produits");
  revalidatePath("/", "layout");
  return { ok: true };
}