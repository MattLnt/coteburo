// Rogne les visuels OfficePro déjà en ligne, aux réglages de Buronomic.
//
// L'import OfficePro redimensionnait sans rogner : les packshots gardaient
// d'énormes marges blanches, et un siège occupant 4 % du cadre se lit comme un
// carré vide dans une grille de catalogue. Mesuré : médiane à 74 % de blanc.
//
// On repart des fichiers d'origine sur le disque, pas des JPEG déjà envoyés —
// recomprimer un JPEG deux fois abîme pour rien. Le lien se fait par
// l'identifiant Cloudinary, qui reprend le nom du fichier source.
//
// L'image rognée est envoyée sous un identifiant SUFFIXÉ, et non en écrasant
// l'originale. Vérifié : le préréglage non signé n'écrase pas. Réenvoyer le
// même identifiant renvoie l'asset existant, inchangé, avec un statut 200 et
// la même version — un premier essai a ainsi annoncé « 210 rognées » sans que
// rien ne bouge en ligne.
//
// L'alternative propre serait d'activer « Overwrite » sur le préréglage dans
// la console Cloudinary ; elle demande une intervention hors du code.
//
// Les galeries sont mises à jour position par position, sans changer l'ordre :
// celui-ci a été revu à la main et ne doit pas bouger.
//
// Les mises en situation ne sont pas rognées : le décor fait partie de l'image.
//
//   node prisma/officepro-rogner.mjs
//   node prisma/officepro-rogner.mjs --appliquer
import "dotenv/config";
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const RACINE = "C:/Users/pages/Bureau/Matt/projets/COTEBURO-MEDIAS/resourcesLENIVET/resourcesLENIVET";
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const IMAGES = [".jpg", ".jpeg", ".png", ".webp"];

// Réglages repris à l'identique de prisma/reimport-images.mjs.
const MARGE = 0.04;
const SEUIL_FOND = 244;
const DEJA_PLEIN = 0.92;
const MAX_COTE = 2200;

// Suffixe des images rognées : l'originale reste en place, faute de pouvoir
// l'écraser avec un préréglage non signé.
const SUFFIXE = "-rogne";

// Une scène ne se rogne pas : son fond est le sujet.
const SEUIL_BLANC = 245;
const TAILLE_TEST = 48;
const SCENE = 0.40;

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

