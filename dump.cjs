const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const v = await prisma.produitVitrine.findFirst({
    where: { NOT: { sectionsDevis: { equals: [] } } },
    orderBy: { updatedAt: "desc" },
  });

  if (!v) {
    console.log("Aucun produit avec sectionsDevis.");
    process.exit(0);
  }

  console.log("=== PRODUIT :", v.nom, "===\n");
  console.log("--- descriptif ---");
  console.log(JSON.stringify(v.descriptif, null, 2));
  console.log("\n--- sectionsDevis ---");
  console.log(JSON.stringify(v.sectionsDevis, null, 2));

  process.exit(0);
})();