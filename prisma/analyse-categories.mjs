import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const produits = await prisma.produit.findMany({
  select: { codeRacine: true, gamme: true, designation: true, categorie: true },
  orderBy: { designation: "asc" },
});

console.log("=== Total produits :", produits.length, "===\n");

// Désignations groupées par premier mot (pour voir les "familles" de produits)
const parMotCle = {};
for (const p of produits) {
  const premierMot = (p.designation || "").split(" ")[0];
  parMotCle[premierMot] = (parMotCle[premierMot] || 0) + 1;
}
console.log("=== Premiers mots des désignations (familles) ===");
Object.entries(parMotCle)
  .sort((a, b) => b[1] - a[1])
  .forEach(([mot, n]) => console.log(`${String(n).padStart(4)}  ${mot}`));

await prisma.$disconnect();