async function rogner(chemin) {
  const entree = sharp(chemin).flatten({ background: "#ffffff" });
  const { width: w0, height: h0 } = await entree.metadata();
  const finir = (p) => p.resize(MAX_COTE, MAX_COTE, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer();
  const telQuel = async () => ({ buffer: await finir(entree.clone()), inchange: true, avant: `${w0}×${h0}` });

  let rogne;
  try {
    rogne = await entree.clone().trim({ background: "#ffffff", threshold: 255 - SEUIL_FOND }).toBuffer({ resolveWithObject: true });
  } catch { return telQuel(); }

  const { width: w, height: h } = rogne.info;
  if (!w || !h || (w > w0 * DEJA_PLEIN && h > h0 * DEJA_PLEIN)) return telQuel();

  // Marge uniforme, et surtout PAS de mise au carré.
  //
  // Buronomic centre le produit dans un carré blanc : ses captures pCon sont
  // déjà presque carrées, l'ajout est négligeable. Les photos OfficePro ont des
  // formats très variés, et les mettre au carré rajoute le blanc qu'on vient
  // d'enlever. Mesuré sur 18 packshots : le carré forcé ne gagne rien en
  // moyenne et dégrade 10 images sur 18 — jusqu'à 73 % → 90 % de blanc sur un
  // produit allongé. À ratio conservé, on gagne 10 points.
  //
  // Le cadre d'affichage est carré des deux côtés du site, et il applique
  // « contain » : une image au ratio du produit s'y déploie sur toute la
  // hauteur ou toute la largeur, ce qu'une image déjà carrée ne fait jamais.
  const marge = Math.round(Math.max(w, h) * MARGE);
  const buffer = await finir(
    sharp(rogne.data).extend({ top: marge, bottom: marge, left: marge, right: marge, background: "#ffffff" })
  );
  return { buffer, inchange: false, avant: `${w0}×${h0}`, apres: `${w + marge * 2}×${h + marge * 2}` };
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

  // Index des fichiers source, par nom nettoyé — celui qui sert d'identifiant.
  const index = new Map();
  for (const rel of await fichiers(RACINE)) {
    const cle = nettoyer(basename(rel, extname(rel)));
    if (!index.has(cle)) index.set(cle, rel);
  }
  console.log(`${index.size} fichiers source indexés`);

  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marque: { slug: "officepro" } }, images: { isEmpty: false } },
    select: { id: true, nom: true, images: true, imageUrl: true },
  });

  const travaux = [];
  let introuvables = 0, scenes = 0, deja = 0;

  for (const v of vitrines) {
    for (const [i, url] of v.images.entries()) {
      const m = /\/upload\/v\d+\/(.+)\.[a-z0-9]+$/i.exec(decodeURIComponent(url));
      if (!m) { introuvables++; continue; }
      const publicId = m[1];
      if (publicId.endsWith(SUFFIXE)) { deja++; continue; }
      const cle = basename(publicId);
      const rel = index.get(cle);
      if (!rel) { introuvables++; continue; }

      const chemin = join(RACINE, rel);
      const blanc = await partBlanche(chemin);
      if (blanc != null && blanc < SCENE) { scenes++; continue; }

      travaux.push({ v, i, url, publicId, chemin, rel, blanc });
    }
  }

  const total = vitrines.reduce((s, v) => s + v.images.length, 0);
  console.log(`${total} images en base · ${travaux.length} à rogner · ${scenes} mises en situation laissées telles quelles · ${introuvables} sans fichier source\n`);

  // Échantillon mesuré, pour voir le gain avant d'envoyer quoi que ce soit.
  const pas = Math.max(1, Math.floor(travaux.length / 8));
  console.log("échantillon :");
  for (const t of travaux.filter((_, i) => i % pas === 0).slice(0, 8)) {
    const r = await rogner(t.chemin);
    console.log(`   ${basename(t.rel).slice(0, 38).padEnd(40)} ${r.avant} → ${r.inchange ? "inchangé" : r.apres}`);
  }

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer."); return; }
  if (!CLOUD || !PRESET) { console.log("Clés Cloudinary absentes du .env."); return; }

  await mkdir("prisma/sauvegardes", { recursive: true });
  const f = `prisma/sauvegardes/officepro-avant-rognage-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(f, JSON.stringify(vitrines, null, 2), "utf8");
  console.log(`\nSauvegarde des galeries : ${f}\n`);

  // Nouvelles URL par vitrine, à la position d'origine.
  const nouvelles = new Map(vitrines.map((v) => [v.id, [...v.images]]));
  let rognees = 0, inchangees = 0, echecs = 0;

  for (const t of travaux) {
    try {
      const r = await rogner(t.chemin);
      const url = await envoyer(r.buffer, t.publicId + SUFFIXE);
      nouvelles.get(t.v.id)[t.i] = url;
      if (r.inchange) inchangees++; else rognees++;
    } catch (e) { echecs++; console.log(`   ✗ ${basename(t.rel)} : ${e.message}`); }
  }

  for (const v of vitrines) {
    const images = nouvelles.get(v.id);
    // La vignette suit sa position dans la galerie, qui n'a pas bougé.
    const iVignette = v.images.indexOf(v.imageUrl);
    await prisma.produitVitrine.update({
      where: { id: v.id },
      data: { images, imageUrl: iVignette >= 0 ? images[iVignette] : images[0] },
    });
  }

  console.log(`\n${rognees} rognées · ${inchangees} déjà pleines · ${echecs} échecs · ${vitrines.length} galeries mises à jour`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
