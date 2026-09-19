// Relevé des dossiers pCon : ce que chacun contient vraiment.
//
// Lecture seule, aucune capture. On ouvre les vingt-huit dossiers déclarés
// dans capture-pcon.mjs, on lit la grille des produits, et on confronte les
// références trouvées aux 239 fiches Buronomic du catalogue 2026.
//
//   node inventaire-pcon.mjs
//   node inventaire-pcon.mjs --cache
//
// POURQUOI UN RELEVÉ AVANT LA CAPTURE
//   Le champ « gamme » d'un dossier pCon est une étiquette de navigation,
//   pas le nom d'une gamme du catalogue. Rapprocher les deux par leur nom
//   donne une réponse plausible et fausse : les noms de fiche ont changé,
//   « Modul Up » ou « Prestige Réunion » ne correspondent plus à rien, et
//   à l'inverse quinze gammes du catalogue n'ont aucun dossier qui leur
//   ressemble — sans que cela dise si leurs références sont absentes du
//   configurateur ou rangées ailleurs.
//
//   Seule la référence tranche. On la relève donc pour de bon.
//
// Sortie : inventaire-pcon.md
import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer";
import XLSX from "xlsx";
import { DOSSIERS } from "./capture-pcon.mjs";

const CACHE = process.argv.includes("--cache");
const CLASSEUR = "catalogue-2026/catalogue-coteburo.xlsx";
const ATTENTE_RENDU = 5000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const nu = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Le configurateur écrit la référence PLUS LONGUE que le catalogue papier :
// « DX375G » pour DX37, « DZ145 » pour DZ14, « ED701NNC » pour ED70. Le
// catalogue en est toujours le début — c'est déjà la règle de
// prisma/import-photos-buronomic.mjs. Une égalité stricte faisait passer
// « CONNECTIQUE » et « SOLUTION PLIANTE » pour absentes du configurateur
// alors que leurs produits y sont.
//
// On retient la racine la plus LONGUE qui préfixe la référence vue : entre
// DZ14 et DZ1, c'est DZ14 qui désigne le bon produit.
function racinesDe(refVue, parRacine) {
  const r = nu(refVue);
  if (parRacine.has(r)) return parRacine.get(r);
  let meilleure = null;
  for (const racine of parRacine.keys()) {
    if (racine.length >= 3 && r.startsWith(racine)
        && (!meilleure || racine.length > meilleure.length)) {
      meilleure = racine;
    }
  }
  return meilleure ? parRacine.get(meilleure) : null;
}

/** Les fiches Buronomic, et la racine de chacune de leurs déclinaisons. */
function catalogue() {
  const wb = XLSX.readFile(CLASSEUR);
  const fiches = new Map();        // « gamme|nom » → Set(racines)
  const parRacine = new Map();     // racine nue → Set(« gamme|nom »)
  for (const r of XLSX.utils.sheet_to_json(wb.Sheets.BURONOMIC, { defval: null })) {
    const cle = `${r.Gamme}|${r["Nom sur le site"]}`;
    if (!fiches.has(cle)) fiches.set(cle, new Set());
    const racine = nu(r["Réf. produit"]);
    if (!racine) continue;
    fiches.get(cle).add(racine);
    if (!parRacine.has(racine)) parRacine.set(racine, new Set());
    parRacine.get(racine).add(cle);
  }
  return { fiches, parRacine };
}

