// Sort du catalogue les fiches qui ne sont que des options d'autres fiches.
//
//   node prisma/masquer-options-du-catalogue.mjs
//   node prisma/masquer-options-du-catalogue.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Un kit de 4 roulettes, un dos tissu, un top, une paire d'accoudoirs sont
//   des options : ils se choisissent sur la fiche du bureau, de l'armoire ou
//   de la chaise. Publiés, ils s'affichaient aussi comme des produits dans
//   leur rayon — soixante-quatre fiches, un rayon Compléments qui s'ouvrait
//   sur des kits.
//
// CE QU'IL FAIT
//   accessoireSeul = true sur toute fiche publiée qui est proposée en option
//   d'au moins une autre fiche. Rien n'est supprimé ni dépublié : la fiche
//   garde son adresse (un lien de devis ne meurt pas), reste proposée en
//   option, et disparaît des listes, du menu et de la recherche.
//
//   Quelques fiches sont de vrais meubles qui se trouvent aussi être des
//   options : elles restent au catalogue, nommées dans SAUF.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const SAUF = new Set([
  "Rangement suspendu 2 portes battantes - Alto",   // un rangement, pas un kit
]);

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  const fiches = await prisma.produitVitrine.findMany({
    where: { publie: true, accessoireSeul: false, optionPour: { some: {} } },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, sousCategories: { select: { nom: true } }, _count: { select: { optionPour: true } } },
  });
  const cibles = fiches.filter((f) => !SAUF.has(f.nom));
  console.log(`\n${cibles.length} fiches sortent du catalogue (${fiches.length - cibles.length} gardée(s) : ${[...SAUF].join(", ")})\n`);
  for (const f of cibles) console.log(`   ${f.nom.padEnd(64)} ${(f.sousCategories[0]?.nom || "—").padEnd(26)} option sur ${f._count.optionPour}`);
  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }
  const r = await prisma.produitVitrine.updateMany({ where: { id: { in: cibles.map((f) => f.id) } }, data: { accessoireSeul: true } });
  console.log(`\n   ${r.count} fiches masquées.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
