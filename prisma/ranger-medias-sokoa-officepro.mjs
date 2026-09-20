// Range les visuels Sokoa et OfficePro dans l'arborescence du catalogue 2026.
//
// En simulation par défaut. Il faut --appliquer pour écrire sur le disque.
//
//   node prisma/ranger-medias-sokoa-officepro.mjs
//   node prisma/ranger-medias-sokoa-officepro.mjs --appliquer
//   node prisma/ranger-medias-sokoa-officepro.mjs --appliquer --marque=sokoa
//
// DEUX NIVEAUX, PARCE QU'IL Y A DEUX DEGRÉS DE CERTITUDE
//
//   Niveau 1 — la fiche.  L'image porte dans son nom une référence qui ne
//   laisse pas de doute. Elle va dans le dossier de la fiche.
//
//   Niveau 2 — le dépôt.  L'image ne dit que sa GAMME : « AMY (3).jpg » chez
//   OfficePro, « Klik_Amb_coworking.jpg » chez Sokoa. Elle va dans
//   <gamme>/_A-TRIER/, à côté des dossiers de fiches, triée par type de prise
//   de vue. Rien n'est distribué au hasard entre les fiches d'une gamme :
//   c'est ainsi qu'on s'était retrouvé avec les trente-cinq images Loria
//   posées sur les cinq produits.
//
// COMMENT UNE RÉFÉRENCE EST RECONNUE
//   Sokoa écrit ses références « ALA0/4N » au catalogue et « ADELA_ALA00.jpg »
//   sur ses fichiers : ni égalité, ni préfixe, mais un TRONC de quatre
//   caractères, suivi d'un 0 neutre. On compare donc des troncs, ce qui est
//   exact et non approximatif.
//
//   Un tronc peut désigner plusieurs fiches — « ALB0 » vaut pour le dos PP et
//   pour le dos résille. Ces cas ont été tranchés en ouvrant les images, et
//   les décisions sont dans decisions-troncs.json. Rien n'est deviné ici : le
//   script applique, il n'arbitre pas.
//
// QUAND UNE IMAGE VA DANS PLUSIEURS FICHES
//   Lorsque les fiches candidates ne diffèrent que par un attribut invisible
//   — vendu à l'unité ou par lot, accotoirs 1D/3D/4D, course de lift,
//   polypropylène recyclé — la même image est copiée dans toutes. Le produit
//   photographié est le même ; mieux vaut deux fiches illustrées du même
//   visuel qu'une fiche vide.
import { readdir, mkdir, copyFile, stat, writeFile, readFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import XLSX from "xlsx";

const APPLIQUER = process.argv.includes("--appliquer");
const FILTRE_MARQUE = ((process.argv.find((a) => a.startsWith("--marque=")) || "")
  .slice(9) || null)?.toLowerCase() || null;

const MEDIAS = ["C:", "Users", "akeys", "Desktop", "Matt", "COTEBURO-MEDIAS"].join("/");
const CIBLE = `${MEDIAS}/CATALOGUE-2026`;
const CLASSEUR = "catalogue-2026/catalogue-coteburo.xlsx";
const DECISIONS = "decisions-troncs.json";
const IMAGES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);

// Cinquante-neuf fichiers TIF pèsent huit gigaoctets à eux seuls — des
// masters d'impression à cent quarante mégaoctets pièce. Les copier ferait
// passer la copie de 7 à 15,5 Go, pour un disque qui n'a que 18 Go libres, et
// ils n'aident en rien à trier des visuels à l'œil. On les écarte par défaut
// et on les liste ; --avec-tif les reprend.
const AVEC_TIF = process.argv.includes("--avec-tif");
const MASTERS = new Set([".tif", ".tiff"]);

const SOURCES = {
  resourcesLENIVET: "officepro",
  Sokoa: "sokoa",
  fichiers_sokoa: "sokoa",
  "fichiers_sokoa (1)": "sokoa",
};

