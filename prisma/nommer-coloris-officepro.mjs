// Donne un vrai choix de coloris, avec pastilles, à cinq fiches OfficePro.
//
//   node prisma/nommer-coloris-officepro.mjs
//   node prisma/nommer-coloris-officepro.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// CE QUI ÉTAIT FAUX
//   L'import OfficePro a produit deux axes par fiche : un axe tarifaire
//   « Modèle » ou « Coloris de la coque » dont chaque valeur est une
//   référence (FAUTEUIL TECSY CONCEPT DESSINATEUR ASSISE BLEUE…), et un axe
//   « Finitions » de nature finition qui porte les couleurs mais n'est relié
//   à rien — ni jeton, ni rang. Le client choisissait la couleur sur des
//   boutons de texte, les pastilles restaient invisibles.
//
//   Sur le pouf Arco, l'axe tarifaire disait même faux : ARC07GR « NOIRE »,
//   ARC07JA « TERRACOTA », alors que le tarif imprime GRIS et BRONZE.
//
// LA FORME
//   Celle de Loops et de Khong : une combinaison sur la racine, un axe
//   « Coloris » de nature finition, rang 0, dont chaque valeur ajoute son
//   jeton et porte sa couleur. Les noms viennent de la colonne « coloris
//   dominant » du tarif ; les couleurs, de l'ancien axe Finitions quand il
//   les avait, sinon d'une table ici.
//
// LE FILET
//   Chaque référence reconstruite doit être imprimée dans le tarif à côté de
//   son nom de coloris. Le prix doit être le même pour tous les coloris.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const COULEURS = {
  "Noir": "#23262a", "Beige": "#d9cbb5", "Bleu paon": "#1f6f7a", "Taupe": "#837c72", "Gris clair": "#c9cbcd",
  "Blanc": "#f2f0ec", "Gris": "#9a9a94", "Bleu": "#2f5d9e", "Bronze": "#8a6a3f", "Vert": "#3f7a4f", "Bois": "#b98a5a",
};

// Par fiche : la racine, et pour chaque jeton le nom du tarif.
const FICHES = [
  { nom: "Fauteuil dessinateur - Tecsy", racine: "TCY03NR-", jetons: { NR: "Noir", BE: "Beige", BL: "Bleu paon", TA: "Taupe", GR: "Gris clair" },
    // TCY05NR-GR est le fauteuil Concept (345 €), pas le dessinateur : il part
    // d'ici, il est déjà sur sa fiche.
    egarees: ["TCY05NR-GR"], egareeSur: "Fauteuil Concept - Tecsy" },
  { nom: "Chaise Tecseat Learning - Tecseat", racine: "TSE05", jetons: { BLA: "Blanc", GR: "Gris", NR: "Noir" } },
  { nom: "Chaise Tecseat Meeting - Tecseat", racine: "TSE04", jetons: { BLA: "Blanc", GR: "Gris", NR: "Noir" } },
  { nom: "Pouf - Arco", racine: "ARC07", jetons: { BL: "Bleu", GR: "Gris", JA: "Bronze", VE: "Vert" } },
  { nom: "Table basse - Square", racine: "SQU01", jetons: { NR: "Noir", BLA: "Blanc", BS: "Bois" } },
];

