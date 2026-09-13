import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Rattache le coussin d'assise ED72 aux caissons Comfort, puis le retire
// du catalogue.
//
// Ce coussin transforme un caisson en assise d'appoint : sa place est
// dans l'onglet Options des fiches caissons, pas dans une grille de
// produits où il occupe une carte sans intérêt pour le visiteur.
//
// Il était resté publié faute de rattachement — le dépublier l'aurait
// rendu invisible partout. Une fois lié, il reste proposable tout en
// disparaissant du catalogue.

const APPLIQUER = process.argv.includes("--appliquer");

const ACCESSOIRE = "Coussin d'assise";

// Les caissons Comfort sur lesquels le coussin peut se poser. Les
// caissons hauteur bureau en sont exclus : on ne s'assoit pas sur un
// meuble à hauteur de plan de travail.
const PARENTS = [
  "Caisson mobile - Comfort",
  "Caisson mobile slim - Comfort",
];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  const coussin = await prisma.produitVitrine.findFirst({
    where: { nom: { equals: ACCESSOIRE } },
    include: { optionPour: { select: { id: true, nom: true } } },
  });

  if (!coussin) { console.log(`✗ « ${ACCESSOIRE} » introuvable.`); return; }

  console.log(`▸ ${coussin.nom}`);
  console.log(`   ${coussin.publie ? "publié" : "brouillon"} · rattaché à ${coussin.optionPour.length} produit(s)\n`);

  const parents = await prisma.produitVitrine.findMany({
    where: { nom: { in: PARENTS } },
    select: { id: true, nom: true },
  });

  const absents = PARENTS.filter((n) => !parents.some((p) => p.nom === n));
  absents.forEach((n) => console.log(`   ✗ ${n} — introuvable`));

  if (!parents.length) { console.log("Aucun produit parent trouvé."); return; }

  console.log(`   À rattacher sur :`);
  parents.forEach((p) => console.log(`      ${p.nom}`));

  if (!APPLIQUER) {
    console.log(`\n   Puis dépublication du coussin.`);
    console.log("\nnode prisma\\rattacher-coussin.mjs --appliquer");
    return;
  }

  await prisma.produitVitrine.update({
    where: { id: coussin.id },
    data: {
      // connect ajoute sans retirer les liens existants.
      optionPour: { connect: parents.map((p) => ({ id: p.id })) },
      // Une fois rattaché, il n'a plus à figurer au catalogue : le code
      // des fiches remonte les options sans exiger qu'elles soient
      // publiées.
      publie: false,
    },
  });

  console.log(`\n   ✓ rattaché à ${parents.length} produit(s) et retiré du catalogue`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());