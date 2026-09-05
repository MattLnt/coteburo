const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const palettes = await prisma.paletteFinition.findMany({
    include: { finitions: { orderBy: { ordre: "asc" } } },
    orderBy: { nom: "asc" },
  });

  if (palettes.length === 0) {
    console.log("Aucune palette en base.");
  } else {
    for (const p of palettes) {
      console.log(`\n═══ ${p.nom} (${p.finitions.length} finitions) ═══`);
      console.log(p.finitions.map((f) => `${f.nom}${f.couleur ? " " + f.couleur : ""}`).join(" · "));
    }
  }

  process.exit(0);
})();