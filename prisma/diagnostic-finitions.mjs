import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const variantes = await prisma.variante.findMany({
  where: { codeRacine: "EG72" },
  select: { finition: true },
  take: 20,
});

console.log("=== Exemples de finitions (EG72) ===");
variantes.forEach((v) => console.log(v.finition));

const total = await prisma.variante.count({ where: { codeRacine: "EG72" } });
console.log("\nTotal variantes pour EG72 :", total);

await prisma.$disconnect();