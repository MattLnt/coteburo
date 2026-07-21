import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Récupère les favoris de l'utilisateur connecté (les deux systèmes) + son état de connexion.
 * À appeler dans les composants serveur qui affichent des ProductCard.
 * Retourne { favorisCodes: string[], favorisVitrines: string[], connecte: boolean }
 */
export async function getFavorisContext() {
  const session = await auth();
  if (!session?.user?.id) return { favorisCodes: [], favorisVitrines: [], connecte: false };

  const favoris = await prisma.favori.findMany({
    where: { userId: session.user.id },
    select: { codeRacine: true, vitrineId: true },
  });
  return {
    favorisCodes: favoris.map((f) => f.codeRacine).filter(Boolean),
    favorisVitrines: favoris.map((f) => f.vitrineId).filter(Boolean),
    connecte: true,
  };
}