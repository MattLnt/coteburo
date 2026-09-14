// Sauvegarde (et restaure) les déclinaisons et axes résiduels des vitrines
// passées en prix unique, avant la purge de prisma/purger-declinaisons-residuelles.mjs.
//
// Le fichier produit contient tout ce qu'il faut pour remettre la base dans son
// état d'origine : id, nom et slug de chaque vitrine, plus ses colonnes
// `declinaisons` et `axesDeclinaisons` telles quelles.
//
//   node prisma/sauver-declinaisons-residuelles.mjs
//       → écrit prisma/sauvegardes/declinaisons-residuelles-<horodatage>.json
//
//   node prisma/sauver-declinaisons-residuelles.mjs --restaurer <fichier>
//       → réécrit en base les déclinaisons et axes du fichier (simulation)
//
//   node prisma/sauver-declinaisons-residuelles.mjs --restaurer <fichier> --appliquer
//       → restauration effective

import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const DOSSIER = path.join("prisma", "sauvegardes");

const args = process.argv.slice(2);
const APPLIQUER = args.includes("--appliquer");
const iRestaurer = args.indexOf("--restaurer");
const FICHIER_RESTAURE = iRestaurer !== -1 ? args[iRestaurer + 1] : null;

async function exporter() {
  const { collecterResidus, getMarge } = await import("./_residus-declinaisons.mjs");
  const marge = await getMarge(prisma);
  const { aPurger, aExaminer } = await collecterResidus(prisma, marge);

  // On sauvegarde TOUT ce qui porte un résidu, pas seulement ce que la purge
  // vise : si le classement « à examiner » évolue, la sauvegarde reste complète.
  const toutes = [...aPurger, ...aExaminer];

  const contenu = {
    genereLe: new Date().toISOString(),
    margeGlobale: marge,
    nbVitrines: toutes.length,
    // Trace de ce que la purge aurait fait au moment de la sauvegarde.
    nbPurgeables: aPurger.length,
    nbAExaminer: aExaminer.length,
    vitrines: toutes.map(({ v, decls, axes, pu }) => ({
      id: v.id,
      nom: v.nom,
      slug: v.slug,
      publie: v.publie,
      // Contexte, non restauré — sert à relire la sauvegarde sans la base.
      prixUniqueCalcule: pu,
      referenceUnitaire: v.referenceUnitaire,
      // Les deux seules colonnes que la purge écrase.
      declinaisons: decls,
      axesDeclinaisons: axes,
    })),
  };

  await mkdir(DOSSIER, { recursive: true });
  const horodatage = contenu.genereLe.replace(/[:.]/g, "-");
  const chemin = path.join(DOSSIER, `declinaisons-residuelles-${horodatage}.json`);
  await writeFile(chemin, JSON.stringify(contenu, null, 2), "utf8");

  const nbLignes = toutes.reduce((s, x) => s + x.decls.length, 0);
  const nbPubliees = toutes.filter((x) => x.v.publie).length;

  console.log(`Sauvegarde écrite : ${chemin}`);
  console.log(`  vitrines        : ${contenu.nbVitrines} (${nbPubliees} publiée(s))`);
  console.log(`  lignes de décl. : ${nbLignes}`);
  console.log(`  purgeables      : ${contenu.nbPurgeables}`);
  console.log(`  à examiner      : ${contenu.nbAExaminer}`);
  console.log(`\nPurge : node prisma/purger-declinaisons-residuelles.mjs --appliquer`);
  console.log(`Retour arrière : node prisma/sauver-declinaisons-residuelles.mjs --restaurer ${chemin} --appliquer`);
}

async function restaurer(fichier) {
  const brut = await readFile(fichier, "utf8");
  const contenu = JSON.parse(brut);
  if (!Array.isArray(contenu.vitrines)) {
    throw new Error(`Fichier invalide : ${fichier} (pas de tableau "vitrines")`);
  }

  console.log(`Sauvegarde du ${contenu.genereLe} — ${contenu.vitrines.length} vitrine(s)\n`);

  let absentes = 0;
  const cibles = [];
  for (const s of contenu.vitrines) {
    const actuelle = await prisma.produitVitrine.findUnique({
      where: { id: s.id },
      select: { id: true, nom: true, declinaisons: true, axesDeclinaisons: true },
    });
    if (!actuelle) {
      console.log(`  ⚠ introuvable, ignorée : ${s.nom} (${s.id})`);
      absentes++;
      continue;
    }
    const dActuelles = Array.isArray(actuelle.declinaisons) ? actuelle.declinaisons.length : 0;
    const aActuels = Array.isArray(actuelle.axesDeclinaisons) ? actuelle.axesDeclinaisons.length : 0;
    console.log(`  ${s.nom} : ${dActuelles} décl./${aActuels} axe(s) → ${s.declinaisons.length} décl./${s.axesDeclinaisons.length} axe(s)`);
    cibles.push(s);
  }

  if (!APPLIQUER) {
    console.log(`\nSimulation — rien n'a été écrit. Ajouter --appliquer pour restaurer.`);
    if (absentes) console.log(`${absentes} vitrine(s) de la sauvegarde n'existent plus.`);
    return;
  }

  for (const s of cibles) {
    await prisma.produitVitrine.update({
      where: { id: s.id },
      data: { declinaisons: s.declinaisons, axesDeclinaisons: s.axesDeclinaisons },
    });
  }
  console.log(`\n${cibles.length} vitrine(s) restaurée(s).`);
  if (absentes) console.log(`${absentes} ignorée(s) (supprimées depuis la sauvegarde).`);
}

const tache = FICHIER_RESTAURE ? restaurer(FICHIER_RESTAURE) : exporter();
tache
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
