"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// Ajoute ou retire un favori (toggle). Retourne l'état final.
export async function toggleFavori(codeRacine) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non connecté" };

  const userId = session.user.id;
  const existant = await prisma.favori.findUnique({
    where: { userId_codeRacine: { userId, codeRacine } },
  });

  if (existant) {
    await prisma.favori.delete({ where: { id: existant.id } });
    revalidatePath("/compte/favoris");
    return { ok: true, favori: false };
  } else {
    await prisma.favori.create({ data: { userId, codeRacine } });
    revalidatePath("/compte/favoris");
    return { ok: true, favori: true };
  }
}

// Retire un favori explicitement
export async function retirerFavori(codeRacine) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non connecté" };
  await prisma.favori.deleteMany({ where: { userId: session.user.id, codeRacine } });
  revalidatePath("/compte/favoris");
  return { ok: true };
}

// Liste des codeRacine favoris de l'utilisateur connecté
export async function getFavorisCodes() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const favoris = await prisma.favori.findMany({
    where: { userId: session.user.id },
    select: { codeRacine: true },
  });
  return favoris.map((f) => f.codeRacine);
}