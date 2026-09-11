const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const gamme = await prisma.gamme.findFirst({
    where: { nom: { contains: "Azkar", mode: "insensitive" } },
    select: { id: true, nom: true, marque: { select: { nom: true } } },
  });

  console.log(gamme
    ? `GAMME : ${gamme.nom} (marque ${gamme.marque?.nom})\n`
    : "Aucune gamme Azkar trouvée.\n");

  const produits = await prisma.produitVitrine.findMany({
    where: {
      OR: [
        { nom: { contains: "Azkar", mode: "insensitive" } },
        gamme ? { gammeId: gamme.id } : { id: "__aucun__" },
      ],
    },
    include: {
      gamme: { select: { nom: true } },
      categories: { select: { nom: true, estOption: true } },
      optionsLiees: {
        select: {
          nom: true, publie: true, sansDeclinaisons: true,
          prixUnitaireTarifHT: true, prixUnitaireHT: true,
          categories: { select: { nom: true, estOption: true } },
        },
      },
    },
  });

  for (const p of produits) {
    const estOption = p.categories.some((c) => c.estOption);
    console.log(`▸ ${p.nom}`);
    console.log(`  gamme : ${p.gamme.nom} · publié : ${p.publie} · estOption : ${estOption}`);
    console.log(`  accessoires rattachés : ${p.optionsLiees.length}`);

    for (const o of p.optionsLiees) {
      const ok = o.categories.some((c) => c.estOption);
      console.log(`     — ${o.nom}`);
      console.log(`       estOption ${ok} · tarif ${o.prixUnitaireTarifHT} · vente ${o.prixUnitaireHT}`);
    }
    console.log("");
  }

  process.exit(0);
})();