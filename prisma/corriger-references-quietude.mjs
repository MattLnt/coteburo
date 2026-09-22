// Rend à quatre fiches Quiétude les références que le tarif leur donne.
//
//   node prisma/corriger-references-quietude.mjs
//   node prisma/corriger-references-quietude.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Les quatre éléments de la page 241 — la structure, l'alcôve, les portes,
//   les poignées — portent en base UNE référence pour TOUTES leurs
//   combinaisons :
//
//     Rangement ouvert sans top     14 combinaisons, 14 prix   →  BH693 ×14
//     Kit de 2 portes battantes      8 combinaisons,  8 prix   →  EH783 ×8
//     Kit de 2 poignées              2 combinaisons,  2 prix   →  BA00  ×2
//     Alcôve                         2 combinaisons,  2 prix   →  DZ07  ×2
//
//   Aucune de ces fiches n'a de choix tarifaire porteur de jeton : la
//   référence ne peut donc jamais se différencier, et `assemblerReference`
//   rend la même chaîne quelle que soit la configuration. Un client qui
//   commande le rangement H 201 / L 100 à 535 € recevrait le H 69,5 / L 80
//   à 150 €.
//
//   C'est la même avarie que chez l'alcôve, vue en premier : la bascule vers
//   le modèle à combinaisons n'a gardé que la première référence de chaque
//   table. Ici on les rétablit toutes, depuis le tarif.
//
// CE QUE LE TARIF ÉCRIT
//   Page 238, bloc ① Structures — sept modèles × deux largeurs :
//     H 69,5  ouvert 1 tablette Structurex          BH693 / BH703
//     H 101,5 ouvert 2 tablettes Structurex         BH733 / BH743
//     H 101,5 ouvert 2 tablettes métal dossiers     BH753 / BH763
//     H 133,5 ouvert 3 tablettes Structurex         BH773 / BH783
//     H 133,5 ouvert 3 tablettes métal dossiers     BH793 / BH803
//     H 201   ouvert 4 tablettes Structurex         BH813 / BH823
//     H 201   ouvert 4 tablettes métal dossiers     BH833 / BH843
//
//   Page 239, bloc ③ Portes — quatre hauteurs × deux largeurs :
//     pour rangement H 72 et bibliothèque H 201     EH783 / EH823
//     pour rangement H 104                          EH793 / EH833
//     pour rangement H 136                          EH803 / EH843
//     pour rangement H 201                          EH813 / EH853
//
//   Page 239, bloc ④ Poignées :   classique BA00   ·   design DX21
//   Page 241, bloc ② Alcôve :     L 80 DZ07        ·   L 100 DZ08
//
// LE FILET
//   Chaque référence écrite est cherchée dans la page du tarif qui la donne.
//   S'il en manque une seule, le script n'écrit rien et le dit. On ne pose pas
//   une référence que le tarif ne confirme pas.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PDF = "catalogue-2026/catalogue_buronomic_2026_fr.pdf";
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);

// Chaque fiche : la page qui la donne, et la référence de chaque combinaison
// lue dans les valeurs de ses choix tarifaires.
const FICHES = [
  {
    nom: "Rangement ouvert sans top - Quiétude",
    page: 238,
    // modele + largeur suffisent : la hauteur est portée par le modèle.
    reference: (v) => {
      const L = v.largeur === "100 cm" ? 1 : 0;
      const paires = {
        "1 tablette mélaminé": ["BH693", "BH703"],
        "2 tablettes melamines": ["BH733", "BH743"],
        "2 tablettes métal": ["BH753", "BH763"],
        "3 tablettes melamines": ["BH773", "BH783"],
        "3 tablettes métal": ["BH793", "BH803"],
        "4 tablettes melamines": ["BH813", "BH823"],
        "4 tablettes métal": ["BH833", "BH843"],
      };
      const cle = Object.keys(paires).find((k) => (v.modele || "").includes(k));
      return cle ? paires[cle][L] : null;
    },
  },
  {
    nom: "Kit de 2 portes battantes - Quiétude",
    page: 239,
    reference: (v) => {
      const L = v.largeur === "100 cm" ? 1 : 0;
      const paires = {
        "72 cm": ["EH783", "EH823"],
        "104 cm": ["EH793", "EH833"],
        "136 cm": ["EH803", "EH843"],
        "201 cm": ["EH813", "EH853"],
      };
      return paires[v.hauteur]?.[L] ?? null;
    },
  },
  {
    nom: "Kit de 2 poignées - Quiétude",
    page: 239,
    reference: (v) => ((v.modele || "").includes("design") ? "DX21" : "BA00"),
  },
  {
    nom: "Alcôve - Quiétude",
    page: 241,
    reference: (v) => (v.largeur === "100 cm" ? "DZ08" : "DZ07"),
  },
];

