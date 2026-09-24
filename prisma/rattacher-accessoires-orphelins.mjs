// Rattache en option les accessoires qui n'étaient l'option de personne,
// et les sort du catalogue.
//
//   node prisma/rattacher-accessoires-orphelins.mjs
//   node prisma/rattacher-accessoires-orphelins.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   La règle « une fiche proposée en option ne s'affiche pas au catalogue »
//   laissait passer les accessoires que personne ne proposait : les trois
//   kits Bewall, le coussin et le kit d'électrification Rhune, l'extension
//   de retour Astrolite. Un kit de pinces pour écran n'a de sens que sur la
//   fiche de l'écran. On le rattache là où il sert, puis il sort des listes.
//
//   Le rayon Bureaux › Compléments & accessoires n'est pas touché : goulottes,
//   blocs électriques et descentes de câbles se vendent seuls, c'est son rôle.
//   Les « Kit table et 2 chaises » Beez sont des ensembles, pas des options.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

// accessoire → fiches qui le proposent (un filtre Prisma sur ProduitVitrine)
const RATTACHEMENTS = [
  { accessoire: "Kit de 2 bases métal à poser - Bewall",
    sur: { gamme: { nom: { startsWith: "BEWALL" } }, nom: { startsWith: "Séparateur" } } },
  { accessoire: "Kit de pinces pour écran Bewall - Bewall",
    sur: { gamme: { nom: { startsWith: "BEWALL" } }, nom: { startsWith: "Séparateur" } } },
  { accessoire: "Kit de pinces pour écran latéral - Bewall",
    sur: { gamme: { nom: { startsWith: "BEWALL" } }, nom: { contains: "latéral" } } },
  { accessoire: "Coussin latéral cylindrique, l'unité - Rhune",
    sur: { gamme: { nom: "Rhune" }, NOT: [{ nom: { startsWith: "Table" } }, { nom: { startsWith: "Kit" } }] } },
  { accessoire: "Kit d'électrification, prise CE et 2 ports USB - Rhune",
    sur: { gamme: { nom: "Rhune" }, nom: { contains: "électrification possible" } } },
  { accessoire: "Extension de retour - Astrolite",
    sur: { gamme: { nom: "ASTROLITE" }, nom: { startsWith: "Bureau plan" } } },
  // Fifty Full, pages 327-328 : les modules « se positionnent obligatoirement
  // en intermédiaire » — ils étendent un comptoir, ils ne se vendent pas seuls.
  ...["Module bas avec angle 90°", "Module bas intermédiaire", "Module haut intermédiaire",
    "Module PMR final", "Module PMR intermédiaire", "Module retour bas", "Module retour haut"]
    .map((m) => ({ accessoire: `${m} - Fifty Full`,
      sur: { gamme: { nom: "FIFTY-FULL" }, nom: { startsWith: "Comptoir d'accueil" } } })),
];

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  const plan = [];
  for (const r of RATTACHEMENTS) {
    const acc = await prisma.produitVitrine.findFirst({ where: { nom: r.accessoire }, select: { id: true, nom: true, accessoireSeul: true } });
    if (!acc) { console.log(`\n✗ ${r.accessoire} : introuvable`); continue; }
    const porteuses = await prisma.produitVitrine.findMany({ where: { publie: true, id: { not: acc.id }, ...r.sur }, select: { id: true, nom: true }, orderBy: { nom: "asc" } });
    console.log(`\n${acc.nom}${acc.accessoireSeul ? " (déjà hors catalogue)" : ""}`);
    if (!porteuses.length) { console.log("   ✗ aucune fiche porteuse — rien ne sera fait pour celle-ci"); continue; }
    for (const pf of porteuses) console.log(`   → option sur ${pf.nom}`);
    plan.push({ acc, porteuses });
  }
  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }
  for (const { acc, porteuses } of plan) {
    for (const pf of porteuses) {
      await prisma.produitVitrine.update({ where: { id: pf.id }, data: { optionsLiees: { connect: [{ id: acc.id }] } } });
    }
    await prisma.produitVitrine.update({ where: { id: acc.id }, data: { accessoireSeul: true } });
  }
  console.log(`\n   ${plan.length} accessoires rattachés et masqués.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
