import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  const v = await prisma.produitVitrine.findFirst({
    where: { nom: { contains: "Fauteuil de direction - Azkar" } },
    include: {
      gamme: { select: { nom: true, marque: { select: { nom: true } } } },
      groupesFinition: { select: { nom: true, _count: { select: { finitions: true } } } },
    },
  });

  if (!v) { console.log("Fauteuil Azkar introuvable."); process.exit(0); }

  console.log(`PRODUIT : ${v.nom}`);
  console.log(`gamme : ${v.gamme.nom} · marque : ${v.gamme.marque?.nom}\n`);

  const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
  console.log(`AXES (${axes.length}) :`);
  axes.forEach((a) => {
    console.log(`  id="${a.id}" nom="${a.nom}"`);
    console.log(`     valeurs : ${JSON.stringify(a.valeurs)}`);
  });

  console.log(`\nGROUPES DE FINITIONS (${v.groupesFinition.length}) :`);
  v.groupesFinition.forEach((g) => {
    console.log(`  "${g.nom}" — ${g._count.finitions} finition(s)`);
  });

  process.exit(0);
})();