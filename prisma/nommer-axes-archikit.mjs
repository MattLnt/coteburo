// Donne des questions lisibles au rayonnage Archikit.
//
//   node prisma/nommer-axes-archikit.mjs
//   node prisma/nommer-axes-archikit.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// CE QUI ÉTAIT FAUX
//   « Composition - Archikit » posait une question « Référence » à cent
//   quarante réponses : ZAK 103 DAG, ZAK 25 107 SPG… Rien qu'un client puisse
//   lire, et pas une seule dimension nommée.
//
// LA GRAMMAIRE (tarif Sokoa, pages 178-180)
//   ZAK [25|30|1N] [LLP] [D|S][A|P]G
//     rien / 25 / 30  → hauteur 2000 / 2500 / 3000 mm ; 1N → niveau supplémentaire
//     LL              → longueur : 10 = 1000, 07 = 700 mm
//     P               → profondeur : 3 = 300 … 7 = 700 mm
//     D / S           → élément de départ / élément suite
//     A / P           → niveaux ajourés (à claire-voie) / niveaux pleins
//     G               → galva
//
//   Cent vingt références font le rayonnage (2 niveaux × 2 éléments ×
//   3 hauteurs × 2 longueurs × 5 profondeurs) ; les vingt « 1N » sont un
//   niveau supplémentaire — tablette + deux traverses — qui s'ajoute à un
//   module. Il devient une fiche à part, proposée en option, hors catalogue.
//
// LE FILET
//   Chaque référence doit se lire entièrement dans la grammaire, les cent
//   quarante tuples doivent être distincts, et chaque prix doit être imprimé
//   à côté de sa référence sur sa page. Un seul écart et rien ne s'écrit.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const NOM_ANCIEN = "Composition - Archikit";
const NOM_RAYONNAGE = "Rayonnage d'archivage galvanisé - Archikit";
const NOM_NIVEAU = "Niveau supplémentaire - Archikit";

const HAUTEUR = { "": "2000 mm", "25": "2500 mm", "30": "3000 mm" };
const LONGUEUR = { "10": "1000 mm", "07": "700 mm" };
const ELEMENT = { D: "Élément de départ", S: "Élément suite" };
const NIVEAUX = { A: "Ajourés (à claire-voie)", P: "Pleins" };

function lire(ref) {
  const m = /^ZAK (?:(25|30|1N) )?(\d\d)(\d) (?:(D|S))?(A|P)G$/.exec(ref);
  if (!m) return null;
  const [, h, ll, p, ds, ap] = m;
  if (h === "1N" && ds) return null;
  if (h !== "1N" && !ds) return null;
  if (!LONGUEUR[ll]) return null;
  const base = { niveaux: NIVEAUX[ap], longueur: LONGUEUR[ll], profondeur: `${p}00 mm` };
  return h === "1N" ? { supplement: true, valeurs: base }
    : { supplement: false, valeurs: { ...base, element: ELEMENT[ds], hauteur: HAUTEUR[h ?? ""] } };
}

async function pages() {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync("catalogue-2026/SOKOA_TARIF 2026_FR.pdf")), useSystemFonts: true }).promise;
  const t = [];
  for (const n of [178, 179, 180]) t.push((await doc.getPage(n).then((p) => p.getTextContent())).items.map((i) => i.str).join(" ").replace(/\s+/g, " "));
  return t.join(" ");
}

