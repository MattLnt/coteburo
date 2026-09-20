// Que peut-on tirer, de façon FIABLE, des images Sokoa et OfficePro ?
//
// Lecture seule, aucune copie. Le rattachement par référence dans le nom du
// fichier n'a couvert que 31 fiches sur 316 : il faut savoir ce que portent
// vraiment les 3 000 images restantes avant d'inventer une méthode.
//
//   node analyse-medias-sokoa-officepro.mjs
//   node analyse-medias-sokoa-officepro.mjs --exemples
//
// Ce que le script mesure, règle par règle, plutôt que de le supposer :
//   1. le CHEMIN désigne-t-il une gamme du catalogue ?
//   2. le nom de fichier contient-il une référence, même abrégée ?
//   3. le chemin ou le nom désigne-t-il un coloris connu du catalogue ?
//   4. que reste-t-il qu'on ne sache pas lire ?
//
// Chaque règle est chiffrée séparément, et le rapport dit combien de fiches
// elle couvrirait et avec quelle certitude.
import { readdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import XLSX from "xlsx";

const MEDIAS = ["C:", "Users", "akeys", "Desktop", "Matt", "COTEBURO-MEDIAS"].join("/");
const CLASSEUR = "catalogue-2026/catalogue-coteburo.xlsx";
const IMAGES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);
const EXEMPLES = process.argv.includes("--exemples");

// Les sources qui appartiennent à Sokoa ou à OfficePro. Le reste du dossier
// médias est Buronomic, traité par le configurateur.
const SOURCES = {
  resourcesLENIVET: "officepro",
  Sokoa: "sokoa",
  fichiers_sokoa: "sokoa",
  "fichiers_sokoa (1)": "sokoa",
};

const titre = (t) => console.log(`\n${"═".repeat(70)}\n${t}\n${"═".repeat(70)}`);
const nu = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const sansAccent = (s) => String(s || "").normalize("NFD")
  .replace(/[̀-ͯ]/g, "").toUpperCase();

async function parcourir(dossier, base = "") {
  const out = [];
  let entrees;
  try {
    entrees = await readdir(join(dossier, base), { withFileTypes: true });
  } catch { return out; }
  for (const e of entrees) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (rel === "CATALOGUE-2026") continue;
      out.push(...await parcourir(dossier, rel));
    } else out.push(rel);
  }
  return out;
}

function catalogue() {
  const wb = XLSX.readFile(CLASSEUR);
  const fiches = new Map();       // « marque|gamme|nom » → { refs, racines }
  const gammes = new Map();       // gamme nue → { marque, nom, fiches: Set }
  const coloris = new Map();      // coloris nu → Set(marques)
  const refs = new Map();         // réf. nue → clé de fiche
  const racines = new Map();      // racine nue → Set(clés)

  for (const [onglet, marque] of [["SOKOA", "sokoa"], ["OFFICEPRO", "officepro"]]) {
    for (const r of XLSX.utils.sheet_to_json(wb.Sheets[onglet], { defval: null })) {
      const cle = `${marque}|${r.Gamme}|${r["Nom sur le site"]}`;
      if (!fiches.has(cle)) fiches.set(cle, { marque, gamme: r.Gamme, nom: r["Nom sur le site"] });
      const g = nu(r.Gamme);
      if (!gammes.has(g)) gammes.set(g, { marque, nom: r.Gamme, fiches: new Set() });
      gammes.get(g).fiches.add(cle);

      const rc = nu(r["Réf. complète"]);
      const rp = nu(r["Réf. produit"]);
      if (rc && rc.length >= 3 && !refs.has(rc)) refs.set(rc, cle);
      if (rp && rp.length >= 3) {
        if (!racines.has(rp)) racines.set(rp, new Set());
        racines.get(rp).add(cle);
      }
      const f = String(r["Réf. finition"] ?? "").trim();
      if (f && f !== "€") {
        const k = nu(f);
        if (k) {
          if (!coloris.has(k)) coloris.set(k, new Set());
          coloris.get(k).add(marque);
        }
      }
    }
  }
  return { fiches, gammes, coloris, refs, racines };
}

