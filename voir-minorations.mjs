import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  const produits = await prisma.produitVitrine.findMany({
    where: { nom: { startsWith: "Minoration" } },
    select: {
      nom: true, sansDeclinaisons: true,
      prixUnitaireTarifHT: true, prixUnitaireHT: true,
      axesDeclinaisons: true, declinaisons: true,
    },
    orderBy: { nom: "asc" },
  });

  for (const p of produits) {
    console.log(`▸ ${p.nom}`);
    if (p.sansDeclinaisons) {
      console.log(`   prix unique — tarif ${p.prixUnitaireTarifHT} · vente ${p.prixUnitaireHT}`);
    } else {
      const axes = (p.axesDeclinaisons || []).map((a) => a.nom).join(", ");
      console.log(`   axes : ${axes || "aucun"}`);
      (p.declinaisons || []).forEach((d) => {
        const v = Object.values(d.valeurs || {}).join(" / ");
        console.log(`      ${v || "—"} : tarif ${d.prixTarifHT || "vide"} · vente ${d.prixVenteHT || "vide"}`);
      });
    }
    console.log("");
  }

  process.exit(0);
})();