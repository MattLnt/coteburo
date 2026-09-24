// Répare les quatre assises Kanpoa : le lot est l'unité de vente, le
// coloris est le choix.
//
//   node prisma/reparer-lots-kanpoa.mjs
//   node prisma/reparer-lots-kanpoa.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// CE QUI ÉTAIT FAUX
//   La page 154 du tarif Sokoa a deux colonnes de prix : « PVP lot de 4 »
//   (1 174 €) et « Aluminium » (294 €, « prix unitaire à titre informatif
//   seulement »). L'import y a vu deux finitions. La fiche vendait donc une
//   chaise seule à 294 €, ce que Sokoa ne vend pas : « respect des unités de
//   conditionnement obligatoire et par couleur ».
//
//   Les vraies déclinaisons sont les sept coloris du nuancier p.206, une
//   référence chacun — KPA041, KPA043, KPA044, KPA045, KPA046, KPA048,
//   KPA049 : la racine, puis le chiffre du coloris.
//
// LA FORME
//   Une combinaison sur la racine (KPA04) au prix du lot, un axe « Coloris »
//   de nature finition, rang 0, dont chaque valeur ajoute son chiffre et
//   porte une couleur — donc une pastille. Quantité 1 = un lot.
//
//   L'écotaxe imprimée sur une ligne de lot est déjà celle du lot — la page
//   Maike le montre : 3,34 pour le lot de 4, 0,84 à l'unité. On la recopie.
//
// LE FILET
//   Chaque référence reconstruite doit être imprimée sur la page 154 du
//   tarif. Une seule absente et rien ne s'écrit.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PAGE_PDF = 154;

// Le nuancier p.206, dans l'ordre où la page 154 aligne les colonnes.
const COLORIS = [
  { libelle: "Noir", chiffre: "1", couleur: "#1f1f1f" },
  { libelle: "Gris", chiffre: "3", couleur: "#8e8e8e" },
  { libelle: "Bleu", chiffre: "4", couleur: "#2f5d9e" },
  { libelle: "Vert", chiffre: "5", couleur: "#3f7a4f" },
  { libelle: "Jaune moutarde", chiffre: "6", couleur: "#d8a624" },
  { libelle: "Bordeaux", chiffre: "8", couleur: "#7a1f2b" },
  { libelle: "Blanc", chiffre: "9", couleur: "#f2f0ec" },
];

const FICHES = [
  { nom: "Chaise 4 pieds, lot de 4 - Kanpoa by Colos", racine: "KPA04", lot: 4, prixLot: 1174, eco: 1.64 },
  { nom: "Fauteuil 4 pieds, lot de 4 - Kanpoa by Colos", racine: "KPA14", lot: 4, prixLot: 1463, eco: 1.82 },
  { nom: "Tabouret 4 pieds, lot de 2 - Kanpoa by Colos", racine: "KPB02", lot: 2, prixLot: 922, eco: 1.11 },
  { nom: "Fauteuil lounge 4 pieds, lot de 2 - Kanpoa by Colos", racine: "KPX12", lot: 2, prixLot: 1219, eco: 0.98 },
];

async function textePage() {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync("catalogue-2026/SOKOA_TARIF 2026_FR.pdf")), useSystemFonts: true }).promise;
  const c = await doc.getPage(PAGE_PDF).then((p) => p.getTextContent());
  return c.items.map((i) => i.str).join(" ").replace(/\s+/g, " ");
}

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  const page = await textePage();

  for (const f of FICHES) {
    const v = await prisma.produitVitrine.findFirst({ where: { nom: f.nom },
      select: { id: true, choix: { select: { id: true, cle: true, nom: true, valeurs: { select: { libelle: true } } } },
        combinaisons: { select: { id: true, referenceBase: true, prixTarifHT: true, pageCatalogue: true } } } });
    console.log(`\n${f.nom}`);
    if (!v) { console.log("   introuvable"); continue; }
    if (v.choix.some((c) => c.cle === "coloris")) { console.log("   déjà réparée"); continue; }

    // Le filet : prix du lot imprimé à côté de la racine, et chaque référence sur la page.
    const refs = COLORIS.map((c) => f.racine + c.chiffre);
    const absentes = refs.filter((r) => !page.includes(r));
    if (absentes.length) { console.log(`   ✗ absentes de la page ${PAGE_PDF} : ${absentes.join(", ")} — on ne touche à rien`); continue; }
    if (!page.includes(`${f.racine}1 ${f.prixLot} `)) { console.log(`   ✗ le tarif n'imprime pas ${f.prixLot} € à côté de ${f.racine}1 — on ne touche à rien`); continue; }
    const bases = [...new Set(v.combinaisons.map((k) => k.referenceBase))];
    if (bases.length !== 1 || bases[0] !== f.racine + "1") { console.log(`   ✗ combinaisons inattendues : ${bases.join(", ")}`); continue; }

    const eco = f.eco;
    console.log(`   ${v.combinaisons.length} combinaisons (${v.combinaisons.map((k) => k.prixTarifHT + " €").join(", ")}) → une seule : ${f.racine} à ${f.prixLot} € le lot de ${f.lot}, éco ${eco}`);
    console.log(`   axes retirés : ${v.choix.map((c) => `« ${c.nom} »`).join(", ")}`);
    console.log(`   axe « Coloris » : ${COLORIS.map((c) => `${c.libelle} → ${f.racine}${c.chiffre}`).join(" · ")}`);
    if (!APPLIQUER) continue;

    const garde = v.combinaisons[0];
    await prisma.$transaction([
      ...v.choix.map((c) => prisma.choix.delete({ where: { id: c.id } })),
      prisma.combinaison.deleteMany({ where: { vitrineId: v.id, id: { not: garde.id } } }),
      prisma.combinaison.update({ where: { id: garde.id }, data: {
        referenceBase: f.racine, prixTarifHT: f.prixLot, ecoContribution: eco, valeurs: {}, empreinte: empreinteDe({}), pageCatalogue: garde.pageCatalogue,
      } }),
      prisma.choix.create({ data: {
        vitrineId: v.id, cle: "coloris", nom: "Coloris", nature: "finition", rangReference: 0, obligatoire: true, ordre: 0,
        valeurs: { create: COLORIS.map((c, i) => ({ libelle: c.libelle, suffixeReference: c.chiffre, couleur: c.couleur, ordre: i })) },
      } }),
    ]);
    console.log("   écrit");
  }
  if (!APPLIQUER) console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
