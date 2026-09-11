import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  const v = await prisma.produitVitrine.findFirst({
    where: { nom: { startsWith: "Fauteuil dossier tapissé - Eman Direction" } },
    include: {
      gamme: { select: { nom: true, publie: true } },
      optionsLiees: {
        select: {
          nom: true, publie: true, sansDeclinaisons: true,
          prixUnitaireTarifHT: true, prixUnitaireHT: true,
          prixUnitaireVerrouille: true, declinaisons: true,
        },
      },
    },
  });

  if (!v) { console.log("Produit introuvable."); process.exit(0); }

  console.log(`PRODUIT : ${v.nom}`);
  console.log(`publié : ${v.publie} · gamme ${v.gamme.nom} publiée : ${v.gamme.publie}`);
  console.log(`accessoires liés : ${v.optionsLiees.length}\n`);

  for (const o of v.optionsLiees) {
    console.log(`— ${o.nom}`);
    if (o.sansDeclinaisons) {
      console.log(`   unique · tarif ${o.prixUnitaireTarifHT} · vente ${o.prixUnitaireHT} · verrou ${o.prixUnitaireVerrouille}`);
    } else {
      const d = Array.isArray(o.declinaisons) ? o.declinaisons : [];
      console.log(`   ${d.length} déclinaison(s)`);
      d.forEach((x) => console.log(`      tarif ${x.prixTarifHT || "vide"} · vente ${x.prixVenteHT || "vide"}`));
    }
  }

  process.exit(0);
})();