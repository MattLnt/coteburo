"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateProfil({ prenom, nom }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non connecté" };

  const nomComplet = [prenom?.trim(), nom?.trim()].filter(Boolean).join(" ") || null;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { nom: nomComplet },
  });
  revalidatePath("/compte/profil");
  revalidatePath("/compte");
  return { ok: true };
}

export async function changerMotDePasse({ actuel, nouveau }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non connecté" };

  // Critères de sécurité (mêmes que l'inscription)
  const valide = nouveau.length >= 9 && /[A-Z]/.test(nouveau) && /[a-z]/.test(nouveau) && /[0-9]/.test(nouveau) && /[^A-Za-z0-9]/.test(nouveau);
  if (!valide) return { error: "Le nouveau mot de passe ne respecte pas les critères de sécurité." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Utilisateur introuvable." };

  const ok = await bcrypt.compare(String(actuel), user.password);
  if (!ok) return { error: "Le mot de passe actuel est incorrect." };

  const hash = await bcrypt.hash(String(nouveau), 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
  return { ok: true };
}