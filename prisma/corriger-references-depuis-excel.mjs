// Rend à chaque combinaison la référence que le tarif lui donne.
//
//   node prisma/corriger-references-depuis-excel.mjs
//   node prisma/corriger-references-depuis-excel.mjs --marque buronomic
//   node prisma/corriger-references-depuis-excel.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// L'AVARIE
//   Beaucoup de fiches portent la MÊME référence de base sur toutes leurs
//   combinaisons, alors que le tarif en donne une par variante :
//
//     Colonne de rangement - Quiétude   AW713 ×4   170, 195, 205, 245 €
//     Bibliothèque ouverte - Quiétude   DR163 ×2   440, 485 €
//     Cube de rangement - Alto          EH073 ×2   125, 165 €
//     Chauffeuse tissu non feu - Arco   ARC01 ×5   un par piétement
//
//   Le client choisit la colonne de quatre cases à 245 € et la commande part
//   avec la référence de celle à deux cases, à 170 €. L'import avait pris la
//   PREMIÈRE référence de la table et l'avait appliquée à tout.
//
// LA SOURCE
//   Les fichiers catalogue-*.xlsx sont ceux dont le catalogue a été bâti.
//   Chaque ligne porte le nom de la fiche, la désignation du fournisseur, le
//   tarif, et les trois formes de la référence :
//
//     Réf. produit  AW71     Réf. finition  NOIR    Réf. complète  AW713G
//
//   La référence de base d'une combinaison, c'est donc le PRÉFIXE COMMUN aux
//   « Réf. complète » d'une même désignation — ce qui reste quand on retire
//   le jeton de finition. AW713G et AW713S donnent AW713 ; BH693A, BH693F,
//   BH693G, BH693N, BH693S, BH693Y donnent BH693.
//
//   Rien n'est déduit du PDF ni d'un ordre d'apparition : le fichier le dit.
//
// L'APPARIEMENT
//   Chaque combinaison rejoint sa désignation par son PRIX. Quand plusieurs
//   désignations partagent un prix, on départage par les réponses de la
//   combinaison — « 100 cm » contre une désignation qui dit L100. Et si le
//   doute persiste, on ne touche pas : une référence approximative est pire
//   qu'une référence fausse qu'on sait fausse.
import "dotenv/config";
import XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const APPLIQUER = args.includes("--appliquer");
const lire = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const FILTRE = lire("--marque");
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);

const SOURCES = {
  buronomic: "catalogue-2026/catalogue-buronomic.xlsx",
  sokoa: "catalogue-2026/catalogue-sokoa.xlsx",
  officepro: "catalogue-2026/catalogue-officepro.xlsx",
};

/** Le plus long préfixe commun d'une liste de chaînes. */
function prefixeCommun(liste) {
  if (!liste.length) return "";
  let i = 0;
  while (i < liste[0].length && liste.every((s) => s[i] === liste[0][i])) i++;
  return liste[0].slice(0, i);
}

