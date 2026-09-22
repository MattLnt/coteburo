// Sort du catalogue les éléments que les fiches composées vendent désormais.
//
//   node prisma/sortir-elements-composition-quietude.mjs
//   node prisma/sortir-elements-composition-quietude.mjs --appliquer
//
// accessoireSeul, pas publie = false : la fiche quitte les rayons et la
// recherche, reste joignable par son adresse — un lien de devis ne doit pas
// mourir — et reste utilisable en option. Dépubliée, elle deviendrait
// éligible à prisma/supprimer-fiches-remplacees.mjs, et on ne veut pas qu'elle
// parte : les compositions s'en servent.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const SORTENT = [
  // Quiétude, pages 238-241
  "Rangement ouvert sans top - Quiétude",
  "Kit de 2 portes battantes - Quiétude",
  "Kit de 2 poignées - Quiétude",
  // Eko, pages 262-263
  "Casier à cases ouvertes - Eko",
  "Socle pour casier - Eko",
  "Kit de portes - Eko",
  "Porte vestiaire avec patère - Eko",
];

// Ce qu'on GARDE au catalogue, et pourquoi.
const GARDEES = [
  ["Top pour rangement - Quiétude",
    "porte aussi BJ083, BJ103 et BJ093, les tops pour deux ou trois meubles juxtaposés, qu'aucune composition ne vend"],
  ["Dos tissu pour casier - Eko",
    "accessoire qu'on achète seul, et que la page 263 range elle-même sous « Option »"],
  ["Clé passe et réinitialisation de serrure - Eko",
    "une clé de rechange se commande seule"],
];

console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION ═══\n");
for (const nom of SORTENT) {
  const v = await p.produitVitrine.findFirst({
    where: { nom }, select: { id: true, nom: true, publie: true, accessoireSeul: true },
  });
  if (!v) { console.log(`   INTROUVABLE : ${nom}`); continue; }
  console.log(`   ${v.accessoireSeul ? "déjà hors catalogue" : "SORT du catalogue "} · publie=${v.publie} · ${v.nom}`);
  if (APPLIQUER && !v.accessoireSeul) {
    await p.produitVitrine.update({ where: { id: v.id }, data: { accessoireSeul: true } });
  }
}

console.log("\n   gardées au catalogue :");
for (const [nom, pourquoi] of GARDEES) {
  const v = await p.produitVitrine.findFirst({ where: { nom }, select: { accessoireSeul: true } });
  if (!v) { console.log(`      INTROUVABLE : ${nom}`); continue; }
  console.log(`      ${nom}${v.accessoireSeul ? "  ⚠ déjà hors catalogue" : ""}`);
  console.log(`         ${pourquoi}`);
}

console.log(APPLIQUER ? "\nÉcrit." : "\nSimulation. --appliquer pour écrire.");
await p.$disconnect();
