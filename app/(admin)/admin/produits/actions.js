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
      descriptionWeb: data.descriptionWeb?.trim() || null,
      prixAchatHT: toNum(data.prixAchatHT),
      prixVenteHT: toNum(data.prixVenteHT),
      prixVerrouille: !!data.prixVerrouille,
      publie: !!data.publie,
      images: images,
      imageUrl: images[0] || null,
    },
  });

  revalidatePath("/admin/produits");
  revalidatePath(`/admin/produits/${codeRacine}`);
  return { ok: true };
}