// Les mêmes longueurs que ranger-medias.mjs : les deux scripts doivent écrire
// dans LE MÊME dossier, pas dans deux voisins.
const MAX_GAMME = 30;
const MAX_PRODUIT = 58;
const MAX_DECOR = 28;

const titre = (t) => console.log(`\n${"═".repeat(68)}\n${t}\n${"═".repeat(68)}`);
const mo = (o) => `${(o / 1024 / 1024).toFixed(1)} Mo`;
const nu = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const INTERDITS = /[<>:"/\\|?*]|[\p{Cc}]/gu;

function empreinte(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).slice(0, 4);
}

function nomSain(s, max) {
  const propre = String(s ?? "").replace(INTERDITS, "-")
    .replace(/\s+/g, " ").replace(/[. ]+$/, "").trim();
  if (propre.length <= max) return propre || "sans-nom";
  return `${propre.slice(0, max - 5).trim()}~${empreinte(propre)}`;
}

const slugCourt = (s, max) => String(s ?? "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")
  .toLowerCase().slice(0, max).replace(/-$/, "");

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

/** Le tronc d'une référence : ce qui précède la première barre oblique. */
function troncDe(ref) {
  const n = nu(String(ref || "").trim().split("/")[0]);
  return n.length >= 4 ? n.slice(0, 4) : null;
}

function lireCatalogue() {
  const wb = XLSX.readFile(CLASSEUR);
  const fiches = new Map();       // « marque|gamme|nom » → { marque, gamme, nom }
  const parTronc = new Map();     // tronc → Set(clés de fiche)
  const parGamme = new Map();     // gamme nue → { marque, nom }
  const parNomFiche = new Map();  // nom de fiche → clé

  for (const [onglet, marque] of [["SOKOA", "sokoa"], ["OFFICEPRO", "officepro"]]) {
    if (FILTRE_MARQUE && marque !== FILTRE_MARQUE) continue;
    for (const r of XLSX.utils.sheet_to_json(wb.Sheets[onglet], { defval: null })) {
      const cle = `${marque}|${r.Gamme}|${r["Nom sur le site"]}`;
      if (!fiches.has(cle)) {
        fiches.set(cle, { marque, gamme: r.Gamme, nom: r["Nom sur le site"] });
      }
      parNomFiche.set(r["Nom sur le site"], cle);
      const g = nu(r.Gamme);
      if (!parGamme.has(g)) parGamme.set(g, { marque, nom: r.Gamme });
      for (const col of ["Réf. produit", "Réf. complète"]) {
        const t = troncDe(r[col]);
        if (!t) continue;
        if (!parTronc.has(t)) parTronc.set(t, new Set());
        parTronc.get(t).add(cle);
      }
    }
  }
  return { fiches, parTronc, parGamme, parNomFiche };
}

/** Les arbitrages faits à l'œil, aplatis en « tronc → [noms de fiche] ». */
async function lireDecisions() {
  const brut = JSON.parse(await readFile(DECISIONS, "utf8"));
  const out = new Map();
  for (const [section, contenu] of Object.entries(brut)) {
    if (section.startsWith("_")) continue;
    for (const [cle, v] of Object.entries(contenu)) {
      if (cle.startsWith("_")) continue;
      // « IR66 (les 3 images SPT) » : le tronc est le premier mot, le reste
      // dit à quelles images la décision s'applique.
      const tronc = cle.split(" ")[0];
      const precision = cle.slice(tronc.length).trim().replace(/^\(|\)$/g, "");
      const noms = v.fiches || (v.fiche ? [v.fiche] : []);
      if (!noms.length) continue;
      if (!out.has(tronc)) out.set(tronc, []);
      out.get(tronc).push({ precision, noms });
    }
  }
  return out;
}

