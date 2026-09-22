// Un axe qui choisit la référence est tarifaire, pas une finition.
//
//   node prisma/requalifier-axes-selectifs.mjs
//   node prisma/requalifier-axes-selectifs.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// CE QUI NE VA PAS
//   Cinquante-trois axes posés en « finition » sélectionnent en réalité la
//   combinaison : deux combinaisons ne diffèrent que par eux, et elles portent
//   des références de base DIFFÉRENTES.
//
//   Or une finition n'entre pas dans le filtrage. Sur ces fiches, aucun choix
//   n'est tarifaire, donc resoudreCombinaison() rend la PREMIÈRE combinaison
//   venue — et la référence commandée est celle de la première teinte, quelle
//   que soit celle qu'a choisie le client :
//
//     Loria, Chaise 4 pieds PP, coque PP
//       Blanc Ciment    → LCAB/A        les bases LCAB/W, LCAB/T, LCAB/E
//       Vert Foncé      → LCAB/A        et LCAB/P existent en base et ne
//       Taupe           → LCAB/A        sont jamais atteintes.
//       Bordeaux Foncé  → LCAB/A
//
//   Toute commande Adio, Loria ou Maike serait partie avec la mauvaise teinte.
//
// LE CRITÈRE, ET SA PRUDENCE
//   On ne requalifie QUE si deux combinaisons, identiques par ailleurs, ont
//   des références de base différentes. Un axe qui ajoute seulement son jeton
//   à une base commune reste une finition : il ne sélectionne rien, et la
//   référence s'assemble très bien sans lui.
//
//   Ces axes viennent de prisma/nommer-axes-caches.mjs, qui les créait en
//   « finition » par défaut. Le défaut était bon pour les axes à jeton, faux
//   pour ceux qui portent la base.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

// Un axe qui SÉLECTIONNE une combinaison est tarifaire, quel que soit son
// effet sur le prix. Posé en « finition », il n'entre pas dans le filtrage :
// la combinaison ne se résout jamais et la fiche est incommandable.
const v = await p.produitVitrine.findMany({
  where: { publie: true },
  select: { id: true, nom: true,
    choix: { select: { id: true, cle: true, nom: true, nature: true } },
    combinaisons: { select: { valeurs: true, referenceBase: true } } },
});
console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION ═══\n");
let n = 0;
for (const x of v) {
  const citees = new Set(x.combinaisons.flatMap((k) => Object.keys(k.valeurs || {})));
  for (const c of x.choix) {
    if (c.nature !== "finition" || !citees.has(c.cle)) continue;
    // La clé est-elle DISCRIMINANTE ? Deux combinaisons qui ne diffèrent que
    // par elle prouvent qu'elle sélectionne.
    // Le vrai critère : deux combinaisons qui ne diffèrent QUE par cette clé
    // et qui portent des référenceS DE BASE différentes. Là, l'axe sélectionne
    // la combinaison et doit être tarifaire.
    //
    // Si la base est la même, l'axe ne sélectionne rien : il ajoute son jeton
    // à la référence, et la fiche se commande très bien en finition. C'est le
    // cas d'Adio, Loria et Maike, vérifié fiche par fiche — ne pas les toucher.
    const parReste = new Map();
    let selectionne = false;
    for (const k of x.combinaisons) {
      const { [c.cle]: _, ...reste } = k.valeurs || {};
      const cle = JSON.stringify(Object.keys(reste).sort().map((q) => [q, reste[q]]));
      if (parReste.has(cle) && parReste.get(cle) !== k.referenceBase) { selectionne = true; break; }
      parReste.set(cle, k.referenceBase);
    }
    if (!selectionne) continue;
    n++;
    console.log(`   ${x.nom}\n      « ${c.nom} » (${c.cle}) : finition → tarifaire`);
    if (APPLIQUER) await p.choix.update({ where: { id: c.id }, data: { nature: "tarifaire" } });
  }
}
console.log(`\n${n} axe(s) à requalifier`);
console.log(APPLIQUER ? "Écrit." : "Simulation. --appliquer pour écrire.");
await p.$disconnect();
