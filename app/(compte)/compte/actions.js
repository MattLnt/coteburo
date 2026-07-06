"use server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function inscrireClient({ prenom, nom, email, password }) {
  const mail = String(email || "").toLowerCase().trim();

  if (!mail || !password || password.length < 6) {
    return { error: "Email et mot de passe (6 caractères min.) requis." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return { error: "Adresse email invalide." };
  }

  // Vérifie si le compte existe déjà
  const existe = await prisma.user.findUnique({ where: { email: mail } });
  if (existe) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const hash = await bcrypt.hash(String(password), 10);
  const nomComplet = [prenom?.trim(), nom?.trim()].filter(Boolean).join(" ") || null;

  await prisma.user.create({
    data: {
      email: mail,
      password: hash,
      nom: nomComplet,
      role: "CLIENT",
    },
  });

  // Rattache les commandes invité passées avec ce même email
  await prisma.commande.updateMany({
    where: { email: mail, userId: null },
    data: {}, // le lien se fera à la lecture via l'email (voir dashboard)
  });

  return { ok: true };
}