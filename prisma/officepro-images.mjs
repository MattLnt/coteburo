// Rattache les visuels OfficePro aux fiches, et les envoie sur Cloudinary.
//
// En simulation par défaut : le script dit ce qu'il ferait, sans rien envoyer
// ni écrire en base.
//
// Les noms de fichiers ne disent presque rien — « 01 (2).jpg », « 3L7A3778.jpg »,
// « untitled.2696.jpg », et 15 % seulement portent une référence du tarif.
// C'est l'arborescence qui parle : « ARCO/ARCO PIEDS ROULETTES/ARCO BEIGE LIN ».
// On lit donc le chemin entier, dossiers compris.
//
// Deux niveaux de rattachement :
//   1. le dossier donne la gamme, comparé sur lettres et chiffres seuls
//      (« arco dossier », « CHEYENNE 2025 », « COIGNY ECO ET COLOR ») ;
//   2. dans la gamme, un mot de type dans le chemin désigne la fiche —
//      « BANC VERANO KAKI » va au banc. Sans mot de type, l'image revient à la
//      fiche principale de la gamme, celle qui a le plus de déclinaisons.
//
// Le compte n'y sera pas partout. Mieux vaut 80 % de rattachements à corriger
// dans l'admin que 61 fiches à illustrer à la main.
//
//   node prisma/officepro-images.mjs
//   node prisma/officepro-images.mjs Arco Verano     (quelques gammes)
//   node prisma/officepro-images.mjs --appliquer
import "dotenv/config";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { TYPES } from "./officepro-correspondances.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const DEMANDEES = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const RACINE = "C:/Users/pages/Bureau/Matt/projets/COTEBURO-MEDIAS/resourcesLENIVET/resourcesLENIVET";
const FICHES = "prisma/officepro-fiches.json";
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const IMAGES = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_PAR_FICHE = 10;
const MAX_COTE = 2200;

// Fichiers qui ne montrent pas le produit : notices, schémas techniques,
// captures d'écran, images générées, doublons « - Copie ».
const REBUT = /notice|montage|schema|schéma|^ft |fiche tech|capture d.?[ée]cran|gemini_generated|[-_ ]copie|thumbs\.db|logo|charte/i;
// Mise en situation : gardée, mais passée après les packshots.
const AMBIANCE = /ambiance|amb[ _-]|bodegon|shooting|workspace|photographe/i;

