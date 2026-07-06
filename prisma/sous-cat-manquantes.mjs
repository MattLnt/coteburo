import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const produits = await prisma.produit.findMany({
  where: { categorie: { not: null }, OR: [{ sousCategorie: null }, { sousCategorie: "" }] },
  select: { codeRacine: true, gamme: true, categorie: true, designation: true },
  orderBy: [{ categorie: "asc" }, { designation: "asc" }],
});

console.log(`=== ${produits.length} produits sans sous-catégorie ===\n`);
for (const p of produits) {
  console.log(`[${p.categorie}] ${p.designation}`);
  console.log(`    ${p.codeRacine} · ${p.gamme}\n`);
}

await prisma.$disconnect();