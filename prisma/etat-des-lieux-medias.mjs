// Ce que les médias couvrent du nouveau catalogue.
//
// Lecture seule : aucun envoi, aucune écriture. Le but est de savoir, AVANT
// d'importer, combien des 555 fiches trouveraient une photo, lesquelles
// resteraient vides, et quels fichiers ne correspondent à rien.
//
//   node prisma/etat-des-lieux-medias.mjs
//   node prisma/etat-des-lieux-medias.mjs --fichiers-orphelins
//   node prisma/etat-des-lieux-medias.mjs --fiches-vides
//
// LE RATTACHEMENT
//   Le _LISEZ-MOI.md de COTEBURO-MEDIAS dit que le nom de fichier commence
//   par la référence. C'est vrai pour Buronomic, faux pour Sokoa, qui écrit
//   « Klik_KLA00 » — la gamme d'abord. On ne présume donc pas de la
//   position : on découpe le nom en jetons et on teste chacun, en disant
//   quelle règle a pris. Une référence identifiée par sa forme plutôt que
//   par sa place, c'est la leçon qui a coûté trois gammes Sokoa.
//
//   Deux niveaux de référence, du plus précis au plus large :
//     réf. complète   ALA0/4N, KOUS05BE-ARC, ED725FCC   → la déclinaison
//     réf. produit    AR95, DH50, ZAK                   → la fiche
//   La réf. complète l'emporte : elle désigne une déclinaison précise.
import "dotenv/config";
import { readdir, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";

const prisma = new PrismaClient();
const RACINE = "C:\\Users\\akeys\\Desktop\\Matt\\COTEBURO-MEDIAS";
const CLASSEUR = "catalogue-2026/catalogue-coteburo.xlsx";
const IMAGES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);
const MARQUES = { BURONOMIC: "buronomic", OFFICEPRO: "officepro", SOKOA: "sokoa" };

const VOIR_ORPHELINS = process.argv.includes("--fichiers-orphelins");
const VOIR_VIDES = process.argv.includes("--fiches-vides");

const titre = (t) => console.log(`\n${"═".repeat(68)}\n${t}\n${"═".repeat(68)}`);
const mo = (o) => `${(o / 1024 / 1024).toFixed(1)} Mo`;

/** Tous les fichiers sous un dossier, avec leur chemin relatif. */
async function parcourir(dossier, base = "") {
  const out = [];
  let entrees;
  try {
    entrees = await readdir(join(dossier, base), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entrees) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...await parcourir(dossier, rel));
    else out.push(rel);
  }
  return out;
}

/** Les jetons d'un nom de fichier, candidats au rôle de référence.
 *
 * On garde aussi les recollages successifs : « ALA0 4N » écrit dans un nom
 * de fichier redonne « ALA04N », qu'on rapprochera d'« ALA0/4N » une fois
 * la ponctuation retirée.
 */
function jetons(nom) {
  const sansExt = nom.replace(/\.[^.]+$/, "");
  const morceaux = sansExt.split(/[\s_\-.()[\]]+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i < morceaux.length; i += 1) {
    out.add(morceaux[i]);
    if (i + 1 < morceaux.length) out.add(morceaux[i] + morceaux[i + 1]);
  }
  out.add(sansExt);
  return [...out];
}

/** Une référence réduite à ce qui la distingue : majuscules et chiffres. */
const nu = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Toutes les valeurs des colonnes de référence n'en sont pas. Le parser Sokoa
// y a laissé « noir », « blanc », « Élément », « départ », « iii » : des mots
// du tableau avalés comme des codes. Indexer « BLANC » comme une référence
// ferait correspondre la moitié des noms de fichiers du dossier Buronomic, où
// le coloris est écrit dans le nom.
//
// Le départage se fait sur la CASSE, pas sur la présence d'un chiffre : les
// références Klik s'écrivent « KBBO/C + *A *T *D », sans un seul chiffre,
// alors que le bruit du parser est toujours en minuscules.
function refPlausible(brut) {
  const s = String(brut || "").trim();
  if (!s) return null;
  // « coloris » excepté : les références Sokoa s'écrivent « NR87/B+coloris* ».
  if (/[a-zàâéèêëïîôùûç]{3,}/.test(s.replace(/\+?coloris\*?/gi, ""))) return null;
  if (/:/.test(s)) return null;
  const n = nu(s);
  return n.length < 3 ? null : n;
}

