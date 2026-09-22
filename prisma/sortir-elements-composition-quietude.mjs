import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

// Ce que les deux fiches composées vendent désormais. « Top pour rangement »
// n'y est PAS : elle porte aussi les tops communs BJ083, BJ103 et BJ093, pour
// deux ou trois meubles juxtaposés, qu'aucune fiche composée ne propose.
// La retirer priverait le catalogue de trois produits réels.
const SORTENT = [
  "Rangement ouvert sans top - Quiétude",
  "Kit de 2 portes battantes - Quiétude",
  "Kit de 2 poignées - Quiétude",
];

console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION ═══\n");
for (const nom of SORTENT) {
  const v = await p.produitVitrine.findFirst({ where: { nom }, select: { id: true, nom: true, publie: true, accessoireSeul: true } });
  if (!v) { console.log(`   INTROUVABLE : ${nom}`); continue; }
  console.log(`   ${v.accessoireSeul ? "déjà hors catalogue" : "SORT du catalogue"} · publie=${v.publie} · ${v.nom}`);
  if (APPLIQUER && !v.accessoireSeul) {
    await p.produitVitrine.update({ where: { id: v.id }, data: { accessoireSeul: true } });
  }
}
const reste = await p.produitVitrine.findFirst({ where: { nom: "Top pour rangement - Quiétude" }, select: { accessoireSeul: true } });
console.log(`\n   gardée au catalogue : Top pour rangement (accessoireSeul=${reste.accessoireSeul}) — elle porte BJ083, BJ103, BJ093`);
console.log(APPLIQUER ? "\nÉcrit." : "\nSimulation. --appliquer pour écrire.");
await p.$disconnect();
