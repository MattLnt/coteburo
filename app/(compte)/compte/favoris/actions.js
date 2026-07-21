"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// Ajoute ou retire un favori (toggle). Prend soit codeRacine (ancien système), soit vitrineId (nouveau) — jamais les deux.
export async function toggleFavori({ codeRacine, vitrineId } = {}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non connecté" };
  if (!codeRacine && !vitrineId) return { error: "Identifiant manquant" };

  const userId = session.user.id;

  if (codeRacine) {
    const existant = await prisma.favori.findUnique({
      where: { userId_codeRacine: { userId, codeRacine } },
    });
    if (existant) {
      await prisma.favori.delete({ where: { id: existant.id } });
      revalidatePath("/compte/favoris");
      return { ok: true, favori: false };
    }
    await prisma.favori.create({ data: { userId, codeRacine } });
    revalidatePath("/compte/favoris");
    return { ok: true, favori: true };
  }

  const existant = await prisma.favori.findUnique({
    where: { userId_vitrineId: { userId, vitrineId } },
  });
  if (existant) {
    await prisma.favori.delete({ where: { id: existant.id } });
    revalidatePath("/compte/favoris");
    return { ok: true, favori: false };
  }
  await prisma.favori.create({ data: { userId, vitrineId } });
  revalidatePath("/compte/favoris");
  return { ok: true, favori: true };
}

// Retire un favori explicitement — même principe, un seul identifiant à la fois
export async function retirerFavori({ codeRacine, vitrineId } = {}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non connecté" };
  const userId = session.user.id;

  if (codeRacine) {
    await prisma.favori.deleteMany({ where: { userId, codeRacine } });
  } else if (vitrineId) {
    await prisma.favori.deleteMany({ where: { userId, vitrineId } });
  }
  revalidatePath("/compte/favoris");
  return { ok: true };
}

// Liste des codeRacine + vitrineId favoris de l'utilisateur connecté
export async function getFavorisCodes() {
  const session = await auth();
  if (!session?.user?.id) return { codes: [], vitrines: [] };
  const favoris = await prisma.favori.findMany({
    where: { userId: session.user.id },
    select: { codeRacine: true, vitrineId: true },
  });
  return {
    codes: favoris.map((f) => f.codeRacine).filter(Boolean),
    vitrines: favoris.map((f) => f.vitrineId).filter(Boolean),
  };
}