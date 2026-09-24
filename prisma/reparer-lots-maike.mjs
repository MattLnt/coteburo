// Répare les six fiches Maike : le lot est l'unité de vente, le prix
// unitaire du tarif n'est qu'une mention.
//
//   node prisma/reparer-lots-maike.mjs
//   node prisma/reparer-lots-maike.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// CE QUI ÉTAIT FAUX
//   Pages 156-157 du tarif Sokoa, les lignes « vendue par lot de 4 » ont deux
//   colonnes : « PVP lot de 4 » (514 €) et « PVP unitaire* » (129 €, « à
//   titre informatif si respect UC »). L'import y a vu un axe « Finition »
//   à deux valeurs et a dédoublé chaque coloris : la fiche vendait une chaise
//   à 129 €. Les fiches « vendue à l'unité » (154 €, leurs propres
//   références KEA00xx) sont justes ; elles portent seulement un axe
//   « PVP unitaire » à une valeur, qui ne dit rien et part.
//
// LE FILET
//   Chaque référence conservée doit être imprimée sur sa page du tarif à
//   côté de son prix de lot. Une seule absente et rien ne s'écrit.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const EN_TETE = /\bPVP\b/i;

async function pages() {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync("catalogue-2026/SOKOA_TARIF 2026_FR.pdf")), useSystemFonts: true }).promise;
  const t = {};
  for (const n of [156, 157]) t[n] = (await doc.getPage(n).then((p) => p.getTextContent())).items.map((i) => i.str).join(" ").replace(/\s+/g, " ");
  return t;
}

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  const texte = await pages();
  const fiches = await prisma.produitVitrine.findMany({ where: { gamme: { nom: "Maike" } }, orderBy: { nom: "asc" },
    select: { id: true, nom: true, choix: { select: { id: true, cle: true, nom: true, valeurs: { select: { libelle: true } } } },
      combinaisons: { select: { id: true, referenceBase: true, valeurs: true, prixTarifHT: true, pageCatalogue: true } } } });

  for (const f of fiches) {
    console.log(`\n${f.nom}`);
    const axesPrix = f.choix.filter((c) => c.valeurs.some((v) => EN_TETE.test(v.libelle)));
    if (!axesPrix.length) { console.log("   rien à faire"); continue; }
    const cles = axesPrix.map((c) => c.cle);
    const aRetirer = f.combinaisons.filter((k) => cles.some((cle) => /unitaire/i.test(String(k.valeurs?.[cle] ?? ""))) && f.combinaisons.some((o) => o.referenceBase === k.referenceBase && o.id !== k.id));
    const gardees = f.combinaisons.filter((k) => !aRetirer.includes(k));

    // Le filet : chaque référence gardée, à côté de son prix, sur sa page.
    const manquantes = gardees.filter((k) => !texte[k.pageCatalogue]?.includes(`${k.referenceBase} ${k.prixTarifHT} `));
    if (manquantes.length) { console.log(`   ✗ non trouvées au tarif : ${manquantes.map((k) => `${k.referenceBase} ${k.prixTarifHT} €`).join(", ")} — on ne touche à rien`); continue; }

    console.log(`   axes retirés : ${axesPrix.map((c) => `« ${c.nom} » (${c.valeurs.map((v) => v.libelle).join(" / ")})`).join(", ")}`);
    if (aRetirer.length) console.log(`   ${aRetirer.length} combinaisons « unitaire » retirées · ${gardees.length} gardées à ${[...new Set(gardees.map((k) => k.prixTarifHT))].join("/")} €`);
    if (!APPLIQUER) continue;

    const ops = [
      ...axesPrix.map((c) => prisma.choix.delete({ where: { id: c.id } })),
      ...aRetirer.map((k) => prisma.combinaison.delete({ where: { id: k.id } })),
    ];
    for (const k of gardees) {
      const valeurs = { ...(k.valeurs || {}) };
      for (const cle of cles) delete valeurs[cle];
      ops.push(prisma.combinaison.update({ where: { id: k.id }, data: { valeurs, empreinte: empreinteDe(valeurs) } }));
    }
    await prisma.$transaction(ops);
    console.log("   écrit");
  }
  if (!APPLIQUER) console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
