// Purge les déclinaisons (et axes) résiduelles des vitrines passées en prix unique.
//
// Contexte : basculer un produit en `sansDeclinaisons` n'effaçait pas ses anciennes
// lignes de déclinaisons. Invisibles depuis l'admin, elles étaient malgré tout
// envoyées à la fiche publique, qui s'en servait comme prix à la place du prix
// unique — d'où des fiches à 648 € pour un tarif saisi à 1 €.
//
// L'enregistrement admin purge désormais à la source ; ce script traite le stock
// existant. La sélection vit dans _residus-declinaisons.mjs, partagée avec le
// script de sauvegarde : les deux visent forcément le même ensemble.
//
//   node prisma/purger-declinaisons-residuelles.mjs              → simulation
//   node prisma/purger-declinaisons-residuelles.mjs --appliquer  → écrit en base
//
// --appliquer exige une sauvegarde préalable dans prisma/sauvegardes/
// (node prisma/sauver-declinaisons-residuelles.mjs), sauf --sans-sauvegarde.

import { PrismaClient } from "@prisma/client";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { collecterResidus, getMarge } from "./_residus-declinaisons.mjs";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const SANS_SAUVEGARDE = process.argv.includes("--sans-sauvegarde");
const DOSSIER = path.join("prisma", "sauvegardes");

async function derniereSauvegarde() {
  try {
    const fichiers = (await readdir(DOSSIER))
      .filter((f) => f.startsWith("declinaisons-residuelles-") && f.endsWith(".json"))
      .sort();
    return fichiers.length ? path.join(DOSSIER, fichiers[fichiers.length - 1]) : null;
  } catch {
    return null;
  }
}

async function main() {
  const marge = await getMarge(prisma);
  const { aPurger, aExaminer, total } = await collecterResidus(prisma, marge);

  console.log(`Vitrines en prix unique              : ${total}`);
  console.log(`  avec résidus                       : ${aPurger.length + aExaminer.length}`);
  console.log(`  purgeables sans perte              : ${aPurger.length}`);
  console.log(`  à examiner à la main               : ${aExaminer.length}\n`);

  for (const { v, decls, axes, pu } of aPurger) {
    const etat = v.publie ? "[publié]  " : "[brouillon]";
    console.log(`  ${etat} ${v.nom} — prix unique ${pu} € · ${decls.length} ligne(s), ${axes.length} axe(s)`);
  }

  if (aExaminer.length > 0) {
    console.log(`\n  ── Laissées intactes ──`);
    for (const { v, motif } of aExaminer) {
      console.log(`  ${v.publie ? "[publié]  " : "[brouillon]"} ${v.nom} — ${motif} (${v.slug})`);
    }
  }

  if (!APPLIQUER) {
    console.log(`\nSimulation — rien n'a été écrit. Relancer avec --appliquer pour purger.`);
    return;
  }

  const sauvegarde = await derniereSauvegarde();
  if (!sauvegarde && !SANS_SAUVEGARDE) {
    console.error(`\n✖ Aucune sauvegarde trouvée dans ${DOSSIER}/.`);
    console.error(`  Lancer d'abord : node prisma/sauver-declinaisons-residuelles.mjs`);
    console.error(`  (ou forcer avec --sans-sauvegarde, en connaissance de cause)`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nSauvegarde de référence : ${sauvegarde ?? "aucune (--sans-sauvegarde)"}`);

  let n = 0;
  for (const { v } of aPurger) {
    await prisma.produitVitrine.update({
      where: { id: v.id },
      data: { declinaisons: [], axesDeclinaisons: [] },
    });
    n++;
  }
  console.log(`${n} vitrine(s) purgée(s).`);
  if (sauvegarde) {
    console.log(`Retour arrière : node prisma/sauver-declinaisons-residuelles.mjs --restaurer ${sauvegarde} --appliquer`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