const cle = (s) => (s || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
const nettoyer = (s) => s.trim().replace(/\s+/g, "-").replace(/[?&#%\\/]/g, "");

async function fichiers(dir, rel = "") {
  const out = [];
  let entrees = [];
  try { entrees = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entrees) {
    if (e.name.startsWith(".")) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await fichiers(join(dir, e.name), r)));
    else if (IMAGES.includes(extname(e.name).toLowerCase())) out.push(r);
  }
  return out;
}

async function envoyer(chemin, publicId) {
  const buffer = await sharp(chemin).rotate()
    .resize(MAX_COTE, MAX_COTE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 }).toBuffer();
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "image/jpeg" }), "image.jpg");
  form.append("upload_preset", PRESET);
  form.append("public_id", publicId);
  const rep = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: form });
  const data = await rep.json().catch(() => ({}));
  if (!rep.ok || !data.secure_url) throw new Error(data?.error?.message || `HTTP ${rep.status}`);
  return data.secure_url;
}

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION — rien n'est envoyé ni écrit ═══\n");

  const fiches = JSON.parse(await readFile(FICHES, "utf8"));
  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marque: { slug: "officepro" } } },
    select: { id: true, nom: true, images: true, gamme: { select: { nom: true, slug: true } } },
  });
  const parNom = new Map(vitrines.map((v) => [cle(v.nom), v]));

  // Fiches connues, avec leur type et leur poids — le nombre de déclinaisons
  // désigne la fiche principale d'une gamme.
  const connues = fiches
    .map((f) => ({ ...f, vitrine: parNom.get(cle(f.nom)) }))
    .filter((f) => f.vitrine)
    .filter((f) => !DEMANDEES.length || DEMANDEES.some((d) => cle(f.gamme).includes(cle(d))));
  console.log(`${connues.length} fiches en base sur ${fiches.length} proposées\n`);

  const parGamme = new Map();
  for (const f of connues) {
    if (!parGamme.has(f.gamme)) parGamme.set(f.gamme, []);
    parGamme.get(f.gamme).push(f);
  }

  // ── Images → fiche ──
  //
  // La gamme se lit sur TOUT le chemin, pas seulement sur le dossier de tête :
  // « arco dossier/ARCO BANQUETTE/… » relève de la gamme Arco Banquette, qui
  // n'a pas de dossier à elle. La gamme au nom le plus long l'emporte, sans
  // quoi « Arco » raflerait ses trois voisines.
  const gammes = [...parGamme.keys()].map((g) => ({ nom: g, k: cle(g) })).sort((a, b) => b.k.length - a.k.length);
  const principaleDe = new Map(
    [...parGamme.entries()].map(([g, fs]) => [g, [...fs].sort((a, b) => b.declinaisons.length - a.declinaisons.length)[0]])
  );

  // Famille : le premier mot du nom de gamme. « arco dossier/ARCO POUF » ne
  // nomme pas la gamme Arco Lounge, où vit pourtant le pouf ; on cherche donc
  // la fiche dans toute la famille Arco, pas dans la seule gamme reconnue.
  const famille = (g) => cle(g.split(" ")[0]);
  const parFamille = new Map();
  for (const [g, fs] of parGamme) {
    const f = famille(g);
    if (!parFamille.has(f)) parFamille.set(f, []);
    parFamille.get(f).push(...fs);
  }

  // « ARCO COUSSIN » doit atteindre la fiche « Coussins - Arco » : le tarif
  // écrit l'un au singulier et l'autre au pluriel.
  const contient = (k, mot) => !!mot && (k.includes(mot) || (mot.endsWith("S") && k.includes(mot.slice(0, -1))));

  const tous = await fichiers(RACINE);
  const attribution = new Map(connues.map((f) => [f.nom, []]));
  let totalImages = tous.length, rebut = 0, horsGamme = 0;

  for (const rel of tous) {
    if (REBUT.test(rel)) { rebut++; continue; }
    const k = cle(rel);

    const gamme = gammes.find((g) => k.includes(g.k));
    if (!gamme) { horsGamme++; continue; }

    // Dans la gamme, la fiche dont le qualifiant puis le type se retrouvent
    // dans le chemin. Le qualifiant pèse double : « TECSY CHIC » désigne la
    // fiche Chic, pas n'importe quel fauteuil Tecsy.
    let cible = null, meilleur = 0, parQualifiant = false;
    for (const f of parFamille.get(famille(gamme.nom)) || []) {
      // Un qualifiant déjà contenu dans le nom de la gamme ne distingue rien :
      // « Lounge » vaut pour toute la gamme Arco Lounge, et le pouf raflait
      // ainsi les photos du fauteuil.
      const kqBrut = f.qualifiant ? cle(f.qualifiant) : "";
      const kq = kqBrut && !cle(f.gamme).includes(kqBrut) ? kqBrut : "";
      const kt = f.type ? cle(f.type) : "";
      let s = 0;
      if (contient(k, kq)) s += kq.length * 2;
      if (contient(k, kt)) s += kt.length;
      // À égalité, la fiche de la gamme effectivement reconnue l'emporte.
      if (s > meilleur || (s === meilleur && s > 0 && f.gamme === gamme.nom)) {
        meilleur = s; cible = f; parQualifiant = contient(k, kq);
      }
    }
    const fiche = cible || principaleDe.get(gamme.nom);
    if (!fiche) { horsGamme++; continue; }

    attribution.get(fiche.nom).push({
      chemin: join(RACINE, rel),
      rel,
      parType: !!cible,
      parQualifiant,
      ambiance: AMBIANCE.test(rel),
    });
  }

  // Tri : packshot avant ambiance, rattachement par type avant défaut.
  for (const [nom, liste] of attribution) {
    liste.sort((a, b) => Number(a.ambiance) - Number(b.ambiance) || Number(b.parQualifiant) - Number(a.parQualifiant) || Number(b.parType) - Number(a.parType) || a.rel.localeCompare(b.rel, "fr"));
    attribution.set(nom, liste.slice(0, MAX_PAR_FICHE));
  }

  // ── Taux ──
  const avec = connues.filter((f) => attribution.get(f.nom).length > 0);
  const retenues = [...attribution.values()].reduce((s, l) => s + l.length, 0);
  const parTypeN = [...attribution.values()].flat().filter((i) => i.parType).length;

  console.log(`\n${totalImages} images parcourues · ${rebut} écartées (notices, schémas, copies)`);
  console.log(`${retenues} retenues, plafonnées à ${MAX_PAR_FICHE} par fiche`);
  console.log(`   dont ${parTypeN} rattachées par type de produit, ${retenues - parTypeN} par défaut à la fiche principale de la gamme`);
  console.log(`\n${avec.length}/${connues.length} fiches illustrées  (${Math.round(avec.length / connues.length * 100)} %)`);

  console.log("\npar gamme :");
  for (const [gamme, fs] of [...parGamme.entries()].sort()) {
    const n = fs.filter((f) => attribution.get(f.nom).length).length;
    const img = fs.reduce((s, f) => s + attribution.get(f.nom).length, 0);
    console.log(`   ${gamme.padEnd(20)} ${String(n).padStart(2)}/${String(fs.length).padEnd(2)} fiches · ${String(img).padStart(3)} images${n < fs.length ? "   ← " + fs.filter((f) => !attribution.get(f.nom).length).map((f) => f.nom).join(", ").slice(0, 60) : ""}`);
  }

  const vides = connues.filter((f) => !attribution.get(f.nom).length);
  if (vides.length) {
    console.log(`\n${vides.length} fiches sans image :`);
    for (const f of vides) console.log(`   ${f.nom}`);
  }

  console.log("\nexemple :");
  const ex = avec.sort((a, b) => attribution.get(b.nom).length - attribution.get(a.nom).length)[0];
  console.log(`   ${ex.nom} — ${attribution.get(ex.nom).length} images`);
  for (const i of attribution.get(ex.nom).slice(0, 5)) {
    console.log(`      ${i.parType ? "[type]  " : "[gamme] "}${i.ambiance ? "amb " : "    "}${i.rel.slice(0, 74)}`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer.");
    return;
  }
  if (!CLOUD || !PRESET) { console.log("Clés Cloudinary absentes du .env."); return; }

  await mkdir("prisma/sauvegardes", { recursive: true });
  const sauv = `prisma/sauvegardes/officepro-images-avant-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(sauv, JSON.stringify(connues.map((f) => ({ id: f.vitrine.id, nom: f.nom, images: f.vitrine.images })), null, 2), "utf8");
  console.log(`\nSauvegarde des galeries actuelles : ${sauv}`);

  let envoyees = 0, echecs = 0;
  for (const f of connues) {
    const liste = attribution.get(f.nom);
    if (!liste.length) continue;
    const urls = [];
    for (const img of liste) {
      try {
        const id = `coteburo/officepro/${f.vitrine.gamme.slug}/${nettoyer(basename(img.rel, extname(img.rel)))}`;
        urls.push(await envoyer(img.chemin, id));
        envoyees++;
      } catch (e) { echecs++; console.log(`   ✗ ${img.rel} : ${e.message}`); }
    }
    if (urls.length) {
      await prisma.produitVitrine.update({ where: { id: f.vitrine.id }, data: { images: urls, imageUrl: urls[0] } });
      console.log(`   ✓ ${f.nom} — ${urls.length} images`);
    }
  }
  console.log(`\n${envoyees} envoyées · ${echecs} échecs`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
