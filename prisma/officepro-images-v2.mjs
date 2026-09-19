// Rattache le second envoi de visuels OfficePro aux fiches restées sans image.
//
// En simulation par défaut : le script dit ce qu'il ferait, sans rien envoyer
// ni écrire en base.
//
// Le premier envoi (prisma/officepro-images.mjs, dossier resourcesLENIVET) a
// illustré 40 fiches sur 63. OfficePro en a livré un second, neuf gammes, qui
// ne recouvre qu'une partie des 23 fiches restantes.
//
// Deux differences avec le premier script :
//
//   1. On n'écrit que sur les fiches dont la galerie est VIDE. Le rattachement,
//      lui, met en concurrence les 63 fiches : restreindre aussi la
//      concurrence ferait tomber sur une fiche vide les photos qui reviennent
//      de droit à une fiche déjà illustrée. « TECSEAT LEARNING/chaise » doit
//      pouvoir être gagné par la chaise déjà illustrée, et donc perdu par la
//      fiche vide, plutôt que mal attribué.
//
//   2. Les images sont rognées avant l'envoi, aux réglages de
//      prisma/officepro-rogner.mjs. Le premier import redimensionnait sans
//      rogner et il a fallu repasser derrière : autant le faire d'emblée.
//      Les mises en situation ne sont pas rognées, leur fond est le sujet.
//
//   node prisma/officepro-images-v2.mjs
//   node prisma/officepro-images-v2.mjs Lando Tecseat   (quelques gammes)
//   node prisma/officepro-images-v2.mjs --appliquer
import "dotenv/config";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const DEMANDEES = process.argv.slice(2).filter((a) => !a.startsWith("--"));
// --tracer=lando : imprime, pour chaque image dont le chemin contient le
// motif, la gamme reconnue et la fiche visée. Sert à comprendre pourquoi une
// photo tombe ailleurs qu'attendu.
const TRACER = (process.argv.find((a) => a.startsWith("--tracer=")) || "").split("=")[1] || null;
// --defaut="Arco Lounge,Heavy" : pour ces gammes seulement, les images sans
// signe distinctif tombent sur la fiche vide de la gamme. À n'utiliser que
// lorsqu'on a regardé le dossier et qu'on sait ce qu'il montre — c'est une
// décision humaine, pas une règle.
const DEFAUT = (process.argv.find((a) => a.startsWith("--defaut=")) || "").split("=").slice(1).join("=")
  .split(",").map((s) => s.trim()).filter(Boolean);

const RACINE = "C:/Users/akeys/Desktop/Matt/COTEBURO-MEDIAS/resourcesLENIVET/resourcesLENIVETv2/resources LENIVET";
const FICHES = "prisma/officepro-fiches.json";
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const IMAGES = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_PAR_FICHE = 10;

// Réglages de rognage, repris à l'identique de prisma/officepro-rogner.mjs.
const MARGE = 0.04;
const SEUIL_FOND = 244;
const DEJA_PLEIN = 0.92;
const MAX_COTE = 2200;
const SEUIL_BLANC = 245;
const TAILLE_TEST = 48;
const SCENE = 0.40;

// Fichiers qui ne montrent pas le produit. Reprend la liste du premier script,
// plus « Generation IA » : le dossier ARCO LOUNGE en contient neuf, et des
// visuels fabriqués n'ont pas à illustrer un catalogue sans décision explicite.
// « Shema technique ARCO LOUNGE.jpg » : le c manque dans le fichier livré, et
// le schéma passait au travers. Le h seul suffit à le reconnaître.
const REBUT = /notice|montage|sc?h[ée]ma|^ft |fiche tech|capture d.?[ée]cran|gemini_generated|generation ia|[-_ ]copie|thumbs\.db|logo|charte|nuancier/i;
// Mise en situation : gardée, mais passée après les packshots.
// 场景 est le nom des sous-dossiers de scènes livrés par TECSY.
const AMBIANCE = /ambiance|amb[ _-]|bodegon|shooting|workspace|photographe|场景/i;

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

// Proportion de blanc, pour ne pas rogner une mise en situation.
async function partBlanche(chemin) {
  try {
    const { data, info } = await sharp(chemin).removeAlpha()
      .resize(TAILLE_TEST, TAILLE_TEST, { fit: "contain", background: "#ffffff" })
      .raw().toBuffer({ resolveWithObject: true });
    const total = info.width * info.height;
    let blancs = 0;
    for (let k = 0; k < total; k++) {
      const o = k * info.channels;
      if (data[o] > SEUIL_BLANC && data[o + 1] > SEUIL_BLANC && data[o + 2] > SEUIL_BLANC) blancs++;
    }
    return blancs / total;
  } catch { return null; }
}