function indexDuClasseur() {
  const wb = XLSX.readFile(CLASSEUR);
  // réf. nue → { marque, gamme, nom } ; deux niveaux séparés.
  const completes = new Map();
  const racines = new Map();
  const fiches = new Map();   // « marque|gamme|nom » → { refs, racines }
  const parNom = new Map();   // nom de fiche → [clés]  (rattachement par dossier)
  const rejetees = new Set();
  for (const onglet of wb.SheetNames) {
    const marque = MARQUES[onglet];
    for (const r of XLSX.utils.sheet_to_json(wb.Sheets[onglet], { defval: null })) {
      const nom = r["Nom sur le site"];
      const cle = `${marque}|${r["Gamme"]}|${nom}`;
      if (!fiches.has(cle)) fiches.set(cle, { refs: new Set(), racines: new Set() });
      if (!parNom.has(nom)) parNom.set(nom, []);
      if (!parNom.get(nom).includes(cle)) parNom.get(nom).push(cle);
      const f = fiches.get(cle);
      const rc = refPlausible(r["Réf. complète"]);
      const rp = refPlausible(r["Réf. produit"]);
      if (rc) { f.refs.add(rc); if (!completes.has(rc)) completes.set(rc, cle); }
      else if (r["Réf. complète"]) rejetees.add(String(r["Réf. complète"]));
      if (rp) { f.racines.add(rp); if (!racines.has(rp)) racines.set(rp, cle); }
    }
  }
  return { completes, racines, fiches, parNom, rejetees };
}

