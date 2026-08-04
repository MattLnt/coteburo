import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const norm = (s) => (s ?? "").trim().toLowerCase();

// Supprime les "Fauteuil Tecsy" VIDES (0 déclinaison) quand un autre du même nom
// possède des déclinaisons. Sécurité : ne supprime jamais le dernier exemplaire,
// ni un exemplaire ayant des déclinaisons/images/finitions.
async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const tecsy = gammes.find((g) => norm(g.nom) === "tecsy");
  if (!tecsy) { console.error("Gamme Tecsy introuvable."); process.exit(1); }

  const list = await prisma.produitVitrine.findMany({
    where: { gammeId: tecsy.id, nom: { equals: "Fauteuil Tecsy", mode: "insensitive" } },
    select: { id: true, slug: true, declinaisons: true, images: true, imageUrl: true,
              _count: { select: { groupesFinition: true, produits: true } } },
  });

  const score = (v) => (Array.isArray(v.declinaisons) ? v.declinaisons.length : 0)
    + (v.images || []).length + (v.imageUrl ? 1 : 0) + v._count.groupesFinition + v._count.produits;

  if (list.length < 2) { console.log(`Rien à faire (${list.length} "Fauteuil Tecsy").`); return; }

  // Garde le plus "rempli", supprime les vides (score 0)
  list.sort((a, b) => score(b) - score(a));
  const garder = list[0];
  const aSupprimer = list.slice(1).filter((v) => score(v) === 0);

  console.log(`Garde : ${garder.slug} (score ${score(garder)})`);
  for (const v of aSupprimer) {
    await prisma.produit.updateMany({ where: { vitrineId: v.id }, data: { vitrineId: null } });
    await prisma.produitVitrine.delete({ where: { id: v.id } });
    console.log(`  ✗ supprimé : ${v.slug} (vide)`);
  }
  const restantsVides = list.slice(1).filter((v) => score(v) > 0);
  if (restantsVides.length) console.log(`⚠ ${restantsVides.length} autre(s) non vide(s) NON supprimé(s) — à vérifier manuellement.`);
  console.log("Terminé.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
