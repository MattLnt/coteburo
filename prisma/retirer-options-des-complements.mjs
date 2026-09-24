// Retire les options que les compléments proposaient entre eux.
//
//   node prisma/retirer-options-des-complements.mjs
//   node prisma/retirer-options-des-complements.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   L'import a lié tous les compléments d'une gamme à toutes ses fiches — y
//   compris entre eux. Résultat : « Bac métal à crochet - Alto » propose une
//   goulotte, un séparateur et un voile de fond en option. Un complément se
//   vend seul ou en option d'un bureau ; il ne porte pas d'options lui-même.
//
// CE QU'IL FAIT
//   Vide la liste optionsLiees de toute fiche qui est un complément : celles
//   du rayon Bureaux › Compléments & accessoires, et celles qui sont
//   elles-mêmes proposées en option d'une autre fiche — un châssis pour
//   dossiers suspendus, un kit de poignées, un top, un dos tissu ne
//   proposent pas d'options. Les liens dans l'autre sens — un bureau qui
//   propose ce complément — ne bougent pas : c'est eux qui ont un sens.
//
//   Second passage le 24 septembre 2026 : le premier ne regardait que le
//   rayon, et trente-six compléments rangés ailleurs (Archivage, Armoires,
//   Convivialité…) gardaient leurs options.
//
//   Les liens retirés sont écrits dans un fichier JSON avant l'écriture, pour
//   pouvoir les remettre si le tri était trop large.
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══"
    : "═══ SIMULATION — rien n'est écrit ═══");
  console.log("");

  const complements = await prisma.produitVitrine.findMany({
    where: {
      optionsLiees: { some: {} },
      OR: [
        { sousCategories: { some: { slug: "complements-accessoires" } } },
        { optionPour: { some: {} } },
      ],
    },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, optionsLiees: { select: { id: true, nom: true } } },
  });
  const liens = complements.reduce((n, c) => n + c.optionsLiees.length, 0);
  console.log(`${complements.length} compléments portent des options · ${liens} liens à retirer`);
  console.log("");
  for (const c of complements) {
    console.log(`   ${c.nom}`);
    for (const o of c.optionsLiees) console.log(`      − ${o.nom}`);
  }

  if (!APPLIQUER) { console.log(""); console.log("Simulation terminée. Relancer avec --appliquer pour écrire."); return; }

  const sauvegarde = `prisma/sauvegardes/options-des-complements-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(sauvegarde, JSON.stringify(complements, null, 1));
  console.log("");
  console.log(`   liens sauvegardés dans ${sauvegarde}`);
  for (const c of complements) {
    await prisma.produitVitrine.update({ where: { id: c.id }, data: { optionsLiees: { set: [] } } });
  }
  console.log(`   ${liens} liens retirés sur ${complements.length} fiches.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
