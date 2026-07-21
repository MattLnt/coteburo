"use server";
import { prisma } from "@/lib/prisma";

// Pré-remplit le formulaire de commande à partir de la dernière commande passée avec cet email —
// utile juste après une connexion en haut du tunnel, pour éviter de tout retaper.
export async function getInfosPrefill(email) {
  const derniere = await prisma.commande.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: {
      prenom: true, nom: true, telephone: true, societe: true,
      adresse: true, complement: true, codePostal: true, ville: true,
    },
  });
  return derniere || null;
}