/** La gamme nommée par le chemin d'une image, ou null. */
function gammeDuChemin(f, parGamme, marque) {
  for (const seg of f.split("/").slice(0, -1).reverse()) {
    const n = nu(seg);
    if (n.length < 3) continue;
    if (parGamme.has(n) && parGamme.get(n).marque === marque) return n;
    // Le rapprochement va dans LES DEUX SENS. « arco dossier » contient la
    // gamme « Arco » ; à l'inverse le dossier « ALAIA » ne porte pas le
    // suffixe que le catalogue lui donne, « Alaia by Sokoa ». Ne tester
    // qu'un sens laissait les images Alaia et Kanpoa sans gamme — elles
    // finissaient dans les non rattachées au lieu de leur dépôt.
    for (const [g, info] of parGamme) {
      if (info.marque !== marque || g.length < 4) continue;
      if (n.startsWith(g) || (n.length >= 4 && g.startsWith(n))) return g;
    }
  }
  return null;
}

/** Le tronc porté par un nom de fichier : quatre caractères, plus un 0 neutre. */
function troncDuFichier(nom, parTronc) {
  for (const brut of nom.replace(/\.[^.]+$/, "").split(/[\s_\-.()[\]]+/).filter(Boolean)) {
    const n = nu(brut);
    if (n.length < 4 || n.length > 5) continue;
    if (n.length === 5 && n[4] !== "0") continue;
    const t = n.slice(0, 4);
    if (parTronc.has(t)) return t;
  }
  return null;
}

