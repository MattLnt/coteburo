import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const produits = await prisma.produit.findMany({
  select: { gamme: true },
  distinct: ["gamme"],
  orderBy: { gamme: "asc" },
});

console.log(`=== ${produits.length} gammes distinctes ===`);
produits.forEach((p) => console.log(p.gamme));

await prisma.$disconnect();