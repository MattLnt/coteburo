"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPromotion(data) {
  const nom = data.nom?.trim();
  if (!nom) return { ok: false, error: "Le nom est requis." };

  const valeur = parseFloat(String(data.valeur).replace(",", ".")) || 0;
  if (valeur <= 0) return { ok: false, error: "La valeur de remise doit être supérieure à 0." };

  const promo = await prisma.promotion.create({
    data: {
      nom,
      typeRemise: data.typeRemise === "montant" ? "montant" : "pourcentage",
      valeur,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
      dateFin: data.dateFin ? new Date(data.dateFin) : null,
      actif: data.actif !== false,
      categories: Array.isArray(data.categories) ? data.categories : [],
    },
  });

  // Produits ciblés
  if (Array.isArray(data.produits) && data.produits.length > 0) {
    await prisma.promotionProduit.createMany({
      data: data.produits.map((codeRacine) => ({ promotionId: promo.id, codeRacine })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updatePromotion(id, data) {
  const valeur = parseFloat(String(data.valeur).replace(",", ".")) || 0;

  await prisma.promotion.update({
    where: { id },
    data: {
      nom: data.nom?.trim() || undefined,
      typeRemise: data.typeRemise === "montant" ? "montant" : "pourcentage",
      valeur,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
      dateFin: data.dateFin ? new Date(data.dateFin) : null,
      actif: !!data.actif,
      categories: Array.isArray(data.categories) ? data.categories : [],
    },
  });

  // On remplace la liste des produits ciblés
  await prisma.promotionProduit.deleteMany({ where: { promotionId: id } });
  if (Array.isArray(data.produits) && data.produits.length > 0) {
    await prisma.promotionProduit.createMany({
      data: data.produits.map((codeRacine) => ({ promotionId: id, codeRacine })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePromotion(id) {
  await prisma.promotion.delete({ where: { id } });
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function togglePromotion(id, actif) {
  await prisma.promotion.update({ where: { id }, data: { actif } });
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}