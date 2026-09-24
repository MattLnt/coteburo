// Retire « sur devis » aux fiches qui ont un prix.
//
//   node prisma/decocher-sur-devis.mjs
//   node prisma/decocher-sur-devis.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Cinquante-sept fiches publiées portaient « vente sur devis » alors que
//   toutes leurs combinaisons ont un prix au tarif : le bouton disait
//   « Demander un devis » là où le client pouvait commander. Deux gammes
//   entières portaient le drapeau (Alto assise confidentielle, Bewall
//   cloisons) sans qu'aucune de leurs fiches ne soit sans prix.
//
// LA RÈGLE
//   Sur devis = pas de prix. Une fiche dont chaque combinaison a un prix
//   perd le drapeau ; une gamme dont chaque fiche publiée a un prix perd le
//   sien. Ce qui n'a pas de prix — cabines Essentielle, tisaneries Oasys —
//   ne bouge pas.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  const fiches = await prisma.produitVitrine.findMany({
    where: { publie: true, OR: [{ venteSurDevis: true }, { gamme: { venteSurDevis: true } }] },
    select: { id: true, nom: true, venteSurDevis: true, gammeId: true, gamme: { select: { nom: true, venteSurDevis: true } }, combinaisons: { select: { prixTarifHT: true } } },
  });
  const aPrix = (v) => v.combinaisons.length > 0 && v.combinaisons.every((k) => k.prixTarifHT != null);
  const fichesADecocher = fiches.filter((v) => v.venteSurDevis && aPrix(v));

  // Une gamme perd son drapeau si toutes ses fiches publiées ont un prix.
  const gammes = new Map();
  for (const v of fiches) if (v.gamme.venteSurDevis) { if (!gammes.has(v.gammeId)) gammes.set(v.gammeId, { nom: v.gamme.nom, toutes: true }); if (!aPrix(v)) gammes.get(v.gammeId).toutes = false; }
  const gammesADecocher = [...gammes].filter(([, g]) => g.toutes);

  console.log(`\n${fichesADecocher.length} fiches perdent « sur devis » :`);
  for (const v of fichesADecocher) console.log(`   ${v.nom}`);
  console.log(`\n${gammesADecocher.length} gammes perdent « sur devis » : ${gammesADecocher.map(([, g]) => g.nom).join(", ") || "—"}`);
  console.log(`\nrestent sur devis : ${fiches.filter((v) => !aPrix(v)).map((v) => v.nom).join(" · ")}`);
  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }

  const r1 = await prisma.produitVitrine.updateMany({ where: { id: { in: fichesADecocher.map((v) => v.id) } }, data: { venteSurDevis: false } });
  const r2 = await prisma.gamme.updateMany({ where: { id: { in: gammesADecocher.map(([id]) => id) } }, data: { venteSurDevis: false } });
  console.log(`\n   ${r1.count} fiches et ${r2.count} gammes décochées.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
