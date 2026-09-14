// Renomme les packshots Sokoa d'après le classeur rempli par
// sokoa-lister-packshots.mjs.
//
// « ADELA_ALA00.jpg » + couleur « Gris perle » → « ADELA_ALA00__Gris-perle.jpg ».
//
// Le double underscore sépare le nom d'origine du libellé. Il est retenu parce
// que le nombre de segments varie de 1 à 6 d'un fichier Sokoa à l'autre : une
// règle du type « dernier segment » prendrait « WSF » ou « 1 » sur certains
// noms. Aucun des 865 fichiers n'en contenait, il n'y a donc pas d'ambiguïté.
//
// Le début du nom n'est jamais touché : prisma/import-photos-sokoa.mjs
// rattache les photos aux produits en cherchant des fragments de code
// (« ALA00 », « AK76050 ») en sous-chaîne. Le renommer casserait ce lien.
//
//   node prisma/sokoa-renommer.mjs              simulation
//   node prisma/sokoa-renommer.mjs --appliquer  pour de vrai
import { rename, access, writeFile } from "node:fs/promises";
import { join, extname, basename, dirname } from "node:path";
import ExcelJS from "exceljs";

const SOURCE = process.argv.find((a) => a.endsWith(".xlsx")) || "prisma/sokoa-packshots.xlsx";
const APPLIQUER = process.argv.includes("--appliquer");
const JOURNAL = "prisma/sokoa-renommage.json";

// Windows refuse ces caractères ; l'espace devient tiret, la galerie le
// retransforme en espace à l'affichage.
const nettoyerCouleur = (s) =>
  String(s ?? "")
    .trim()
    // Tiret plutôt que suppression : « Gris/perle » doit donner « Gris-perle »
    // et non « Grisperle ». L'underscore y passe aussi, il casserait la règle
    // du double séparateur.
    .replace(/[<>:"/\\|?*_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const existe = async (p) => { try { await access(p); return true; } catch { return false; } };

// Une cellule ExcelJS peut porter un texte, une formule, ou du texte riche.
const texte = (cel) => {
  const v = cel?.value;
  if (v == null) return "";
  if (typeof v === "object") {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("");
    if (v.text != null) return String(v.text);
    if (v.result != null) return String(v.result);
    return "";
  }
  return String(v);
};

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION — aucun fichier renommé ═══\n");

  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.readFile(SOURCE);
  const feuille = classeur.worksheets[0];

  // Les colonnes sont retrouvées par leur en-tête : trier ou déplacer une
  // colonne dans Excel ne doit pas casser la lecture.
  const entetes = {};
  feuille.getRow(1).eachCell((cel, i) => { entetes[texte(cel).trim().toLowerCase()] = i; });
  for (const c of ["fichier", "couleur", "chemin"]) {
    if (!entetes[c]) { console.log(`Colonne « ${c} » introuvable dans ${SOURCE}.`); return; }
  }

  const aFaire = [];
  const ignorees = [];
  const problemes = [];
  const cibles = new Set();
  const sources = new Map();

  for (let n = 2; n <= feuille.rowCount; n++) {
    const ligne = feuille.getRow(n);
    const chemin = texte(ligne.getCell(entetes.chemin)).trim();
    const fichier = texte(ligne.getCell(entetes.fichier)).trim();
    const brute = texte(ligne.getCell(entetes.couleur));
    if (!chemin && !fichier) continue;

    // Vide : la ligne est volontairement écartée.
    if (!brute.trim()) { ignorees.push(fichier || chemin); continue; }

    const couleur = nettoyerCouleur(brute);
    if (!couleur) { problemes.push(`ligne ${n} : couleur « ${brute} » vide après nettoyage`); continue; }

    const base = basename(chemin, extname(chemin));
    const ext = extname(chemin);
    if (base.includes("__")) { problemes.push(`ligne ${n} : ${basename(chemin)} porte déjà un suffixe`); continue; }
    if (!(await existe(chemin))) { problemes.push(`ligne ${n} : ${chemin} introuvable`); continue; }
    // Deux lignes sur le même fichier : la seconde échouerait, la source ayant
    // déjà changé de nom. Mieux vaut le dire que de le laisser arriver.
    const cleSource = chemin.toLowerCase();
    if (sources.has(cleSource)) { problemes.push(`ligne ${n} : ${basename(chemin)} déjà renommé ligne ${sources.get(cleSource)}`); continue; }
    sources.set(cleSource, n);

    const cible = join(dirname(chemin), `${base}__${couleur}${ext}`).replace(/\\/g, "/");
    if (cibles.has(cible.toLowerCase())) { problemes.push(`ligne ${n} : ${basename(cible)} en double dans le classeur`); continue; }
    if (await existe(cible)) { problemes.push(`ligne ${n} : ${basename(cible)} existe déjà sur le disque`); continue; }
    cibles.add(cible.toLowerCase());

    aFaire.push({ source: chemin, cible, avant: basename(chemin), apres: basename(cible), couleurBrute: brute.trim(), couleur });
  }

  console.log(`${aFaire.length} à renommer · ${ignorees.length} laissées vides · ${problemes.length} problèmes\n`);

  for (const r of aFaire.slice(0, 12)) console.log(`   ${r.avant}\n      → ${r.apres}`);
  if (aFaire.length > 12) console.log(`   … ${aFaire.length - 12} autres`);

  if (problemes.length) {
    console.log("\nProblèmes — ces lignes ne seront pas traitées :");
    problemes.slice(0, 20).forEach((p) => console.log(`   ✗ ${p}`));
    if (problemes.length > 20) console.log(`   … ${problemes.length - 20} autres`);
  }

  // Couleurs distinctes : une coquille se repère mieux dans cette liste que
  // ligne à ligne.
  const parCouleur = {};
  for (const r of aFaire) parCouleur[r.couleur] = (parCouleur[r.couleur] || 0) + 1;
  console.log(`\n${Object.keys(parCouleur).length} couleurs distinctes :`);
  console.log("   " + Object.entries(parCouleur).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} (${n})`).join(" · "));

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer.");
    return;
  }
  if (!aFaire.length) { console.log("\nRien à faire."); return; }

  // Journal écrit avant d'agir : il permet de revenir en arrière.
  await writeFile(JOURNAL, JSON.stringify({ date: new Date().toISOString(), renommages: aFaire }, null, 2), "utf8");
  console.log(`\nJournal : ${JOURNAL}`);

  let ok = 0, ko = 0;
  for (const r of aFaire) {
    try { await rename(r.source, r.cible); ok++; }
    catch (e) { ko++; console.log(`   ✗ ${r.avant} : ${e.message}`); }
  }
  console.log(`\n${ok} renommés · ${ko} échecs`);
}

main().catch((e) => { console.error(e); process.exit(1); });
