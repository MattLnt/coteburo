import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// L'import a écrit le prix des accessoires à prix unique dans
// declinaisons[0].prixTarifHT. Le reste de l'application le lit dans
// prixUnitaireTarifHT. Ce script recopie la valeur au bon endroit.
async function main() {
  const vitrines = await prisma.produitVitrine.findMany({
    where: { sansDeclinaisons: true, prixUnitaireTarifHT: null },
    select: { id: true, nom: true, declinaisons: true },
  });

  let corriges = 0;

  for (const v of vitrines) {
    const decl = Array.isArray(v.declinaisons) ? v.declinaisons[0] : null;
    if (!decl) continue;

    const prix = parseFloat(String(decl.prixTarifHT ?? "").replace(",", "."));
    if (Number.isNaN(prix)) continue;

    await prisma.produitVitrine.update({
      where: { id: v.id },
      data: { prixUnitaireTarifHT: prix },
    });

    console.log(`✓ ${v.nom} — ${prix} €`);
    corriges++;
  }

  console.log(`\n${corriges} produit(s) corrigé(s) sur ${vitrines.length} examiné(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());