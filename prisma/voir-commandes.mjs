import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const commandes = await prisma.commande.findMany({
  orderBy: { createdAt: "desc" },
  take: 5,
  include: { lignes: true },
});

console.log("=== 5 dernières commandes ===\n");
for (const c of commandes) {
  console.log(`${c.numero} · ${c.statut} · payé: ${c.paye ? "OUI" : "non"} · ${c.totalTTC.toFixed(2)}€ TTC`);
  console.log(`   ${c.prenom} ${c.nom} · ${c.email}`);
  console.log(`   ${c.lignes.length} article(s)\n`);
}

await prisma.$disconnect();