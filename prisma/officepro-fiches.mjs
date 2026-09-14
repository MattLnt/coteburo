// Propose le découpage du tarif OfficePro en fiches produit.
//
// Aucune écriture en base : le script lit prisma/officepro-tarif.json, applique
// prisma/officepro-correspondances.js et rend compte de ce qu'il ferait.
//
// Une fiche = une gamme du catalogue + un type de produit. « Arco » seul ne
// ferait pas une fiche : le client cherche « chauffeuse Arco », « pouf Arco ».
// À l'inverse, les cinq piétements d'une même chauffeuse sont cinq prix d'un
// même siège — ils deviennent un axe de déclinaison, pas cinq fiches.
//
//   node prisma/officepro-fiches.mjs
//   node prisma/officepro-fiches.mjs --detail Arco
import { readFile, writeFile } from "node:fs/promises";
import { ESPACES, EMPLACEMENTS_PAR_TYPE, GAMMES, TYPES, AXES } from "./officepro-correspondances.js";

const SOURCE = "prisma/officepro-tarif.json";
const SORTIE = "prisma/officepro-fiches.json";
const DETAIL = process.argv.includes("--detail") ? process.argv[process.argv.indexOf("--detail") + 1] : null;

const norm = (s) => (s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");
const joli = (s) => {
  const t = (s || "").toLowerCase().trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// Type de produit lu dans la désignation.
//
// Il n'est pas toujours en tête : le tarif écrit « CHAUFFEUSE ARCO » mais
// aussi « ARCO POUF AVEC STRUCTURE BLEUE ». On retient donc le type dont la
// position est la plus à gauche, et le plus long à position égale, pour que
// « CANAPÉ 2 PLACES » l'emporte sur « CANAPÉ ».
const typeDe = (designation) => {
  const d = norm(designation);
  let best = null, pos = Infinity;
  for (const t of TYPES) {
    const i = d.indexOf(norm(t));
    if (i < 0) continue;
    if (i < pos || (i === pos && norm(t).length > norm(best).length)) { pos = i; best = t; }
  }
  return best;
};

// Nom de la fiche : le type suivi de la gamme, sans répéter un mot que les
// deux portent — « Banquette Arco Banquette » et « Fauteuil lounge Arco
// Lounge » bégayaient.
const nomFiche = (type, gamme) => {
  // Le type s'écrit en minuscules, la gamme garde ses capitales : chaque mot
  // conserve la casse de sa source, et le premier gagne en cas de doublon.
  const mots = [...joli(type).split(/\s+/), ...gamme.split(/\s+/)];
  const vus = new Set();
  const gardes = [];
  for (const m of mots) {
    const k = norm(m);
    if (!k || vus.has(k)) continue;
    vus.add(k);
    gardes.push(m);
  }
  return gardes.join(" ");
};

// Valeurs d'axe lues dans la désignation.
const axesDe = (designation) => {
  const out = {};
  for (const a of AXES) {
    for (const m of a.motifs) {
      const r = m.exec(designation);
      if (r) { out[a.id] = (r[1] || r[0]).trim(); break; }
    }
  }
  return out;
};

async function main() {
  const lignes = JSON.parse(await readFile(SOURCE, "utf8"));

  // Libellé du tarif → gamme du catalogue.
  const versGamme = new Map();
  for (const g of GAMMES) for (const l of g.libelles) versGamme.set(norm(l), g);

  const retenues = [], ignorees = new Map();
  for (const l of lignes) {
    const g = versGamme.get(norm(l.gamme));
    if (g) retenues.push({ ...l, gammeCatalogue: g });
    else ignorees.set(l.gamme, (ignorees.get(l.gamme) || 0) + 1);
  }
  console.log(`${lignes.length} lignes au tarif · ${retenues.length} retenues · ${lignes.length - retenues.length} hors périmètre\n`);

  // Une fiche par gamme + type de produit.
  const fiches = new Map();
  const sansType = [];
  for (const l of retenues) {
    const type = typeDe(l.designation);
    if (!type) sansType.push(l);
    const cle = `${l.gammeCatalogue.nom} ‖ ${type || l.designation}`;
    if (!fiches.has(cle)) {
      fiches.set(cle, {
        gamme: l.gammeCatalogue.nom,
        surDevis: !!l.gammeCatalogue.surDevis,
        type: type || null,
        nom: type ? nomFiche(type, l.gammeCatalogue.nom) : joli(l.designation),
        espace: l.section,
        emplacement: (type && EMPLACEMENTS_PAR_TYPE[type]) || ESPACES[l.section] || null,
        pageCatalogue: l.pageCatalogue,
        lignes: [],
      });
    }
    fiches.get(cle).lignes.push(l);
  }

  // Axes et déclinaisons de chaque fiche.
  for (const f of fiches.values()) {
    const axes = {};
    f.declinaisons = f.lignes.map((l) => {
      const v = axesDe(l.designation);
      for (const [id, val] of Object.entries(v)) (axes[id] ??= new Set()).add(val);
      if (l.coloris) (axes.coloris ??= new Set()).add(l.coloris);
      return {
        valeurs: { ...v, ...(l.coloris ? { coloris: l.coloris } : {}) },
        referenceFournisseur: l.reference,
        prixTarifHT: l.prixPublicHT,
        prixMention: l.prixMention,
        ecoContribution: l.ecoValdelia,
        codeBarre: l.codeBarre,
      };
    });
    f.axes = Object.entries(axes).map(([id, vals]) => ({ id, valeurs: [...vals] }));
    f.prixMini = Math.min(...f.declinaisons.map((d) => d.prixTarifHT).filter((p) => p != null).concat(Infinity));
    if (!isFinite(f.prixMini)) f.prixMini = null;
    delete f.lignes;
  }

  const liste = [...fiches.values()];
  console.log(`${liste.length} fiches proposées\n`);

  const parGamme = new Map();
  for (const f of liste) (parGamme.get(f.gamme) ?? parGamme.set(f.gamme, []).get(f.gamme)).push(f);

  console.log("gamme".padEnd(20) + "fiches  réf.  devis  fiches proposées");
  for (const g of GAMMES) {
    const fs = parGamme.get(g.nom) || [];
    const n = fs.reduce((s, f) => s + f.declinaisons.length, 0);
    console.log(
      g.nom.padEnd(20) + String(fs.length).padStart(4) + String(n).padStart(6) +
      (g.surDevis ? "   oui " : "    -  ") + "  " + fs.map((f) => f.nom).join(" · ").slice(0, 90)
    );
  }

  const sansEmplacement = liste.filter((f) => !f.emplacement);
  if (sansEmplacement.length) console.log(`\n⚠ ${sansEmplacement.length} fiches sans emplacement : ${[...new Set(sansEmplacement.map((f) => f.espace))].join(", ")}`);
  if (sansType.length) {
    console.log(`\n⚠ ${sansType.length} lignes dont le type de produit n'a pas été reconnu — la fiche prend la désignation entière :`);
    for (const l of [...new Set(sansType.map((l) => l.designation))].slice(0, 12)) console.log(`   ${l.slice(0, 74)}`);
  }

  const multi = liste.filter((f) => f.axes.length > 1);
  console.log(`\n${multi.length} fiches à plusieurs axes, ${liste.length - multi.length} à un seul`);

  if (DETAIL) {
    const sel = liste.filter((f) => norm(f.gamme).includes(norm(DETAIL)));
    console.log(`\n── détail « ${DETAIL} » : ${sel.length} fiches`);
    for (const f of sel) {
      console.log(`\n   ${f.nom}${f.surDevis ? "  [sur devis]" : ""}`);
      console.log(`      ${f.espace} → ${f.emplacement ? `${f.emplacement.categorie}/${f.emplacement.sousCategorie}` : "?"} · page catalogue ${f.pageCatalogue ?? "?"} · dès ${f.prixMini ?? "?"} €`);
      for (const a of f.axes) console.log(`      axe ${a.id.padEnd(11)} ${a.valeurs.length} valeurs : ${a.valeurs.slice(0, 7).join(", ")}${a.valeurs.length > 7 ? " …" : ""}`);
      console.log(`      ${f.declinaisons.length} déclinaisons`);
      for (const d of f.declinaisons.slice(0, 4)) {
        console.log(`         ${String(d.referenceFournisseur).padEnd(13)} ${Object.values(d.valeurs).join(" / ").slice(0, 46).padEnd(48)} ${d.prixTarifHT ?? d.prixMention} € +${d.ecoContribution}`);
      }
      if (f.declinaisons.length > 4) console.log(`         … ${f.declinaisons.length - 4} autres`);
    }
  }

  await writeFile(SORTIE, JSON.stringify(liste, null, 2), "utf8");
  console.log(`\nÉcrit dans ${SORTIE} — aucune écriture en base.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