/** Le plus long préfixe commun, en caractères. */
function tronc(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}

async function main() {
  const cat = catalogue();
  const parMarque = { sokoa: 0, officepro: 0 };
  for (const f of cat.fiches.values()) parMarque[f.marque] += 1;
  console.log(`catalogue : ${cat.fiches.size} fiches `
    + `(sokoa ${parMarque.sokoa}, officepro ${parMarque.officepro}) · `
    + `${cat.gammes.size} gammes · ${cat.refs.size} réf. complètes · `
    + `${cat.racines.size} racines · ${cat.coloris.size} coloris`);

  const tous = await parcourir(MEDIAS);
  const images = tous.filter((f) => IMAGES.has(extname(f).toLowerCase()));
  const aNous = images.filter((f) => SOURCES[f.slice(0, f.indexOf("/"))]);

  // Ce qui a déjà été rattaché par la référence dans le nom du fichier :
  // on retire ces images, elles sont déjà rangées.
  const dejaRange = new Set();
  const jetons = (nom) => {
    const s = nom.replace(/\.[^.]+$/, "");
    const m = s.split(/[\s_\-.()[\]]+/).filter(Boolean);
    const out = new Set(m);
    for (let i = 0; i + 1 < m.length; i += 1) out.add(m[i] + m[i + 1]);
    out.add(s);
    return [...out];
  };
  for (const f of aNous) {
    for (const j of jetons(basename(f))) {
      const n = nu(j);
      if (n.length >= 3 && (cat.refs.has(n) || cat.racines.has(n))) { dejaRange.add(f); break; }
    }
  }
  const restantes = aNous.filter((f) => !dejaRange.has(f));

  titre("CE QUI RESTE À RATTACHER");
  console.log(`\n   images Sokoa et OfficePro        ${String(aNous.length).padStart(6)}`);
  console.log(`   déjà rattachées par référence    ${String(dejaRange.size).padStart(6)}`);
  console.log(`   ───────────────────────────────────────`);
  console.log(`   restantes                        ${String(restantes.length).padStart(6)}`);

  const parSource = new Map();
  for (const f of restantes) {
    const s = f.slice(0, f.indexOf("/"));
    if (!parSource.has(s)) parSource.set(s, { n: 0, marque: SOURCES[s] });
    parSource.get(s).n += 1;
  }
  console.log("\n   source                         marque        images");
  for (const [s, e] of [...parSource].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`   ${s.slice(0, 28).padEnd(29)} ${e.marque.padEnd(12)} ${String(e.n).padStart(6)}`);
  }

  // ── Règle 1 : le chemin nomme-t-il une gamme ? ──
  titre("RÈGLE 1 — LA GAMME, LUE DANS LE CHEMIN");
  const gammeDe = (f) => {
    // On teste chaque segment du chemin, du plus profond au plus large :
    // « fichiers_sokoa/ADELA/x.jpg » comme « arco dossier/ARCO CHIC/x.jpg ».
    const segments = f.split("/").slice(0, -1).reverse();
    for (const seg of segments) {
      const n = nu(seg);
      if (n.length < 3) continue;
      if (cat.gammes.has(n)) return { gamme: n, via: "segment exact" };
      // « arco dossier » → ARCODOSSIER contient ARCO
      for (const [g, info] of cat.gammes) {
        if (g.length >= 4 && n.startsWith(g)
            && SOURCES[f.slice(0, f.indexOf("/"))] === info.marque) {
          return { gamme: g, via: "segment préfixé" };
        }
      }
    }
    return null;
  };

  const parGamme = new Map();
  let sansGamme = 0;
  const viaCompte = new Map();
  for (const f of restantes) {
    const g = gammeDe(f);
    if (!g) { sansGamme += 1; continue; }
    viaCompte.set(g.via, (viaCompte.get(g.via) || 0) + 1);
    if (!parGamme.has(g.gamme)) parGamme.set(g.gamme, []);
    parGamme.get(g.gamme).push(f);
  }
  const avecGamme = restantes.length - sansGamme;
  console.log(`\n   images dont le chemin nomme une gamme du catalogue  ${String(avecGamme).padStart(5)}`
    + `  (${Math.round(avecGamme / restantes.length * 100)} %)`);
  for (const [via, n] of viaCompte) console.log(`      dont par ${via.padEnd(18)} ${String(n).padStart(5)}`);
  console.log(`   images dont aucun segment ne nomme une gamme        ${String(sansGamme).padStart(5)}`);

  const fichesVisees = new Set();
  for (const g of parGamme.keys()) for (const c of cat.gammes.get(g).fiches) fichesVisees.add(c);
  console.log(`\n   ces images concernent ${parGamme.size} gammes, soit ${fichesVisees.size} fiches`);
  console.log("   ⚠ une gamme ne désigne PAS une fiche : il faut encore trancher entre");
  console.log(`     ses fiches — en moyenne ${(fichesVisees.size / parGamme.size).toFixed(1)} par gamme.`);

  const gTries = [...parGamme].sort((a, b) => b[1].length - a[1].length);
  console.log("\n   les dix gammes les mieux pourvues :");
  for (const [g, liste] of gTries.slice(0, 10)) {
    const info = cat.gammes.get(g);
    console.log(`      ${info.nom.padEnd(22)} ${String(liste.length).padStart(4)} images  `
      + `${String(info.fiches.size).padStart(2)} fiches`);
  }

  // ── Règle 2 : une référence abrégée dans le nom ? ──
  titre("RÈGLE 2 — UNE RÉFÉRENCE ABRÉGÉE DANS LE NOM");
  console.log("\n   Sokoa nomme « ADELA_ALA00.jpg » quand le catalogue écrit");
  console.log("   « ALA0/4N ». Les deux ne sont égaux ni en entier ni en préfixe :");
  console.log("   ils partagent un TRONC. On mesure ici ce que vaut ce tronc.\n");

  const troncs = new Map();   // longueur de tronc → nombre d'images
  const parTronc = new Map(); // image → meilleure correspondance
  let rejetesGamme = 0;
  for (const f of restantes) {
    let meilleur = null;
    for (const j of jetons(basename(f))) {
      const n = nu(j);
      if (n.length < 4) continue;
      // Un nom de gamme n'est pas une référence. « HEAVY » partage quatre
      // caractères avec la racine « HEAV01 » : sans ce garde-fou, les
      // quatorze images d'ambiance Heavy passaient pour des références et
      // allaient toutes sur la même fiche.
      if (cat.gammes.has(n) || [...cat.gammes.keys()].some((g) =>
        g.length >= 4 && (g.startsWith(n) || n.startsWith(g)))) {
        rejetesGamme += 1;
        continue;
      }
      // Une référence porte des chiffres ET des lettres. « TISSU », « NOIR »,
      // « PHOTOS » n'en sont pas.
      if (!/\d/.test(n) || !/[A-Z]/.test(n)) continue;
      for (const [racine, cles] of cat.racines) {
        const t = tronc(n, racine);
        // Un tronc doit couvrir l'essentiel des DEUX chaînes, sinon
        // « ALA00 » s'apparierait à « ALB0/4 » sur les trois premiers
        // caractères.
        if (t >= 4 && t >= racine.length - 2 && t >= n.length - 2) {
          if (!meilleur || t > meilleur.t) meilleur = { t, racine, cles };
        }
      }
    }
    if (meilleur) {
      troncs.set(meilleur.t, (troncs.get(meilleur.t) || 0) + 1);
      parTronc.set(f, meilleur);
    }
  }
  console.log(`   jetons écartés parce qu'ils nomment la gamme  ${String(rejetesGamme).padStart(5)}`);
  console.log(`   images portant un tronc de référence  ${String(parTronc.size).padStart(5)}`
    + `  (${Math.round(parTronc.size / restantes.length * 100)} %)`);
  console.log("   par longueur de tronc :");
  for (const [t, n] of [...troncs].sort((a, b) => b[0] - a[0])) {
    console.log(`      ${t} caractères ${String(n).padStart(5)}`);
  }
  const uniques = [...parTronc.values()].filter((m) => m.cles.size === 1).length;
  console.log(`\n   dont le tronc ne désigne QU'UNE fiche  ${String(uniques).padStart(5)}`);
  console.log(`   dont il en désigne plusieurs           ${String(parTronc.size - uniques).padStart(5)}`);

  // ── Règle 3 : un coloris connu ? ──
  titre("RÈGLE 3 — UN COLORIS DU CATALOGUE");
  let avecColoris = 0;
  const colorisVus = new Map();
  for (const f of restantes) {
    const texte = sansAccent(f);
    let trouve = null;
    for (const [c] of cat.coloris) {
      if (c.length < 4) continue;
      if (nu(texte).includes(c)) { trouve = c; break; }
    }
    if (trouve) {
      avecColoris += 1;
      colorisVus.set(trouve, (colorisVus.get(trouve) || 0) + 1);
    }
  }
  console.log(`\n   images dont le chemin ou le nom cite un coloris du catalogue  `
    + `${String(avecColoris).padStart(5)}  (${Math.round(avecColoris / restantes.length * 100)} %)`);
  console.log("   les plus fréquents :");
  for (const [c, n] of [...colorisVus].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`      ${c.padEnd(24)} ${String(n).padStart(5)}`);
  }

  // ── Règle 4 : ce qu'on sait du TYPE de produit ──
  titre("RÈGLE 4 — LE TYPE DE PRODUIT, ET CE QUI N'EST PAS UN PRODUIT");
  const MOTS = {
    ambiance: /\bAMB\b|AMBIANCE|BODEGON|OPENSPACE|OPEN SPACE|COWORKING|SALLE/i,
    detail: /\bZOOM\b|DETAIL|DÉTAIL|ACCROCHE|\bDET\b/i,
    schema: /SCHEMA|SCHÉMA|\bFT\b|TECHNIQUE|COTE|PLAN\b/i,
    detoure: /DETOUR|DÉTOUR|\bHD\d|\bST\b|PACKSHOT/i,
  };
  const classe = new Map();
  for (const f of restantes) {
    let mis = false;
    for (const [nom, motif] of Object.entries(MOTS)) {
      if (motif.test(f)) { classe.set(nom, (classe.get(nom) || 0) + 1); mis = true; break; }
    }
    if (!mis) classe.set("(indéterminé)", (classe.get("(indéterminé)") || 0) + 1);
  }
  console.log("");
  for (const [k, n] of [...classe].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${k.padEnd(16)} ${String(n).padStart(5)}  (${Math.round(n / restantes.length * 100)} %)`);
  }

  // ── Synthèse : ce que chaque règle couvrirait ──
  titre("CE QUE CHAQUE RÈGLE COUVRIRAIT, ET AVEC QUELLE CERTITUDE");
  const fichesParRegle = {
    "réf. exacte (déjà fait)": new Set(),
    "tronc de référence, sans ambiguïté": new Set(),
    "tronc de référence, ambigu": new Set(),
    "gamme seule": fichesVisees,
  };
  for (const f of aNous) {
    if (!dejaRange.has(f)) continue;
    for (const j of jetons(basename(f))) {
      const n = nu(j);
      if (cat.refs.has(n)) { fichesParRegle["réf. exacte (déjà fait)"].add(cat.refs.get(n)); break; }
      if (cat.racines.has(n)) {
        for (const c of cat.racines.get(n)) fichesParRegle["réf. exacte (déjà fait)"].add(c);
        break;
      }
    }
  }
  for (const m of parTronc.values()) {
    const ou = m.cles.size === 1 ? "tronc de référence, sans ambiguïté" : "tronc de référence, ambigu";
    for (const c of m.cles) fichesParRegle[ou].add(c);
  }
  console.log("\n   règle                                 fiches visées   certitude");
  const certitude = {
    "réf. exacte (déjà fait)": "sûre",
    "tronc de référence, sans ambiguïté": "forte",
    "tronc de référence, ambigu": "à arbitrer",
    "gamme seule": "insuffisante seule",
  };
  for (const [k, s] of Object.entries(fichesParRegle)) {
    console.log(`   ${k.padEnd(38)}${String(s.size).padStart(8)}   ${certitude[k]}`);
  }
  const sures = new Set([...fichesParRegle["réf. exacte (déjà fait)"],
    ...fichesParRegle["tronc de référence, sans ambiguïté"]]);
  console.log(`\n   cumul des règles SÛRES : ${sures.size} fiches sur ${cat.fiches.size}`);

  // ── La liste à relire : les troncs courts, groupés par gamme ──
  if (process.argv.includes("--troncs4")) {
    const courts = [...parTronc].filter(([, m]) => m.t === 4);
    const parG = new Map();
    for (const [f, m] of courts) {
      const g = gammeDe(f);
      const cle = g ? cat.gammes.get(g.gamme).nom : "(gamme inconnue)";
      const marque = SOURCES[f.slice(0, f.indexOf("/"))];
      const k = `${marque}|${cle}`;
      if (!parG.has(k)) parG.set(k, []);
      parG.get(k).push({ f, m });
    }

    const md = ["# Troncs de 4 caractères, à trancher", "",
      `${courts.length} images dont le nom partage exactement quatre caractères`,
      "avec une racine du catalogue. C'est assez pour beaucoup de références",
      "Sokoa, trop peu pour être sûr : quatre caractères se partagent vite.",
      "",
      "Pour chaque ligne : le nom du fichier, le jeton qu'on y a lu, la racine",
      "du catalogue retenue, et la fiche visée. Coche ce qui est juste.",
      "",
      "Les cas à regarder en premier sont ceux où le jeton et la racine",
      "divergent après le quatrième caractère — c'est là que le doute est réel.",
      "",
      `Attention : ${courts.length} lignes pour `
      + `${new Set(courts.map(([f]) => basename(f))).size} noms de fichier distincts. `
      + "Le même visuel",
      "existe dans deux arborescences sources — `fichiers_sokoa/ADELA_BD/` et",
      "`Sokoa/fichiers_sokoa/ADELA/`. Une seule copie sera faite ; trancher une",
      "ligne vaut pour son doublon.",
      ""];

    for (const [k, liste] of [...parG].sort()) {
      const [marque, gamme] = k.split("|");
      md.push(`## ${marque} · ${gamme} — ${liste.length} image(s)`, "");
      md.push("| ✓ | fichier | jeton lu | racine | fiche visée |");
      md.push("|---|---|---|---|---|");
      for (const { f, m } of liste.sort((a, b) => basename(a.f).localeCompare(basename(b.f)))) {
        const fiche = m.cles.size === 1
          ? [...m.cles][0].split("|")[2]
          : `⚠ ${m.cles.size} fiches : ${[...m.cles].map((c) => c.split("|")[2]).join(" / ")}`;
        // Le jeton qui a produit le tronc, pour que la divergence soit visible.
        const jeton = jetons(basename(f))
          .map(nu)
          .filter((n) => n.length >= 4 && tronc(n, m.racine) === 4)
          .sort((a, b) => a.length - b.length)[0] || "?";
        md.push(`| [ ] | \`${f}\` | ${jeton} | ${m.racine} | ${fiche} |`);
      }
      md.push("");
    }

    const { writeFile } = await import("node:fs/promises");
    await writeFile("troncs-4-a-trancher.md", `${md.join("\n")}\n`, "utf8");
    console.log(`\n   ${courts.length} troncs de 4 caractères, ${parG.size} gammes`);
    console.log("   → troncs-4-a-trancher.md");
    for (const [k, liste] of [...parG].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`      ${k.replace("|", " · ").padEnd(34)} ${String(liste.length).padStart(4)}`);
    }
  }

  if (EXEMPLES) {
    titre("EXEMPLES DE TRONCS RETENUS");
    let n = 0;
    for (const [f, m] of parTronc) {
      if (n >= 25) break;
      const cle = [...m.cles][0];
      console.log(`   ${basename(f).slice(0, 42).padEnd(43)} → ${m.racine.padEnd(10)} `
        + `${m.cles.size === 1 ? cle.split("|")[2].slice(0, 40) : `${m.cles.size} fiches`}`);
      n += 1;
    }
  }
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1; });
