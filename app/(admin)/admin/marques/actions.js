"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function slugify(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function createMarque(data) {
  const nom = data.nom?.trim();
  if (!nom) return { ok: false, error: "Le nom est requis." };

  const remise = parseFloat(String(data.remise).replace(",", ".")) || 0;

  try {
    await prisma.marque.create({
      data: {
        nom,
        slug: slugify(nom),
        remise: remise / 100,
        actif: data.actif !== false,
        logoUrl: data.logoUrl || null,
      },
    });
  } catch (e) {
    return { ok: false, error: "Cette marque existe déjà." };
  }

  revalidatePath("/admin/marques");
  return { ok: true };
}

export async function updateMarque(id, data) {
  const remise = parseFloat(String(data.remise).replace(",", ".")) || 0;

  await prisma.marque.update({
    where: { id },
    data: {
      nom: data.nom?.trim() || undefined,
      remise: remise / 100,
      actif: !!data.actif,
      logoUrl: data.logoUrl || null,
    },
  });

  revalidatePath("/admin/marques");
  return { ok: true };
}

export async function deleteMarque(id) {
  const count = await prisma.produit.count({ where: { marqueId: id } });
  if (count > 0) {
    return { ok: false, error: `Impossible : ${count} produit(s) rattaché(s) à cette marque.` };
  }
  await prisma.marque.delete({ where: { id } });
  revalidatePath("/admin/marques");
  return { ok: true };
}