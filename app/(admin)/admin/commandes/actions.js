"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { envoyerMajStatut } from "@/lib/emails";

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

  // On récupère la commande AVANT pour comparer le statut
  const avant = await prisma.commande.findUnique({ where: { id } });
  if (!avant) return { ok: false };

  const commande = await prisma.commande.update({
    where: { id },
    data: { statut },
  });

  // Envoie un email au client uniquement si le statut a réellement changé
  if (avant.statut !== statut) {
    try {
      await envoyerMajStatut(commande, statut);
    } catch (err) {
      console.error("Erreur envoi email statut:", err.message);
      // On n'échoue pas le changement de statut si l'email plante
    }
  }

  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${id}`);
  return { ok: true };
}