import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Décompte des produits par marque, statut et nature.
// Les accessoires restent volontairement en brouillon : les compter avec
// les autres fausse la lecture de ce qu'il reste à faire.
(async () => {
  const marques = await prisma.marque.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  let totalPub = 0, totalBrouillon = 0;

  for (const m of marques) {
    const vitrines = await prisma.produitVitrine.findMany({
      where: { gamme: { marqueId: m.id } },
      select: {
        publie: true,
        imageUrl: true,
        images: true,
        categories: { select: { estOption: true } },
      },
    });

    if (!vitrines.length) continue;

    const accessoires = vitrines.filter((v) => v.categories.some((c) => c.estOption));
    const produits = vitrines.filter((v) => !v.categories.some((c) => c.estOption));

    const pub = produits.filter((v) => v.publie).length;
    const brouillon = produits.filter((v) => !v.publie).length;
    const accPub = accessoires.filter((v) => v.publie).length;

    // Un produit sans vignette ni galerie ne peut pas figurer au catalogue.
    const sansImage = produits.filter(
      (v) => !v.imageUrl && !(Array.isArray(v.images) && v.images.length)
    ).length;

    totalPub += pub + accPub;
    totalBrouillon += brouillon + (accessoires.length - accPub);

    console.log(`\n═══ ${m.nom} ═══`);
    console.log(`   produits    ${pub} publié(s) · ${brouillon} brouillon(s)`);
    console.log(`   accessoires ${accessoires.length}${accPub ? ` dont ${accPub} publié(s)` : " (tous en brouillon)"}`);
    if (sansImage) console.log(`   ⚠ ${sansImage} produit(s) sans image`);
  }

  console.log(`\n═══ TOTAL ═══`);
  console.log(`   ${totalPub} publié(s) · ${totalBrouillon} brouillon(s)`);

  process.exit(0);
})();