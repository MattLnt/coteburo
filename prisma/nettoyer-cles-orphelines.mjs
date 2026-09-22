// Retire des combinaisons les clés dont plus aucun choix ne porte le nom.
//
//   node prisma/nettoyer-cles-orphelines.mjs
//   node prisma/nettoyer-cles-orphelines.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Quand un axe est retiré d'une fiche — parce qu'il n'avait plus qu'une
//   valeur, ou qu'il doublait un autre — la clé reste dans les combinaisons.
//   Elle est INERTE : combinaisonsCompatibles ne filtre que sur les choix qui
//   existent. Mais elle entre dans l'empreinte, elle trompe les contrôles, et
//   si un axe du même nom revenait un jour elle se réveillerait toute seule.
//
//   Deux fiches Wi-Max résille gardaient ainsi une clé « accotoirs » d'un
//   découpage ancien : ces sièges ne se vendent que sans accotoirs, l'axe
//   avait été retiré à juste titre, la clé était restée.
//
// LE GARDE-FOU
//   Deux combinaisons ne doivent pas se confondre une fois la clé retirée.
//   Si elles se confondraient, la clé portait encore une distinction et la
//   fiche est laissée telle quelle.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "./lib/empreinteCombinaison.js";
const p = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION ═══\n");
const v = await p.produitVitrine.findMany({ where: { publie: true },
  select: { id: true, nom: true, choix: { select: { cle: true } },
    combinaisons: { select: { id: true, valeurs: true, referenceBase: true } } } });
let n = 0;
for (const x of v) {
  const cles = new Set(x.choix.map(c => c.cle));
  const sales = x.combinaisons.filter(k => Object.keys(k.valeurs||{}).some(c => !cles.has(c)));
  if (!sales.length) continue;
  const orphelines = [...new Set(sales.flatMap(k => Object.keys(k.valeurs||{}).filter(c => !cles.has(c))))];
  console.log(`   ${x.nom}\n      ${sales.length} combinaisons · clés sans choix : ${orphelines.join(", ")}`);
  const neuves = sales.map(k => {
    const valeurs = { ...(k.valeurs||{}) };
    for (const c of orphelines) delete valeurs[c];
    return { id: k.id, valeurs, empreinte: empreinteDe(valeurs) };
  });
  // Deux combinaisons ne doivent pas se confondre une fois la clé retirée.
  const toutes = x.combinaisons.map(k => sales.includes(k)
    ? neuves.find(q => q.id === k.id).empreinte : empreinteDe(k.valeurs));
  if (new Set(toutes).size !== toutes.length) { console.log("      ✗ deux combinaisons se confondraient — laissée"); continue; }
  n += neuves.length;
  if (APPLIQUER) for (const q of neuves) await p.combinaison.update({ where: { id: q.id }, data: { valeurs: q.valeurs, empreinte: q.empreinte } });
}
console.log(`\n${n} combinaisons nettoyées`);
console.log(APPLIQUER ? "Écrit." : "Simulation. --appliquer pour écrire.");
await p.$disconnect();
