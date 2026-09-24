// Donne au fauteuil Wave un choix de coloris à pastilles.
//
//   node prisma/nommer-coloris-wave.mjs
//   node prisma/nommer-coloris-wave.mjs --appliquer
//
// Le tarif OfficePro vend trois fauteuils Wave à 375 € : structure grise en
// bleu ciel (WAV01GRBL) ou gris clair (WAV01GRGR), structure noire en gris
// anthracite (WAV01NRGR). La fiche posait « Modèle » pour la structure puis
// un axe de finition dont le jeton s'ajoutait à une référence déjà complète
// (WAV01NRGR + GR). Une question, trois coloris, chacun dit sa structure.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const RACINE = "WAV01";
const COLORIS = [
  { libelle: "Bleu ciel, structure grise", jeton: "GRBL", couleur: "#9dc3e6", tarif: "BLEU CIEL WAV01GRBL" },
  { libelle: "Gris clair, structure grise", jeton: "GRGR", couleur: "#c9cbcd", tarif: "GRIS CLAIR WAV01GRGR" },
  { libelle: "Gris anthracite, structure noire", jeton: "NRGR", couleur: "#3f4245", tarif: "GRIS ANTHRACITE WAV01NRGR" },
];

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync("catalogue-2026/TARIF GENERAL COMPLET OFFICEPRO SEATING 2026.pdf")), useSystemFonts: true }).promise;
  let texte = ""; for (let n = 1; n <= doc.numPages; n++) texte += " " + (await doc.getPage(n).then((p) => p.getTextContent())).items.map((i) => i.str).join(" ").replace(/\s+/g, " ");
  const absents = COLORIS.filter((c) => !texte.includes(c.tarif));
  if (absents.length) { console.log(`✗ le tarif n'imprime pas : ${absents.map((c) => c.tarif).join(", ")}`); return; }

  const v = await prisma.produitVitrine.findFirst({ where: { nom: "Fauteuil - Wave" },
    select: { id: true, choix: { select: { id: true, cle: true, nom: true } }, combinaisons: { select: { id: true, referenceBase: true, prixTarifHT: true } } } });
  if (!v) { console.log("introuvable"); return; }
  if (v.choix.some((c) => c.cle === "coloris")) { console.log("déjà faite"); return; }
  const prix = [...new Set(v.combinaisons.map((k) => k.prixTarifHT))];
  if (prix.length !== 1) { console.log(`✗ plusieurs prix : ${prix.join(", ")}`); return; }
  console.log(`une combinaison ${RACINE} à ${prix[0]} € (au lieu de ${v.combinaisons.map((k) => k.referenceBase).join(", ")}) · axes retirés : ${v.choix.map((c) => `« ${c.nom} »`).join(", ")}`);
  console.log(`Coloris : ${COLORIS.map((c) => `${c.libelle} → ${RACINE}${c.jeton}`).join(" · ")}`);
  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }
  const garde = v.combinaisons[0];
  await prisma.$transaction([
    ...v.choix.map((c) => prisma.choix.delete({ where: { id: c.id } })),
    prisma.combinaison.deleteMany({ where: { vitrineId: v.id, id: { not: garde.id } } }),
    prisma.combinaison.update({ where: { id: garde.id }, data: { referenceBase: RACINE, valeurs: {}, empreinte: empreinteDe({}) } }),
    prisma.choix.create({ data: { vitrineId: v.id, cle: "coloris", nom: "Coloris", nature: "finition", rangReference: 0, obligatoire: true, ordre: 0,
      valeurs: { create: COLORIS.map((c, i) => ({ libelle: c.libelle, suffixeReference: c.jeton, couleur: c.couleur, ordre: i })) } } }),
  ]);
  console.log("écrit");
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
