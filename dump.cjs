const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const v = await prisma.produitVitrine.findFirst({
    where: { sansDeclinaisons: false, NOT: { declinaisons: { equals: null } } },
    include: { groupesFinition: { include: { finitions: true } } },
    orderBy: { updatedAt: "desc" },
  });

  if (!v) {
    console.log("Aucun produit avec déclinaisons trouvé.");
    process.exit(0);
  }

  console.log("=== PRODUIT :", v.nom, "===\n");
  console.log("--- axesDeclinaisons ---");
  console.log(JSON.stringify(v.axesDeclinaisons, null, 2));
  console.log("\n--- declinaisons (2 premières) ---");
  console.log(JSON.stringify((v.declinaisons || []).slice(0, 2), null, 2));
  console.log("\n--- groupesFinition ---");
  console.log(JSON.stringify(v.groupesFinition, null, 2));
  console.log("\n--- optionsAdditionnelles ---");
  console.log(JSON.stringify(v.optionsAdditionnelles, null, 2));

  process.exit(0);
})();