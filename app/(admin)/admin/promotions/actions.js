"use server";

import { exigerAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// { buronomic: "25", sokoa: "20" } → { buronomic: 25, sokoa: 20 }, sans les
// taux vides ou nuls.
function remisesMarquesPropres(brut) {
  const out = {};
  if (brut && typeof brut === "object" && !Array.isArray(brut)) {
    for (const [slug, v] of Object.entries(brut)) {
      const n = parseFloat(String(v).replace(",", "."));
      if (slug && Number.isFinite(n) && n > 0) out[slug] = n;
    }
  }
  return out;
}

// Ce qu'une campagne doit avoir pour changer un prix quelque part.
function verifierCibles(data, valeur) {
  const remisesMarques = remisesMarquesPropres(data.remisesMarques);
  const generale = (Array.isArray(data.categories) && data.categories.length > 0)
    || (Array.isArray(data.cibles) && data.cibles.length > 0);
  if (!generale && Object.keys(remisesMarques).length === 0) {
    return { error: "Ciblez au moins un fournisseur, une catégorie ou un produit." };
  }
  if (generale && valeur <= 0) {
    return { error: "Indiquez la remise à appliquer aux catégories et produits ciblés." };
  }
  return { remisesMarques };
}

export async function createPromotion(data) {
  await exigerAdmin();
  const nom = data.nom?.trim();
  if (!nom) return { ok: false, error: "Le nom est requis." };

  const valeur = parseFloat(String(data.valeur).replace(",", ".")) || 0;
  const cibles = verifierCibles(data, valeur);
  if (cibles.error) return { ok: false, error: cibles.error };

  const promo = await prisma.promotion.create({
    data: {
      nom,
      messageBandeau: (data.messageBandeau || "").trim() || null,
      typeRemise: data.typeRemise === "montant" ? "montant" : "pourcentage",
      valeur,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
      dateFin: data.dateFin ? new Date(data.dateFin) : null,
      actif: data.actif !== false,
      afficherBandeau: data.afficherBandeau !== false,
      categories: Array.isArray(data.categories) ? data.categories : [],
      remisesMarques: cibles.remisesMarques,
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
  const cibles = verifierCibles(data, valeur);
  if (cibles.error) return { ok: false, error: cibles.error };

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
      afficherBandeau: data.afficherBandeau !== false,
      categories: Array.isArray(data.categories) ? data.categories : [],
      remisesMarques: cibles.remisesMarques,
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