/** Les mots significatifs d'un texte, pour comparer une désignation à des réponses. */
function mots(texte) {
  return new Set(String(texte || "").toUpperCase()
    .replace(/[^A-Z0-9,]+/g, " ").split(" ").filter((m) => m.length > 1));
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  // ── Ce que le tarif dit, fiche par fiche ─────────────────────────────
  const parFiche = new Map();          // nom → [ { designation, refBase, prix } ]
  const parRacine = new Map();         // référence de base → fiches du tarif
  for (const [marque, chemin] of Object.entries(SOURCES)) {
    if (FILTRE && marque !== FILTRE) continue;
    const wb = XLSX.readFile(chemin);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    // Regrouper par fiche + désignation : une désignation = un produit, et
    // ses lignes ne diffèrent que par la finition.
    const groupes = new Map();
    for (const r of rows) {
      const fiche = String(r["Nom sur le site"] || "").trim();
      const des = String(r["Désignation fournisseur"] || "").trim();
      const complete = String(r["Réf. complète"] || "").trim();
      const prix = Number(r["Tarif HT"]);
      if (!fiche || !des || !complete || !Number.isFinite(prix)) continue;
      const cle = `${fiche}\u0000${des}\u0000${prix}`;
      if (!groupes.has(cle)) groupes.set(cle, { fiche, des, prix, completes: [] });
      groupes.get(cle).completes.push(complete);
    }
    for (const g of groupes.values()) {
      const refBase = prefixeCommun(g.completes);
      if (!refBase) continue;
      if (!parFiche.has(g.fiche)) parFiche.set(g.fiche, []);
      parFiche.get(g.fiche).push({ designation: g.des, refBase, prix: g.prix, marque });
      // Un second index, par référence. Une fiche que j'ai renommée — ou que
      // le fournisseur nomme autrement que le site — ne se retrouve plus par
      // son nom. Sa référence, elle, n'a pas bougé.
      if (!parRacine.has(refBase)) parRacine.set(refBase, new Set());
      parRacine.get(refBase).add(g.fiche);
    }
  }
  console.log(`   ${parFiche.size} fiches décrites par les fichiers de tarif\n`);

  // ── Ce que la base porte ─────────────────────────────────────────────
  const vitrines = await prisma.produitVitrine.findMany({
    where: { publie: true },
    select: { id: true, nom: true,
      combinaisons: { select: { id: true, valeurs: true, referenceBase: true, prixTarifHT: true } } },
  });

  const plans = [];
  const ambigus = [];
  const inconnues = [];

  for (const v of vitrines) {
    let groupes = parFiche.get(v.nom);
    if (!groupes) {
      // Repli : quelle fiche du tarif porte la référence que celle-ci
      // utilise ? Une référence partagée par deux fiches ne dit pas laquelle,
      // et on s'abstient.
      const actuelle = v.combinaisons.map((k) => k.referenceBase).filter(Boolean)[0];
      const noms = actuelle ? parRacine.get(actuelle) : null;
      if (noms && noms.size === 1) groupes = parFiche.get([...noms][0]);
    }
    if (!groupes) continue;
    // Une fiche dont toutes les combinaisons ont déjà des références
    // distinctes n'a rien à corriger.
    const distinctes = new Set(v.combinaisons.map((k) => k.referenceBase).filter(Boolean));
    const prixDistincts = new Set(v.combinaisons.map((k) => k.prixTarifHT).filter((p) => p != null));
    if (distinctes.size >= Math.min(groupes.length, prixDistincts.size) && distinctes.size > 1) continue;

    // AFFECTATION BIJECTIVE. Plusieurs désignations partagent souvent un prix
    // — « MODULE RETOUR HAUT GAUCHE L100 » et « … DROIT L100 » valent tous
    // deux 695 €. Les apparier une par une au fil de l'eau donnait deux fois
    // la même référence. On traite donc chaque prix comme un lot : autant de
    // combinaisons que de désignations, et on marie les deux en préférant les
    // paires dont les mots concordent, chaque désignation ne servant qu'une
    // fois.
    const lignes = [];
    let doute = null;
    const parPrix = new Map();
    for (const k of v.combinaisons) {
      if (k.prixTarifHT == null) { doute = "une combinaison sans prix"; break; }
      const p2 = k.prixTarifHT.toFixed(2);
      if (!parPrix.has(p2)) parPrix.set(p2, []);
      parPrix.get(p2).push(k);
    }
    if (!doute) for (const [p2, ks] of parPrix) {
      const libres = groupes.filter((g) => g.prix.toFixed(2) === p2);
      if (!libres.length) { doute = `aucune désignation à ${p2} €`; break; }
      // Toutes les paires possibles, notées par la concordance des mots.
      const paires = [];
      for (const k of ks) {
        const reponses = mots(Object.values(k.valeurs || {}).join(" "));
        for (const g of libres) {
          const m = mots(g.designation);
          let n = 0;
          for (const w of reponses) if (m.has(w) || [...m].some((x) => x.includes(w))) n++;
          paires.push({ k, g, n });
        }
      }
      paires.sort((a, b) => b.n - a.n);
      const prisK = new Set(), prisG = new Set();
      for (const { k, g, n } of paires) {
        if (prisK.has(k.id) || prisG.has(g)) continue;
        prisK.add(k.id); prisG.add(g);
        lignes.push({ id: k.id, valeurs: k.valeurs, avant: k.referenceBase, apres: g.refBase,
          prix: k.prixTarifHT, designation: g.designation, concordance: n });
      }
      const orphelines = ks.filter((k) => !prisK.has(k.id));
      if (orphelines.length) { doute = `${orphelines.length} combinaisons sans désignation libre à ${p2} €`; break; }
    }
    if (doute) {
      (doute.startsWith("aucune") ? inconnues : ambigus).push({ v, doute });
      continue;
    }
    const change = lignes.filter((l) => l.avant !== l.apres);
    if (!change.length) continue;
    // Une même référence de base PEUT servir plusieurs prix, et c'est
    // fréquent : chez Quiétude, BJ013 couvre la poignée classique à 595 € et
    // la design à 600 €, parce que le type de poignée est un JETON qui vient
    // après la base — BJ013A C 1 contre BJ013A D 1. Interdire ce cas rejetait
    // quatorze fiches parfaitement corrigeables.
    //
    // Le vrai contrôle : la correction doit AUGMENTER le nombre de références
    // distinctes. Si elle n'en apporte aucune, elle ne répare rien et on ne
    // touche pas.
    const apresDistinctes = new Set(lignes.map((l) => l.apres));
    if (apresDistinctes.size <= distinctes.size) {
      ambigus.push({ v, doute: `aucune référence nouvelle (${apresDistinctes.size} contre ${distinctes.size})` });
      continue;
    }
    plans.push({ v, lignes, change });
  }

  plans.sort((a, b) => b.change.length - a.change.length);

  titre(`${plans.length} FICHES À CORRIGER`);
  for (const p of plans.slice(0, 40)) {
    console.log(`\n   ${p.v.nom}`);
    for (const l of p.lignes) {
      const marque = l.avant === l.apres ? "=" : " ";
      console.log(`      ${marque} ${String(l.avant).padEnd(10)} ${l.avant === l.apres ? "  " : "→ "}${String(l.apres).padEnd(10)} ${String(l.prix).padStart(5)} €  ${l.designation.slice(0, 46)}`);
    }
  }
  if (plans.length > 40) console.log(`\n   … et ${plans.length - 40} autres fiches`);

  if (ambigus.length) {
    titre(`${ambigus.length} FICHES AMBIGUËS — laissées telles quelles`);
    console.log("");
    for (const a of ambigus.slice(0, 25)) console.log(`   ${a.v.nom} — ${a.doute}`);
    if (ambigus.length > 25) console.log(`   … et ${ambigus.length - 25} autres`);
  }
  if (inconnues.length) {
    titre(`${inconnues.length} FICHES DONT UN PRIX N'EST PAS DANS LE FICHIER`);
    console.log("");
    for (const a of inconnues.slice(0, 20)) console.log(`   ${a.v.nom} — ${a.doute}`);
    if (inconnues.length > 20) console.log(`   … et ${inconnues.length - 20} autres`);
  }

  titre("LE COMPTE");
  console.log(`   ${plans.length} fiches · ${plans.reduce((n, p) => n + p.change.length, 0)} références corrigées`);
  console.log(`   ${ambigus.length} ambiguës · ${inconnues.length} avec un prix inconnu`);

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }

  for (const p of plans) {
    for (const l of p.change) {
      await prisma.combinaison.update({ where: { id: l.id }, data: { referenceBase: l.apres } });
    }
  }
  console.log("\nÉcrit.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