// Le type de prise de vue, pour trier les dépôts. L'ordre compte : une image
// nommée « AMBIANCE ARCO HD1 » est d'abord une ambiance.
const TYPES = [
  ["ambiance", /\bAMB\b|AMBIANCE|BODEGON|OPEN.?SPACE|COWORKING|SALLE|BANNIERE/i],
  ["schema", /SCHEMA|SCHÉMA|\bFT\b|TECHNIQUE|\bCOTES?\b|DESSIN/i],
  ["detail", /\bZOOM\b|DETAIL|DÉTAIL|ACCROCHE|\bDET\b/i],
  ["detoure", /DETOUR|DÉTOUR|\bDT\b|PACKSHOT|\bST\b/i],
];
const typeDe = (f) => (TYPES.find(([, motif]) => motif.test(f)) || ["photo"])[0];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — les images sont copiées ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const cat = lireCatalogue();
  const decisions = await lireDecisions();
  console.log(`${cat.fiches.size} fiches · ${cat.parTronc.size} troncs · `
    + `${decisions.size} troncs arbitrés à l'œil`);

  const tous = await parcourir(MEDIAS);
  const retenues = tous.filter((f) => IMAGES.has(extname(f).toLowerCase())
    && SOURCES[f.slice(0, f.indexOf("/"))]
    && (!FILTRE_MARQUE || SOURCES[f.slice(0, f.indexOf("/"))] === FILTRE_MARQUE));
  const masters = retenues.filter((f) => MASTERS.has(extname(f).toLowerCase()));
  const images = AVEC_TIF ? retenues
    : retenues.filter((f) => !MASTERS.has(extname(f).toLowerCase()));
  console.log(`${images.length} images à examiner`);
  if (masters.length && !AVEC_TIF) {
    console.log(`${masters.length} masters TIF écartés — huit gigaoctets de fichiers `
      + "d'impression, inutiles pour trier. --avec-tif pour les reprendre.");
  }
  console.log("");

  const versFiche = [];   // { source, cles[], tronc }
  const versDepot = [];   // { source, gamme, type }
  const orphelines = [];

  for (const f of images) {
    const marque = SOURCES[f.slice(0, f.indexOf("/"))];
    const nom = basename(f);
    const tronc = troncDuFichier(nom, cat.parTronc);

    if (tronc) {
      const arbitrages = decisions.get(tronc);
      let noms = null;
      if (arbitrages) {
        // Une précision comme « les 3 images SPT » ou un nom de fichier
        // désigne le sous-ensemble concerné.
        const cible = arbitrages.find((a) => a.precision
          && (nom.includes(a.precision) || nu(nom).includes(nu(a.precision.split(" ").pop()))));
        noms = (cible || arbitrages.find((a) => !a.precision) || arbitrages[0]).noms;
      } else {
        const candidats = [...(cat.parTronc.get(tronc) || [])];
        if (candidats.length === 1) noms = [cat.fiches.get(candidats[0]).nom];
      }
      const cles = (noms || []).map((n) => cat.parNomFiche.get(n)).filter(Boolean);
      if (cles.length) {
        versFiche.push({ source: f, cles, tronc });
        continue;
      }
    }

    const g = gammeDuChemin(f, cat.parGamme, marque);
    if (g) versDepot.push({ source: f, gamme: g, type: typeDe(f) });
    else orphelines.push(f);
  }

  // ── Les noms de destination ──
  const dossierFiche = (cle) => {
    const f = cat.fiches.get(cle);
    return [CIBLE, f.marque, nomSain(f.gamme, MAX_GAMME), nomSain(f.nom, MAX_PRODUIT)].join("/");
  };
  const dossierDepot = (g, type) => {
    const info = cat.parGamme.get(g);
    return [CIBLE, info.marque, nomSain(info.nom, MAX_GAMME), "_A-TRIER", type].join("/");
  };

  const plan = [];
  const compteurs = new Map();
  const nommer = (dossier, base, ext) => {
    const k = `${dossier}|${base}`;
    const n = (compteurs.get(k) || 0) + 1;
    compteurs.set(k, n);
    return `${base}_${String(n).padStart(2, "0")}${ext}`;
  };

  // Le même visuel vit souvent dans DEUX arborescences — « fichiers_sokoa/ »
  // et « Sokoa/fichiers_sokoa/ » sont deux copies du même envoi. Sans ce
  // filtre, quarante-six fiches recevaient deux fois la même photo et la
  // galerie l'affichait en double. On reconnaît le doublon à son nom de
  // fichier, pour une même fiche.
  const dejaVu = new Set();
  const uniques = [];
  let doublons = 0;
  for (const x of versFiche.sort((a, b) => a.source.localeCompare(b.source))) {
    const signature = `${x.cles.join("+")}|${basename(x.source).toLowerCase()}`;
    if (dejaVu.has(signature)) { doublons += 1; continue; }
    dejaVu.add(signature);
    uniques.push(x);
  }
  if (doublons) console.log(`\n   ${doublons} doublons écartés (même visuel, deux arborescences)`);

  for (const x of uniques) {
    const sansExt = basename(x.source).replace(/\.[^.]+$/, "");
    // Le nom de gamme n'est pas un décor : « ADELA_ALB00.jpg » donnait
    // « ALB0_adela », qui ne dit rien de la finition photographiée.
    const gammeNue = nu(cat.fiches.get(x.cles[0])?.gamme || "");
    const reste = sansExt.split(/[\s_\-.()[\]]+/)
      .filter((m) => {
        const n = nu(m);
        return n && !n.startsWith(x.tronc) && n !== gammeNue && !gammeNue.startsWith(n);
      }).join("-");
    const decor = slugCourt(reste, MAX_DECOR);
    const base = decor ? `${x.tronc}_${decor}` : x.tronc;
    for (const cle of x.cles) {
      const d = dossierFiche(cle);
      plan.push({ source: x.source, dossier: d,
        nom: nommer(d, base, extname(x.source).toLowerCase()) });
    }
  }
  for (const x of versDepot.sort((a, b) => a.source.localeCompare(b.source))) {
    const d = dossierDepot(x.gamme, x.type);
    const base = slugCourt(basename(x.source).replace(/\.[^.]+$/, ""), 50) || "image";
    plan.push({ source: x.source, dossier: d,
      nom: nommer(d, base, extname(x.source).toLowerCase()) });
  }

  titre("CE QUI SERAIT RANGÉ");
  const fichesTouchees = new Set(uniques.flatMap((x) => x.cles));
  const dupliquees = uniques.filter((x) => x.cles.length > 1);
  console.log(`\n   dans une FICHE            ${String(uniques.length).padStart(5)} images `
    + `→ ${fichesTouchees.size} fiches`);
  console.log(`      dont copiées dans plusieurs fiches ${String(dupliquees.length).padStart(4)}`
    + "   (attribut invisible : lot, accotoirs, lift)");
  console.log(`   dans un DÉPÔT _A-TRIER    ${String(versDepot.length).padStart(5)} images`);
  console.log(`   laissées où elles sont    ${String(orphelines.length).padStart(5)} images `
    + "   (ni référence ni gamme)");
  console.log(`   ${"─".repeat(48)}`);
  console.log(`   copies à faire            ${String(plan.length).padStart(5)}`);

  let poids = 0;
  for (const p of plan) {
    try { poids += (await stat(join(MEDIAS, p.source))).size; } catch { /* ignore */ }
  }
  console.log(`   ${mo(poids)}`);

  titre("LES DÉPÔTS _A-TRIER, PAR GAMME");
  const parDepot = new Map();
  for (const x of versDepot) {
    const info = cat.parGamme.get(x.gamme);
    const k = `${info.marque} · ${info.nom}`;
    if (!parDepot.has(k)) parDepot.set(k, {});
    parDepot.get(k)[x.type] = (parDepot.get(k)[x.type] || 0) + 1;
  }
  console.log("\n   gamme                          total  photo  ambiance  détouré  schéma  détail");
  for (const [k, t] of [...parDepot].sort((a, b) =>
    Object.values(b[1]).reduce((s, n) => s + n, 0)
    - Object.values(a[1]).reduce((s, n) => s + n, 0))) {
    const tot = Object.values(t).reduce((s, n) => s + n, 0);
    console.log(`   ${k.slice(0, 30).padEnd(31)}${String(tot).padStart(5)}`
      + `${String(t.photo || 0).padStart(7)}${String(t.ambiance || 0).padStart(10)}`
      + `${String(t.detoure || 0).padStart(9)}${String(t.schema || 0).padStart(8)}`
      + `${String(t.detail || 0).padStart(8)}`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour copier.");
    return;
  }

  titre("ÉCRITURE");
  const dossiers = new Set(plan.map((p) => p.dossier));
  for (const d of dossiers) await mkdir(d, { recursive: true });
  console.log(`   ${dossiers.size} dossiers créés ou déjà en place`);

  let n = 0;
  for (const p of plan) {
    await copyFile(join(MEDIAS, p.source), join(p.dossier, p.nom));
    n += 1;
    if (n % 200 === 0) process.stdout.write(`\r   ${n} / ${plan.length} images`);
  }
  console.log(`\r   ${n} images copiées`);

  // La trace : d'où vient chaque fichier, et à quel titre.
  const lignes = ["nouveau chemin;fichier d'origine"];
  for (const p of plan) {
    lignes.push(`${p.dossier.slice(CIBLE.length + 1)}/${p.nom};${p.source}`);
  }
  await writeFile(`${CIBLE}/_ORIGINE-sokoa-officepro.csv`,
    `${lignes.join("\n")}\n`, "utf8");
  console.log("   trace écrite → CATALOGUE-2026/_ORIGINE-sokoa-officepro.csv");

  if (masters.length && !AVEC_TIF) {
    await writeFile(`${CIBLE}/_MASTERS-TIF-NON-COPIES.txt`,
      `${masters.sort().join("\n")}\n`, "utf8");
    console.log(`   ${masters.length} masters TIF listés `
      + "→ CATALOGUE-2026/_MASTERS-TIF-NON-COPIES.txt");
  }

  if (orphelines.length) {
    await writeFile(`${CIBLE}/_NON-RATTACHEES.txt`,
      `${orphelines.sort().join("\n")}\n`, "utf8");
    console.log(`   ${orphelines.length} images sans référence ni gamme `
      + "→ CATALOGUE-2026/_NON-RATTACHEES.txt");
  }
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1; });
