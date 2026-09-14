"use server";

import { exigerAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPromotion(data) {
  await exigerAdmin();
  const nom = data.nom?.trim();
  if (!nom) return { ok: false, error: "Le nom est requis." };

  const valeur = parseFloat(String(data.valeur).replace(",", ".")) || 0;
  if (valeur <= 0) return { ok: false, error: "La valeur de remise doit être supérieure à 0." };

  const promo = await prisma.promotion.create({
    data: {
      nom,
      messageBandeau: (data.messageBandeau || "").trim() || null,
      typeRemise: data.typeRemise === "montant" ? "montant" : "pourcentage",
      valeur,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
      dateFin: data.dateFin ? new Date(data.dateFin) : null,
      actif: data.actif !== false,
      categories: Array.isArray(data.categories) ? data.categories : [],
    },
  });

  // Produits ciblés
  if (Array.isArray(data.cibles) && data.cibles.length > 0) {
    await prisma.promotionVitrine.createMany({
      data: data.cibles.map((vitrineId) => ({ promotionId: promo.id, vitrineId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updatePromotion(id, data) {
  await exigerAdmin();
  const valeur = parseFloat(String(data.valeur).replace(",", ".")) || 0;

  await prisma.promotion.update({
    where: { id },
    data: {
      nom: data.nom?.trim() || undefined,
      messageBandeau: (data.messageBandeau || "").trim() || null,
      typeRemise: data.typeRemise === "montant" ? "montant" : "pourcentage",
      valeur,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
      dateFin: data.dateFin ? new Date(data.dateFin) : null,
      actif: !!data.actif,
      categories: Array.isArray(data.categories) ? data.categories : [],
    },
  });

  // On remplace la liste des produits ciblés
  await prisma.promotionVitrine.deleteMany({ where: { promotionId: id } });
  if (Array.isArray(data.cibles) && data.cibles.length > 0) {
    await prisma.promotionVitrine.createMany({
      data: data.cibles.map((vitrineId) => ({ promotionId: id, vitrineId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePromotion(id) {
  await exigerAdmin();
  await prisma.promotion.delete({ where: { id } });
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function togglePromotion(id, actif) {
  await exigerAdmin();
  await prisma.promotion.update({ where: { id }, data: { actif } });
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}