async function main() {
  const { fiches, parRacine } = catalogue();
  console.log(`${fiches.size} fiches Buronomic · ${parRacine.size} racines au catalogue`);
  console.log(`${DOSSIERS.length} dossiers pCon déclarés\n`);

  const navigateur = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    userDataDir: CACHE ? "./.pcon-cache" : undefined,
  });
  const page = await navigateur.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  const releve = [];
  for (const dossier of DOSSIERS) {
    process.stdout.write(`   ${dossier.gamme.padEnd(32)}`);
    try {
      await page.goto(dossier.url, { waitUntil: "networkidle2", timeout: 60000 });
      await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
      await pause(ATTENTE_RENDU);
      await page.waitForFunction(
        () => document.querySelectorAll('button[class*="CatalogGridItem"]').length > 0,
        { timeout: dossier.attenteGrille || 25000 }
      );
    } catch (e) {
      console.log(`✗ ${e.message.split("\n")[0].slice(0, 40)}`);
      releve.push({ ...dossier, erreur: e.message.split("\n")[0], refs: [] });
      continue;
    }

    const refs = await page.evaluate(() => [...document.querySelectorAll('button[class*="CatalogGridItem"]')]
      .map((b) => {
        const id = b.getAttribute("data-testid") || b.getAttribute("aria-label") || "";
        const m = id.match(/^cat\/(.+)\/[^/]*$/);
        return m ? m[1].trim() : null;
      })
      .filter(Boolean));

    const connues = refs.filter((r) => racinesDe(r, parRacine));
    console.log(`${String(refs.length).padStart(3)} produits, ${String(connues.length).padStart(3)} au catalogue`);
    releve.push({ ...dossier, refs, connues });
  }
  await navigateur.close();

  // ── Ce que le relevé apprend ──
  const couverte = new Map();   // « gamme|nom » → Set(dossiers)
  for (const d of releve) {
    for (const r of d.refs) {
      for (const cle of racinesDe(r, parRacine) || []) {
        if (!couverte.has(cle)) couverte.set(cle, new Set());
        couverte.get(cle).add(d.gamme);
      }
    }
  }

  const parGamme = new Map();
  for (const cle of fiches.keys()) {
    const g = cle.slice(0, cle.indexOf("|"));
    if (!parGamme.has(g)) parGamme.set(g, { total: 0, couvertes: 0, dossiers: new Set(), manquantes: [] });
    const e = parGamme.get(g);
    e.total += 1;
    if (couverte.has(cle)) {
      e.couvertes += 1;
      for (const d of couverte.get(cle)) e.dossiers.add(d);
    } else e.manquantes.push(cle.slice(cle.indexOf("|") + 1));
  }

  const md = ["# Relevé des dossiers pCon", "",
    `Le ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, "",
    `${DOSSIERS.length} dossiers ouverts · ${fiches.size} fiches Buronomic au catalogue`, "",
    "Le rapprochement se fait par la RÉFÉRENCE lue dans la grille du",
    "configurateur, pas par le nom du dossier.", "",
    "## Dossiers pCon", "",
    "| dossier | produits | dont au catalogue |", "|---|---|---|"];
  for (const d of releve) {
    md.push(`| ${d.gamme} | ${d.erreur ? "✗ " + d.erreur : d.refs.length} | ${d.connues?.length ?? 0} |`);
  }

  const sansDossier = [...parGamme].filter(([, e]) => e.couvertes === 0);
  const partielles = [...parGamme].filter(([, e]) => e.couvertes > 0 && e.couvertes < e.total);
  const completes = [...parGamme].filter(([, e]) => e.couvertes === e.total);

  md.push("", "## Gammes entièrement couvertes", "");
  for (const [g, e] of completes.sort()) {
    md.push(`- **${g}** — ${e.total} fiches · ${[...e.dossiers].join(", ")}`);
  }
  md.push("", "## Gammes partiellement couvertes", "");
  for (const [g, e] of partielles.sort()) {
    md.push(`- **${g}** — ${e.couvertes}/${e.total} fiches · ${[...e.dossiers].join(", ")}`);
    for (const n of e.manquantes) md.push(`  - sans produit pCon : ${n}`);
  }
  md.push("", "## Gammes sans aucun produit pCon", "");
  for (const [g, e] of sansDossier.sort()) {
    const racines = [...new Set([...fiches.entries()]
      .filter(([c]) => c.startsWith(`${g}|`)).flatMap(([, s]) => [...s]))];
    md.push(`- **${g}** — ${e.total} fiches · racines ${racines.slice(0, 8).join(", ")}`);
  }

  const vues = new Set(releve.flatMap((d) => d.refs.map(nu)));
  // Le relevé brut est écrit pour pouvoir refaire l'analyse sans rouvrir
  // le navigateur : vingt-huit chargements, c'est dix minutes.
  await writeFile("inventaire-pcon.json",
    JSON.stringify(releve.map(({ gamme, url, refs, erreur }) => ({ gamme, url, refs, erreur })), null, 1),
    "utf8");
  const inconnues = [...vues].filter((r) => !racinesDe(r, parRacine));
  md.push("", "## Références vues au configurateur, absentes du catalogue", "",
    `${inconnues.length} références. Elles sortent du périmètre 2026 ou portent `
    + "un libellé au lieu d'un code.", "");
  md.push(inconnues.slice(0, 60).join(" · "));

  await writeFile("inventaire-pcon.md", `${md.join("\n")}\n`, "utf8");

  console.log(`\n── BILAN ──\n`);
  console.log(`   gammes entièrement couvertes   ${String(completes.length).padStart(3)}`);
  console.log(`   gammes partiellement couvertes ${String(partielles.length).padStart(3)}`);
  console.log(`   gammes sans aucun produit      ${String(sansDossier.length).padStart(3)}`);
  const fichesOk = [...parGamme.values()].reduce((n, e) => n + e.couvertes, 0);
  console.log(`\n   ${fichesOk} fiches sur ${fiches.size} ont au moins un produit au configurateur`);
  console.log(`\nDétail → inventaire-pcon.md`);
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1; });
