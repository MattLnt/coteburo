import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  const produits = await prisma.produitVitrine.findMany({
    where: { nom: { startsWith: "Paire d'accotoirs 4D manchettes PU" } },
    select: { nom: true, imageUrl: true, images: true },
  });

  for (const p of produits) {
    console.log(`▸ ${p.nom}`);
    console.log(`  vignette : ${p.imageUrl ? p.imageUrl.split("/").pop() : "aucune"}`);
    console.log(`  galerie (${p.images.length}) :`);
    p.images.forEach((u) => console.log(`     ${u.split("/").pop()}`));
    console.log("");
  }

  process.exit(0);
})();