async function main() {
  const { completes, racines, fiches, parNom, rejetees } = indexDuClasseur();

  // Les identifiants réels, pour dire ce qui est illustrable aujourd'hui.
  const enBase = new Map();   // « marque|gamme|nom » → id
  for (const v of await prisma.produitVitrine.findMany({
    select: { id: true, nom: true, images: true, imageUrl: true,
      gamme: { select: { nom: true, marque: { select: { slug: true } } } } },
  })) {
    enBase.set(`${v.gamme.marque.slug}|${v.gamme.nom}|${v.nom}`, v);
  }

  console.log(`racine : ${RACINE}`);
  const tous = await parcourir(RACINE);
  const images = tous.filter((f) => IMAGES.has(extname(f).toLowerCase()));
  const autres = tous.filter((f) => !IMAGES.has(extname(f).toLowerCase()));

  let octets = 0;
  const tailles = new Map();
  for (const f of images) {
    try {
      const s = await stat(join(RACINE, f));
      octets += s.size;
      tailles.set(f, s.size);
    } catch { /* fichier disparu en cours de route */ }
  }
  console.log(`${tous.length} fichiers, dont ${images.length} images (${mo(octets)})`);
  console.log(`${autres.length} non-images (archives, PDF, documents)`);

  titre("IMAGES PAR DOSSIER DE PREMIER NIVEAU");
  const parDossier = new Map();
  for (const f of images) {
    const d = f.includes("/") ? f.slice(0, f.indexOf("/")) : "(racine)";
    if (!parDossier.has(d)) parDossier.set(d, { n: 0, octets: 0 });
    const e = parDossier.get(d);
    e.n += 1;
    e.octets += tailles.get(f) || 0;
  }
  console.log("\n   dossier                                 images      poids");
  for (const [d, e] of [...parDossier].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`   ${d.slice(0, 38).padEnd(39)}${String(e.n).padStart(6)}  ${mo(e.octets).padStart(9)}`);
  }

  titre("CE QUE CHAQUE IMAGE RATTACHERAIT");
  const parRegle = { dossier: [], complete: [], racine: [], ambiance: [], orpheline: [] };
  const trouvesParFiche = new Map();
  const parSource = new Map();
  for (const f of images) {
    const nom = basename(f);
    const source = f.includes("/") ? f.slice(0, f.indexOf("/")) : "(racine)";
    if (!parSource.has(source)) {
      parSource.set(source, { dossier: 0, complete: 0, racine: 0, ambiance: 0, orpheline: 0 });
    }
    const compte = parSource.get(source);

    let cle = null;
    let regle = null;

    // 1. Le chemin. L'arborescence de dépôt Buronomic range chaque photo dans
    //    un dossier qui porte le « Nom sur le site » de la fiche : c'est plus
    //    sûr que n'importe quelle lecture du nom de fichier.
    for (const segment of f.split("/").slice(0, -1).reverse()) {
      const candidats = parNom.get(segment);
      if (candidats && candidats.length === 1) { cle = candidats[0]; regle = "dossier"; break; }
    }

    // 2. Faute de chemin parlant, une référence dans le nom du fichier.
    if (!cle) {
      for (const j of jetons(nom)) {
        const n = refPlausible(j);
        if (!n) continue;
        if (completes.has(n)) { cle = completes.get(n); regle = "complete"; break; }
        if (!cle && racines.has(n)) { cle = racines.get(n); regle = "racine"; }
      }
    }

    // 3. Les ambiances n'appartiennent à aucune fiche en particulier. Le test
    //    vient APRÈS : une photo rangée dans le dossier d'une fiche lui
    //    revient, même si son nom dit « ambiance ».
    if (!cle && /^amb[_\-. ]|ambiance|bodegon/i.test(nom)) {
      parRegle.ambiance.push(f);
      compte.ambiance += 1;
      continue;
    }

    if (!cle) { parRegle.orpheline.push(f); compte.orpheline += 1; continue; }
    parRegle[regle].push(f);
    compte[regle] += 1;
    if (!trouvesParFiche.has(cle)) trouvesParFiche.set(cle, []);
    trouvesParFiche.get(cle).push(f);
  }
  console.log(`\n   par dossier de fiche  ${String(parRegle.dossier.length).padStart(5)}`);
  console.log(`   par réf. complète     ${String(parRegle.complete.length).padStart(5)}`);
  console.log(`   par réf. produit      ${String(parRegle.racine.length).padStart(5)}`);
  console.log(`   ambiance              ${String(parRegle.ambiance.length).padStart(5)}   (fin de galerie, sans fiche)`);
  console.log(`   rien de reconnu       ${String(parRegle.orpheline.length).padStart(5)}   → laissées de côté`);

  console.log("\n   Par source, ce qui prend :\n");
  console.log("   source                          dossier  réf.compl  réf.prod  ambiance   aucune");
  for (const [s, e] of [...parSource].sort((a, b) =>
    (b[1].orpheline + b[1].dossier + b[1].complete + b[1].racine + b[1].ambiance)
    - (a[1].orpheline + a[1].dossier + a[1].complete + a[1].racine + a[1].ambiance))) {
    console.log(`   ${s.slice(0, 30).padEnd(31)}${String(e.dossier).padStart(7)}`
      + `${String(e.complete).padStart(11)}${String(e.racine).padStart(10)}`
      + `${String(e.ambiance).padStart(10)}${String(e.orpheline).padStart(9)}`);
  }

  if (rejetees.size) {
    console.log(`\n   ⚠ ${rejetees.size} valeur(s) de la colonne « Réf. complète » écartée(s) de `
      + "l'index : ce n'est pas une référence mais du texte de catalogue.");
    for (const r of [...rejetees].slice(0, 12)) console.log(`      ${JSON.stringify(r)}`);
  }

  titre("COUVERTURE DES 555 FICHES");
  const parMarque = new Map();
  for (const cle of fiches.keys()) {
    const m = cle.slice(0, cle.indexOf("|"));
    if (!parMarque.has(m)) parMarque.set(m, { total: 0, illustrees: 0, images: 0, absentes: 0 });
    const e = parMarque.get(m);
    e.total += 1;
    if (!enBase.has(cle)) e.absentes += 1;
    const t = trouvesParFiche.get(cle);
    if (t) { e.illustrees += 1; e.images += t.length; }
  }
  console.log("\n   marque        fiches   illustrées   sans photo   images");
  let tt = 0;
  let ti = 0;
  for (const [m, e] of parMarque) {
    tt += e.total;
    ti += e.illustrees;
    console.log(`   ${m.padEnd(13)}${String(e.total).padStart(6)}${String(e.illustrees).padStart(13)}`
      + `${String(e.total - e.illustrees).padStart(13)}${String(e.images).padStart(9)}`);
  }
  console.log(`   ${"TOTAL".padEnd(13)}${String(tt).padStart(6)}${String(ti).padStart(13)}`
    + `${String(tt - ti).padStart(13)}`);
  console.log(`\n   ${Math.round((ti / tt) * 100)} % des fiches trouveraient au moins une photo`);

  const pasEnBase = [...fiches.keys()].filter((c) => !enBase.has(c));
  if (pasEnBase.length) {
    console.log(`   ⚠ ${pasEnBase.length} fiche(s) du classeur introuvable(s) en base — `
      + "le rattachement les manquerait");
    for (const c of pasEnBase.slice(0, 5)) console.log(`      ${c}`);
  }

  titre("LES NUANCIERS À RECRÉER");
  // Les palettes d'avant-purge disaient quels nuanciers le site servait.
  // On regarde ce dont on dispose localement pour les remonter.
  const finitions = images.filter((f) => f.startsWith("Finitions/"));
  const parNuancier = new Map();
  for (const f of finitions) {
    const d = f.split("/")[1] || "(racine)";
    parNuancier.set(d, (parNuancier.get(d) || 0) + 1);
  }
  for (const [d, n] of parNuancier) console.log(`   Finitions/${d.padEnd(28)} ${String(n).padStart(4)} images`);
  const swatches = await parcourir("sokoa_swatches");
  console.log(`   sokoa_swatches/${"".padEnd(24)} ${String(swatches.filter((f) =>
    IMAGES.has(extname(f).toLowerCase())).length).padStart(4)} images (dans le dépôt)`);

  if (VOIR_ORPHELINS) {
    titre("FICHIERS SANS RÉFÉRENCE RECONNUE");
    for (const f of parRegle.orpheline.slice(0, 200)) console.log(`   ${f}`);
    if (parRegle.orpheline.length > 200) {
      console.log(`   … et ${parRegle.orpheline.length - 200} autre(s)`);
    }
  }

  if (VOIR_VIDES) {
    titre("FICHES QUI RESTERAIENT SANS PHOTO");
    for (const c of [...fiches.keys()].filter((x) => !trouvesParFiche.has(x))) {
      console.log(`   ${c.replace(/\|/g, "  ·  ")}`);
    }
  }

  console.log("\n   Relancer avec --fichiers-orphelins ou --fiches-vides pour le détail.");
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