// Rogne les marges uniformes, sans mise au carré — le cadre d'affichage est
// carré et applique « contain », une image au ratio du produit s'y déploie
// mieux qu'une image déjà carrée.
async function preparer(chemin, estScene) {
  const entree = sharp(chemin).flatten({ background: "#ffffff" });
  const { width: w0, height: h0 } = await entree.metadata();
  const finir = (p) => p.resize(MAX_COTE, MAX_COTE, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer();
  const telQuel = async () => ({ buffer: await finir(entree.clone()), rogne: false, avant: `${w0}×${h0}`, apres: null });

  if (estScene) return telQuel();

  let rogne;
  try {
    rogne = await entree.clone().trim({ background: "#ffffff", threshold: 255 - SEUIL_FOND }).toBuffer({ resolveWithObject: true });
  } catch { return telQuel(); }

  const { width: w, height: h } = rogne.info;
  if (!w || !h || (w > w0 * DEJA_PLEIN && h > h0 * DEJA_PLEIN)) return telQuel();

  const marge = Math.round(Math.max(w, h) * MARGE);
  const buffer = await finir(
    sharp(rogne.data).extend({ top: marge, bottom: marge, left: marge, right: marge, background: "#ffffff" })
  );
  return { buffer, rogne: true, avant: `${w0}×${h0}`, apres: `${w + marge * 2}×${h + marge * 2}` };
}

async function envoyer(buffer, publicId) {
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
  console.log(`dossier : ${RACINE}\n`);

  const fiches = JSON.parse(await readFile(FICHES, "utf8"));
  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marque: { slug: "officepro" } } },
    select: { id: true, nom: true, images: true, gamme: { select: { nom: true, slug: true } } },
  });
  const parNom = new Map(vitrines.map((v) => [cle(v.nom), v]));

  // Les 63 fiches concourent, y compris celles déjà illustrées : c'est la
  // seule façon qu'une photo revenant à une fiche illustrée ne retombe pas
  // par défaut sur une fiche vide de la même gamme.
  const connues = fiches.map((f) => ({ ...f, vitrine: parNom.get(cle(f.nom)) })).filter((f) => f.vitrine);
  const vide = (f) => !f.vitrine.images || f.vitrine.images.length === 0;
  const cibles = connues.filter(vide).filter((f) => !DEMANDEES.length || DEMANDEES.some((d) => cle(f.gamme).includes(cle(d))));
  console.log(`${connues.length} fiches en base · ${connues.filter(vide).length} sans image · ${cibles.length} retenues ici\n`);

  const parGamme = new Map();
  for (const f of connues) {
    if (!parGamme.has(f.gamme)) parGamme.set(f.gamme, []);
    parGamme.get(f.gamme).push(f);
  }

  // La gamme se lit sur TOUT le chemin, la plus longue l'emporte.
  const gammes = [...parGamme.keys()].map((g) => ({ nom: g, k: cle(g) })).sort((a, b) => b.k.length - a.k.length);
  const principaleDe = new Map(
    [...parGamme.entries()].map(([g, fs]) => [g, [...fs].sort((a, b) => b.declinaisons.length - a.declinaisons.length)[0]])
  );
  // Fiche vide la plus lourde d'une gamme — cible du repli --defaut.
  const videPrincipaleDe = new Map(
    [...parGamme.entries()].map(([g, fs]) => [g, [...fs].filter(vide).sort((a, b) => b.declinaisons.length - a.declinaisons.length)[0]])
  );

  const famille = (g) => cle(g.split(" ")[0]);
  const parFamille = new Map();
  for (const [g, fs] of parGamme) {
    const f = famille(g);
    if (!parFamille.has(f)) parFamille.set(f, []);
    parFamille.get(f).push(...fs);
  }

  const contient = (k, mot) => !!mot && (k.includes(mot) || (mot.endsWith("S") && k.includes(mot.slice(0, -1))));

  // Référence fournisseur dans le nom de fichier : « ART_TSE05NR_IS_0.jpg ».
  //
  // C'est le seul signal sûr de ce second envoi, et le plus fort : il désigne
  // une déclinaison, donc une fiche. On indexe sur la racine de la référence
  // (ARC01BE-M1 → ARC01BE), et on écarte les racines partagées par plusieurs
  // fiches, qui ne trancheraient rien.
  const parRacine = new Map();
  for (const f of connues) {
    for (const d of f.declinaisons || []) {
      const r = cle((d.referenceFournisseur || "").split("-")[0]);
      if (r.length < 5) continue;
      if (!parRacine.has(r)) parRacine.set(r, new Set());
      parRacine.get(r).add(f.nom);
    }
  }
  const racines = [...parRacine.entries()].filter(([, s]) => s.size === 1)
    .map(([r, s]) => ({ r, nom: [...s][0] })).sort((a, b) => b.r.length - a.r.length);
  const parNomFiche = new Map(connues.map((f) => [f.nom, f]));

  const tous = await fichiers(RACINE);
  const attribution = new Map(connues.map((f) => [f.nom, []]));
  let rebut = 0, horsGamme = 0;
  const cheminsHorsGamme = [];
  // Images rattachées à une gamme mais à aucune fiche : aucun mot de type, pas
  // de référence. Ce second envoi en est presque entièrement fait.
  const indecises = new Map();

  for (const rel of tous) {
    if (REBUT.test(rel)) { rebut++; continue; }
    const k = cle(rel);

    const gamme = gammes.find((g) => k.includes(g.k));
    if (!gamme) { horsGamme++; cheminsHorsGamme.push(rel); continue; }

    // 1. La référence tranche, quand elle est là.
    const parRef = racines.find((x) => k.includes(x.r));
    let cible = parRef ? parNomFiche.get(parRef.nom) : null;
    let parQualifiant = false;

    // 2. Sinon, le qualifiant puis le type, cherchés dans toute la famille.
    if (!cible) {
      let meilleur = 0;
      for (const f of parFamille.get(famille(gamme.nom)) || []) {
        const kqBrut = f.qualifiant ? cle(f.qualifiant) : "";
        const kq = kqBrut && !cle(f.gamme).includes(kqBrut) ? kqBrut : "";
        const kt = f.type ? cle(f.type) : "";
        let s = 0;
        if (contient(k, kq)) s += kq.length * 2;
        if (contient(k, kt)) s += kt.length;
        if (s > meilleur || (s === meilleur && s > 0 && f.gamme === gamme.nom)) {
          meilleur = s; cible = f; parQualifiant = contient(k, kq);
        }
      }
    }

    // 3. Pas de repli sur la fiche principale de la gamme.
    //
    // Le premier import le faisait, et c'était le bon compromis : toutes les
    // fiches étaient vides, 80 % de rattachements à corriger valaient mieux
    // que 61 fiches à illustrer à la main. Ici la situation est inverse — les
    // fiches encore vides sont surtout des accessoires, et le repli ferait
    // tomber les 112 photos du fauteuil Lando sur son appui-tête. On préfère
    // dire « je ne sais pas » et laisser la répartition à l'admin.
    // Sauf pour les gammes explicitement citées en --defaut, où l'image revient
    // à la fiche vide de la gamme — celle qui a le plus de déclinaisons s'il y
    // en a plusieurs.
    let parDefaut = false;
    if (!cible && DEFAUT.some((d) => cle(gamme.nom).includes(cle(d)))) {
      cible = videPrincipaleDe.get(gamme.nom) || null;
      parDefaut = !!cible;
    }

    if (!cible) {
      if (!indecises.has(gamme.nom)) indecises.set(gamme.nom, []);
      indecises.get(gamme.nom).push(rel);
      continue;
    }

    if (TRACER && rel.toLowerCase().includes(TRACER.toLowerCase())) {
      console.log(`  ${rel}\n     gamme = ${gamme.nom} · fiche = ${cible.nom} ${parRef ? `(référence ${parRef.r})` : parQualifiant ? "(qualifiant)" : "(type)"}`);
    }

    attribution.get(cible.nom).push({
      chemin: join(RACINE, rel),
      rel,
      parReference: !!parRef,
      parType: !parDefaut,
      parQualifiant,
      parDefaut,
      ambiance: AMBIANCE.test(rel),
    });
  }

  // Tri avant le plafond de 10 — c'est lui qui décide ce qui reste.
  //
  // Le nom de fichier ne suffit pas à reconnaître une mise en situation : le
  // dossier ARCO LOUNGE livre quatorze photos « 20250922_1644xx.jpg », prises
  // au téléphone en showroom, qu'aucun mot ne distingue. Triées sur le nom,
  // elles raflaient les dix places et les packshots studio « ARCO LOUNGE
  // Grey.jpg » tombaient. On mesure donc la part de blanc, comme le fait
  // officepro-rogner.mjs pour décider d'un rognage, et le packshot passe
  // devant.
  //
  // La mesure ne porte que sur les candidates des fiches vides : ce sont les
  // seules qu'on écrira, et ouvrir 499 images pour rien serait long.
  for (const f of cibles) {
    for (const img of attribution.get(f.nom)) {
      const pb = await partBlanche(img.chemin);
      img.blanc = pb;
      img.scene = img.ambiance || (pb !== null && pb < SCENE);
    }
  }
  for (const [nom, liste] of attribution) {
    liste.sort((a, b) =>
      Number(a.scene ?? a.ambiance) - Number(b.scene ?? b.ambiance) ||
      Number(b.parReference) - Number(a.parReference) ||
      Number(b.parQualifiant) - Number(a.parQualifiant) ||
      Number(b.parType) - Number(a.parType) ||
      a.rel.localeCompare(b.rel, "fr"));
    attribution.set(nom, liste.slice(0, MAX_PAR_FICHE));
  }

  const retenues = cibles.reduce((s, f) => s + attribution.get(f.nom).length, 0);
  const captees = connues.filter((f) => !vide(f)).reduce((s, f) => s + attribution.get(f.nom).length, 0);

  const nIndecises = [...indecises.values()].reduce((s, l) => s + l.length, 0);
  console.log(`${tous.length} images parcourues · ${rebut} écartées (notices, schémas, IA, nuanciers) · ${horsGamme} sans gamme reconnue`);
  console.log(`${nIndecises} rattachées à une gamme mais à aucune fiche — aucun signe distinctif dans le chemin`);
  console.log(`${retenues} retenues pour les fiches vides · ${captees} revenant à des fiches déjà illustrées (non touchées)\n`);

  // ── Ce qui serait posé, fiche par fiche ──
  const servies = cibles.filter((f) => attribution.get(f.nom).length);
  const vides = cibles.filter((f) => !attribution.get(f.nom).length);

  console.log(`${servies.length}/${cibles.length} fiches seraient illustrées\n`);

  for (const f of servies) {
    const liste = attribution.get(f.nom);
    console.log(`${f.nom}  (${f.gamme}) — ${liste.length} image(s)`);
    for (const img of liste) {
      let info = "";
      try {
        const r = await preparer(img.chemin, img.scene);
        info = r.rogne ? `rogné ${r.avant} → ${r.apres}` : img.scene ? `scène, non rogné (${r.avant})` : `déjà cadré (${r.avant})`;
      } catch (e) { info = `ILLISIBLE : ${e.message}`; }
      console.log(`    ${img.parReference ? "[réf]   " : img.parQualifiant ? "[qualif]" : img.parDefaut ? "[défaut]" : "[type]  "} ${img.rel}`);
      console.log(`             ${info}${img.blanc !== null ? ` · ${Math.round(img.blanc * 100)} % de blanc` : ""}`);
    }
    console.log("");
  }

  if (vides.length) {
    console.log(`${vides.length} fiches resteraient sans image — rien dans ce dossier :`);
    for (const f of vides) console.log(`    ${f.nom}  (${f.gamme})`);
    console.log("");
  }

  if (indecises.size) {
    console.log("images sans signe distinctif, par gamme — à répartir à la main :");
    for (const [g, l] of [...indecises].sort((a, b) => b[1].length - a[1].length)) {
      const fs = parGamme.get(g) || [];
      const vides = fs.filter(vide).map((f) => f.nom);
      console.log(`    ${String(l.length).padStart(3)}  ${g.padEnd(22)} ${vides.length ? `fiche(s) vide(s) : ${vides.join(", ")}` : "aucune fiche vide dans cette gamme"}`);
    }
    console.log("");
  }

  if (cheminsHorsGamme.length) {
    console.log(`${cheminsHorsGamme.length} images sans gamme reconnue, dont :`);
    for (const r of cheminsHorsGamme.slice(0, 10)) console.log(`    ${r}`);
    console.log("");
  }

  if (!APPLIQUER) {
    console.log("Simulation terminée. Relancer avec --appliquer.");
    return;
  }
  if (!CLOUD || !PRESET) { console.log("Clés Cloudinary absentes du .env."); return; }

  await mkdir("prisma/sauvegardes", { recursive: true });
  const sauv = `prisma/sauvegardes/officepro-images-v2-avant-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(sauv, JSON.stringify(cibles.map((f) => ({ id: f.vitrine.id, nom: f.nom, images: f.vitrine.images })), null, 2), "utf8");
  console.log(`Sauvegarde des galeries actuelles : ${sauv}\n`);

  let envoyees = 0, echecs = 0;
  for (const f of servies) {
    const urls = [];
    for (const img of attribution.get(f.nom)) {
      try {
        // img.scene a déjà été mesuré au moment du tri.
        const { buffer } = await preparer(img.chemin, img.scene);
        const id = `coteburo/officepro/${f.vitrine.gamme.slug}/${nettoyer(basename(img.rel, extname(img.rel)))}`;
        urls.push(await envoyer(buffer, id));
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