async function textePage(doc, n) {
  const t = await (await doc.getPage(n)).getTextContent();
  return t.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim().toUpperCase();
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({
    data: new Uint8Array(readFileSync(PDF)), useSystemFonts: true,
  }).promise;

  // ── Le plan ─────────────────────────────────────────────────────────
  const plans = [];
  for (const f of FICHES) {
    const v = await prisma.produitVitrine.findFirst({
      where: { nom: f.nom },
      select: {
        id: true, nom: true,
        combinaisons: { select: { id: true, valeurs: true, referenceBase: true, prixTarifHT: true } },
      },
    });
    if (!v) { console.log(`   INTROUVABLE : ${f.nom}`); process.exitCode = 1; return; }
    const lignes = v.combinaisons.map((c) => ({
      id: c.id, valeurs: c.valeurs, avant: c.referenceBase,
      apres: f.reference(c.valeurs || {}), prix: c.prixTarifHT,
    }));
    plans.push({ f, v, lignes });
  }

  // ── Le filet : chaque référence doit être sur sa page ────────────────
  titre("VÉRIFICATION CONTRE LE TARIF");
  let manquantes = 0;
  for (const { f, lignes } of plans) {
    const texte = await textePage(doc, f.page);
    const voulues = [...new Set(lignes.map((l) => l.apres).filter(Boolean))].sort();
    const absentes = voulues.filter((r) => !texte.includes(r));
    console.log(`   page ${f.page}  ${String(voulues.length).padStart(2)} références  ${f.nom}`);
    for (const a of absentes) { console.log(`      ABSENTE DE LA PAGE : ${a}`); manquantes++; }
    const sansRef = lignes.filter((l) => !l.apres);
    for (const l of sansRef) {
      console.log(`      AUCUNE RÈGLE POUR : ${JSON.stringify(l.valeurs)}`);
      manquantes++;
    }
  }
  if (manquantes) {
    titre(`${manquantes} ANOMALIES — RIEN NE SERA ÉCRIT`);
    process.exitCode = 1;
    return;
  }

  // ── Ce qui change ───────────────────────────────────────────────────
  titre("CE QUI CHANGE");
  let corrigees = 0, inchangees = 0;
  for (const { f, lignes } of plans) {
    console.log(`\n   ${f.nom}`);
    for (const l of lignes.sort((a, b) => (a.apres || "").localeCompare(b.apres || ""))) {
      const decrit = Object.values(l.valeurs || {}).join(" · ");
      if (l.avant === l.apres) { inchangees++; console.log(`      = ${l.apres}  ${decrit}`); continue; }
      corrigees++;
      console.log(`      ${l.avant} → ${l.apres}  ${String(l.prix).padStart(4)} €  ${decrit}`);
    }
  }

  // ── L'écriture ──────────────────────────────────────────────────────
  if (APPLIQUER) {
    for (const { lignes } of plans) {
      for (const l of lignes) {
        if (l.avant === l.apres) continue;
        await prisma.combinaison.update({ where: { id: l.id }, data: { referenceBase: l.apres } });
      }
    }
  }

  titre("LE COMPTE");
  console.log(`   ${corrigees} références corrigées · ${inchangees} déjà justes`);
  console.log(APPLIQUER
    ? "\nÉcrit."
    : "\nSimulation terminée. Relancer avec --appliquer pour écrire.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