const AXES_RAYONNAGE = [
  ["niveaux", "Niveaux", ["Ajourés (à claire-voie)", "Pleins"]],
  ["element", "Élément", ["Élément de départ", "Élément suite"]],
  ["hauteur", "Hauteur", ["2000 mm", "2500 mm", "3000 mm"]],
  ["longueur", "Longueur", ["1000 mm", "700 mm"]],
  ["profondeur", "Profondeur", ["300 mm", "400 mm", "500 mm", "600 mm", "700 mm"]],
];
const AXES_NIVEAU = AXES_RAYONNAGE.filter(([cle]) => ["niveaux", "longueur", "profondeur"].includes(cle));

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  const v = await prisma.produitVitrine.findFirst({ where: { nom: NOM_ANCIEN },
    select: { id: true, slug: true, gammeId: true, publie: true, venteSurDevis: true, descriptif: true, categoriePrincipaleId: true,
      categories: { select: { id: true } }, choix: { select: { id: true, cle: true } },
      combinaisons: { select: { id: true, referenceBase: true, prixTarifHT: true } } } });
  if (!v) { console.log("fiche introuvable — déjà faite ?"); return; }
  const texte = await pages();

  const lus = v.combinaisons.map((k) => ({ k, lu: lire(k.referenceBase) }));
  const illisibles = lus.filter((x) => !x.lu).map((x) => x.k.referenceBase);
  if (illisibles.length) { console.log(`✗ hors grammaire : ${illisibles.join(", ")}`); return; }
  const empreintes = new Set(lus.map((x) => (x.lu.supplement ? "N:" : "R:") + empreinteDe(x.lu.valeurs)));
  if (empreintes.size !== lus.length) { console.log("✗ deux références donnent la même combinaison"); return; }
  const prixFaux = lus.filter((x) => !texte.includes(`${x.k.referenceBase} ${x.k.prixTarifHT} `)).map((x) => `${x.k.referenceBase} ${x.k.prixTarifHT} €`);
  if (prixFaux.length) { console.log(`✗ prix non imprimé à côté de la référence : ${prixFaux.join(", ")}`); return; }

  const rayonnage = lus.filter((x) => !x.lu.supplement);
  const niveaux = lus.filter((x) => x.lu.supplement);
  const archivage = await prisma.sousCategorie.findFirst({ where: { slug: "archivage", categorie: { slug: "rangements" } }, select: { id: true } });
  console.log(`\n${rayonnage.length} combinaisons → « ${NOM_RAYONNAGE} », ${AXES_RAYONNAGE.length} questions : ${AXES_RAYONNAGE.map(([, n]) => n).join(" › ")}`);
  console.log(`${niveaux.length} combinaisons → « ${NOM_NIVEAU} » (option, hors catalogue), ${AXES_NIVEAU.length} questions`);
  console.log(`rayon : Rangements › Archivage${archivage ? "" : " (INTROUVABLE)"} · exemple : ${rayonnage[0].k.referenceBase} = ${JSON.stringify(rayonnage[0].lu.valeurs)}`);
  if (!archivage) return;
  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }

  const creerAxes = async (vitrineId, axes) => {
    for (const [i, [cle, nom, libelles]] of axes.entries()) {
      await prisma.choix.create({ data: { vitrineId, cle, nom, nature: "tarifaire", ordre: i, obligatoire: true,
        valeurs: { create: libelles.map((libelle, j) => ({ libelle, ordre: j })) } } });
    }
  };

  // 1. Le rayonnage : anciens axes retirés, cinq questions, combinaisons réécrites, rayon Archivage.
  await prisma.choix.deleteMany({ where: { vitrineId: v.id } });
  await creerAxes(v.id, AXES_RAYONNAGE);
  for (const { k, lu } of rayonnage) await prisma.combinaison.update({ where: { id: k.id }, data: { valeurs: lu.valeurs, empreinte: empreinteDe(lu.valeurs) } });
  await prisma.produitVitrine.update({ where: { id: v.id }, data: { nom: NOM_RAYONNAGE,
    sousCategories: { set: [{ id: archivage.id }] }, sousCategoriePrincipaleId: archivage.id } });

  // 2. Le niveau supplémentaire : fiche neuve, mêmes rayon et gamme, option du rayonnage.
  const neuve = await prisma.produitVitrine.create({ data: {
    nom: NOM_NIVEAU, slug: "niveau-supplementaire-archikit", gammeId: v.gammeId, publie: v.publie, venteSurDevis: false, accessoireSeul: true,
    descriptif: "Un niveau de plus pour un module Archikit : une tablette et ses deux traverses support, en galva, au choix ajourée ou pleine, à la longueur et à la profondeur du module.",
    categoriePrincipaleId: v.categoriePrincipaleId, sousCategoriePrincipaleId: archivage.id,
    categories: { connect: v.categories.map((c) => ({ id: c.id })) }, sousCategories: { connect: [{ id: archivage.id }] },
  } });
  await creerAxes(neuve.id, AXES_NIVEAU);
  for (const { k, lu } of niveaux) await prisma.combinaison.update({ where: { id: k.id }, data: { vitrineId: neuve.id, valeurs: lu.valeurs, empreinte: empreinteDe(lu.valeurs) } });
  await prisma.produitVitrine.update({ where: { id: v.id }, data: { optionsLiees: { connect: [{ id: neuve.id }] } } });
  console.log("\nÉcrit.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
