import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Récupère les codeRacine favoris de l'utilisateur connecté + son état de connexion.
 * À appeler dans les composants serveur qui affichent des ProductCard.
 * Retourne { favorisCodes: string[], connecte: boolean }
 */
export async function getFavorisContext() {
  const session = await auth();
  if (!session?.user?.id) return { favorisCodes: [], connecte: false };

  const favoris = await prisma.favori.findMany({
    where: { userId: session.user.id },
    select: { codeRacine: true },
  });
  return { favorisCodes: favoris.map((f) => f.codeRacine), connecte: true };
}