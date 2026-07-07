import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const produits = await prisma.produit.findMany({
  where: { gamme: "QUIETUDE" },
  select: { codeRacine: true, designation: true, categorie: true, sousCategorie: true },
  orderBy: { designation: "asc" },
});

console.log(`=== ${produits.length} produits dans la gamme QUIETUDE ===\n`);
produits.forEach((p) => console.log(`${p.codeRacine} · ${p.designation}`));

await prisma.$disconnect();