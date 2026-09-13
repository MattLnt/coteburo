import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Retire du catalogue les accessoires publiés par erreur.
//
// Un accessoire n'existe que par le produit auquel il se rattache : sa
// place est dans l'onglet Options d'une fiche, pas dans une grille de
// produits où il occuperait une carte sans intérêt pour le visiteur.
//
// Le dépublier ne le fait pas disparaître : getCarteFront les remonte
// sans filtrer sur « publie », depuis la correction apportée à
// lib/catalogue.js.
//
// Un accessoire rattaché à aucun produit fait exception : le dépublier
// le rendrait invisible partout. On le laisse en ligne et on le signale,
// le temps de lui trouver son produit parent.

const APPLIQUER = process.argv.includes("--appliquer");

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  const accessoires = await prisma.produitVitrine.findMany({
    where: {
      publie: true,
      categories: { some: { estOption: true } },
    },
    include: {
      gamme: { select: { nom: true, marque: { select: { nom: true } } } },
      optionPour: { select: { nom: true } },
    },
    orderBy: { nom: "asc" },
  });

  if (!accessoires.length) {
    console.log("Aucun accessoire publié.");
    return;
  }

  const aRetirer = accessoires.filter((a) => a.optionPour.length > 0);
  const orphelins = accessoires.filter((a) => a.optionPour.length === 0);

  console.log(`${aRetirer.length} accessoire(s) à retirer du catalogue :\n`);

  for (const a of aRetirer) {
    const parents = a.optionPour.map((p) => p.nom);
    console.log(`   ${a.nom}`);
    console.log(`      option de : ${parents.slice(0, 2).join(", ")}${parents.length > 2 ? ` +${parents.length - 2}` : ""}`);
  }

  if (orphelins.length) {
    console.log(`\n${orphelins.length} accessoire(s) laissé(s) en ligne :\n`);
    for (const a of orphelins) {
      console.log(`   ${a.nom}`);
      console.log(`      rattaché à aucun produit — le retirer le rendrait invisible`);
    }
  }

  if (!APPLIQUER) {
    console.log("\nnode prisma\\depublier-accessoires.mjs --appliquer");
    return;
  }

  const res = await prisma.produitVitrine.updateMany({
    where: { id: { in: aRetirer.map((a) => a.id) } },
    data: { publie: false },
  });

  console.log(`\n${res.count} accessoire(s) retiré(s) du catalogue.`);
  console.log(`Ils restent disponibles dans l'onglet Options des fiches produits.`);

  if (orphelins.length) {
    console.log(`\n${orphelins.length} accessoire(s) à rattacher dans l'admin avant de pouvoir être retiré(s).`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());