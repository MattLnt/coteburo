"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCommandes() {
  return prisma.commande.findMany({
    orderBy: { createdAt: "desc" },
    include: { lignes: true },
  });
}

export async function getCommande(id) {
  return prisma.commande.findUnique({
    where: { id },
    include: { lignes: true },
  });
}

export async function updateStatutCommande(id, statut) {
  const statutsValides = ["en_attente", "payee", "en_preparation", "expediee", "livree", "annulee", "echec_paiement"];
  if (!statutsValides.includes(statut)) return { ok: false };

  await prisma.commande.update({
    where: { id },
    data: { statut },
  });
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${id}`);
  return { ok: true };
}