// Donne à la goulotte simple une question qui ne répète pas la largeur.
//
//   node prisma/nommer-type-goulotte.mjs
//   node prisma/nommer-type-goulotte.mjs --appliquer
//
// « Modèle » avait cinq réponses dont quatre recopiaient la largeur du plan
// (plan L120 ↔ 90 cm…) et une désignait autre chose : la goulotte pour voile
// de fond et façade mélaminé (AF051K). Deux types, donc, et la largeur fait
// le reste : « Type » à deux réponses, la question de largeur ne se pose
// que pour le plan de bureau.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PLAN = "Pour plan de bureau";
const VDF = "Pour voile de fond et façade mélaminé";
const TYPE = (libelle) => (/VDF|voile de fond/i.test(libelle) ? VDF : PLAN);

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  const v = await prisma.produitVitrine.findFirst({ where: { nom: "Goulotte métal simple - Électrification" },
    select: { id: true, choix: { select: { id: true, cle: true, nom: true, valeurs: { select: { id: true, libelle: true } } } }, combinaisons: { select: { id: true, referenceBase: true, valeurs: true } } } });
  const axe = v?.choix.find((c) => c.cle === "modele");
  if (!axe) { console.log("pas d'axe « modele » — déjà fait ?"); return; }
  const combos = v.combinaisons.map((k) => { const { modele, ...reste } = k.valeurs || {}; return { k, valeurs: { ...reste, type: TYPE(modele) } }; });
  const empreintes = combos.map((c) => empreinteDe(c.valeurs));
  if (new Set(empreintes).size !== empreintes.length) { console.log("✗ deux combinaisons se confondraient"); return; }
  for (const c of combos) console.log(`   ${c.k.referenceBase.padEnd(8)} ${JSON.stringify(c.valeurs)}`);
  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }
  await prisma.$transaction([
    prisma.choix.update({ where: { id: axe.id }, data: { cle: "type", nom: "Type" } }),
    prisma.valeurChoix.deleteMany({ where: { choixId: axe.id } }),
    prisma.valeurChoix.createMany({ data: [{ choixId: axe.id, libelle: PLAN, ordre: 0 }, { choixId: axe.id, libelle: VDF, ordre: 1 }] }),
    ...combos.map((c) => prisma.combinaison.update({ where: { id: c.k.id }, data: { valeurs: c.valeurs, empreinte: empreinteDe(c.valeurs) } })),
  ]);
  console.log("écrit");
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