async function tarif() {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync("catalogue-2026/TARIF GENERAL COMPLET OFFICEPRO SEATING 2026.pdf")), useSystemFonts: true }).promise;
  let t = "";
  for (let n = 1; n <= doc.numPages; n++) t += " " + (await doc.getPage(n).then((p) => p.getTextContent())).items.map((i) => i.str).join(" ").replace(/\s+/g, " ");
  return t.toUpperCase();
}

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  const texte = await tarif();

  for (const f of FICHES) {
    const v = await prisma.produitVitrine.findFirst({ where: { nom: f.nom },
      select: { id: true, choix: { select: { id: true, cle: true, nom: true, nature: true, valeurs: { select: { libelle: true, couleur: true } } } },
        combinaisons: { select: { id: true, referenceBase: true, prixTarifHT: true, pageCatalogue: true } } } });
    console.log(`\n${f.nom}`);
    if (!v) { console.log("   introuvable"); continue; }
    if (v.choix.some((c) => c.cle === "coloris")) { console.log("   déjà faite"); continue; }

    // Les combinaisons attendues : racine + jeton, toutes au même prix.
    const attendues = Object.keys(f.jetons).map((j) => f.racine + j);
    const egarees = f.egarees || [];
    const presentes = v.combinaisons.map((k) => k.referenceBase);
    const manquantes = attendues.filter((r) => !presentes.includes(r));
    const inconnues = presentes.filter((r) => !attendues.includes(r) && !egarees.includes(r));
    if (manquantes.length || inconnues.length) { console.log(`   ✗ combinaisons inattendues — manquantes : ${manquantes.join(", ") || "—"} · inconnues : ${inconnues.join(", ") || "—"}`); continue; }
    const gardees = v.combinaisons.filter((k) => attendues.includes(k.referenceBase));
    const prix = [...new Set(gardees.map((k) => k.prixTarifHT))];
    if (prix.length !== 1) { console.log(`   ✗ plusieurs prix : ${prix.join(", ")}`); continue; }
    if (egarees.length) {
      const autre = await prisma.produitVitrine.findFirst({ where: { nom: f.egareeSur }, select: { combinaisons: { select: { referenceBase: true } } } });
      const racines = new Set((autre?.combinaisons || []).map((k) => k.referenceBase.replace(/-$/, "")));
      const orphelines = egarees.filter((r) => ![...racines].some((rac) => r.startsWith(rac)));
      if (orphelines.length) { console.log(`   ✗ ${orphelines.join(", ")} n'a pas sa place sur « ${f.egareeSur} » — on ne touche à rien`); continue; }
    }
    // Le filet du tarif : le nom du coloris précède la référence.
    const faux = Object.entries(f.jetons).filter(([j, nomCol]) => !new RegExp(`${nomCol.toUpperCase()}\\s+(NEW\\s+)?${f.racine}${j}\\b`).test(texte) && !new RegExp(`${nomCol.toUpperCase()}\\s+${f.racine}${j}\\b`).test(texte));
    if (faux.length) { console.log(`   ✗ le tarif n'imprime pas : ${faux.map(([j, n]) => `${n} → ${f.racine}${j}`).join(", ")}`); continue; }

    // Les couleurs : l'ancien axe Finitions d'abord, la table ensuite.
    const anciennes = new Map();
    for (const c of v.choix) if (c.nature === "finition") for (const x of c.valeurs) if (x.couleur) anciennes.set(x.libelle.toUpperCase(), x.couleur);
    const valeurs = Object.entries(f.jetons).map(([jeton, libelle], i) => ({
      libelle, suffixeReference: jeton, ordre: i,
      couleur: anciennes.get(libelle.toUpperCase()) || anciennes.get(libelle.split(" ")[0].toUpperCase()) || COULEURS[libelle] || null,
    }));
    console.log(`   une combinaison ${f.racine} à ${prix[0]} € · axes retirés : ${v.choix.map((c) => `« ${c.nom} »`).join(", ")}${egarees.length ? ` · ${egarees.join(", ")} retirée` : ""}`);
    console.log(`   Coloris : ${valeurs.map((x) => `${x.libelle} [${x.suffixeReference}] ${x.couleur ?? "sans couleur"}`).join(" · ")}`);
    if (!APPLIQUER) continue;

    const garde = gardees[0];
    await prisma.$transaction([
      ...v.choix.map((c) => prisma.choix.delete({ where: { id: c.id } })),
      prisma.combinaison.deleteMany({ where: { vitrineId: v.id, id: { not: garde.id } } }),
      prisma.combinaison.update({ where: { id: garde.id }, data: { referenceBase: f.racine, valeurs: {}, empreinte: empreinteDe({}) } }),
      prisma.choix.create({ data: { vitrineId: v.id, cle: "coloris", nom: "Coloris", nature: "finition", rangReference: 0, obligatoire: true, ordre: 0,
        valeurs: { create: valeurs } } }),
    ]);
    console.log("   écrit");
  }
  if (!APPLIQUER) console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
