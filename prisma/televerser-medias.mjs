// Envoie sur Cloudinary ce que contient l'arborescence CATALOGUE-2026, et
// rattache les URL aux fiches et aux nuanciers.
//
// En simulation par défaut. Il faut --appliquer pour envoyer.
//
//   node prisma/televerser-medias.mjs
//   node prisma/televerser-medias.mjs --appliquer
//   node prisma/televerser-medias.mjs --appliquer --marque=sokoa
//   node prisma/televerser-medias.mjs --appliquer --nuanciers-seuls
//
// CE QU'IL LIT DANS UN NOM DE FICHIER
//   Deux choses, pas davantage.
//
//     l'ordre alphabétique  la première image d'un dossier devient la
//                           vignette. Pour imposer laquelle, préfixer 01-,
//                           02-, etc.
//     le préfixe « amb »    l'image part en fin de galerie : c'est une mise
//                           en situation, pas un packshot.
//
//   Tout le reste du nom est libre et conservé tel quel. Inutile de
//   reproduire le « <référence>_<décor>_<vue> » des captures pCon : ce
//   format vient du configurateur, pas d'une exigence du site.
//
// LES DÉPÔTS _A-TRIER NE SONT PAS ENVOYÉS
//   Ils contiennent ce qu'on n'a pas su attribuer à une fiche. Les envoyer
//   reviendrait à publier des visuels sans savoir sur quelle page. Ils
//   attendent d'être répartis à la main.
//
// L'IDENTIFIANT CLOUDINARY EST DÉTERMINISTE
//   Il se déduit du chemin. Sans cela, le préréglage non signé invente un
//   identifiant aléatoire : le libellé du décor est perdu, /admin/detourage
//   ne reconnaît plus ses fichiers « _cadre » et duplique à chaque passage.
//   Avec, un second envoi ÉCRASE au lieu d'ajouter — le script est donc
//   rejouable.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, extname, basename } from "node:path";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const NUANCIERS_SEULS = process.argv.includes("--nuanciers-seuls");
const FILTRE_MARQUE = ((process.argv.find((a) => a.startsWith("--marque=")) || "")
  .slice(9) || null)?.toLowerCase() || null;

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const MEDIAS = ["C:", "Users", "akeys", "Desktop", "Matt", "COTEBURO-MEDIAS"].join("/");
const CIBLE = `${MEDIAS}/CATALOGUE-2026`;
const IMAGES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const titre = (t) => console.log(`\n${"═".repeat(68)}\n${t}\n${"═".repeat(68)}`);
const mo = (o) => `${(o / 1024 / 1024).toFixed(1)} Mo`;

const slug = (s) => String(s ?? "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Une mise en situation : elle va en fin de galerie, jamais en vignette. */
const estAmbiance = (nom) => /^amb/i.test(nom);

/** L'identifiant Cloudinary d'un fichier, déduit de son chemin. */
const publicId = (rel) => `coteburo/${rel.split("/").map(slug).join("/")}`
  .replace(/\.[a-z0-9]+$/i, "");

async function envoyer(chemin, id) {
  const buffer = await readFile(chemin);
  const form = new FormData();
  form.append("file", new Blob([buffer]), basename(chemin));
  form.append("upload_preset", PRESET);
  form.append("public_id", id);
  const rep = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
    { method: "POST", body: form });
  const data = await rep.json().catch(() => ({}));
  if (!rep.ok || !data.secure_url) {
    throw new Error(data?.error?.message || `HTTP ${rep.status}`);
  }
  return data.secure_url;
}

/** Les fichiers d'un dossier, triés, ambiances rejetées en fin, sans doublon.
 *
 * Cent quatre-vingt-sept captures pCon font double emploi : le configurateur
 * a déjà un décor sélectionné au chargement, si bien que la vue « par
 * défaut » et la vue de ce décor sont le MÊME rendu, octet pour octet.
 * Publiées telles quelles, elles mettraient le visuel en vignette et une
 * seconde fois dans la galerie. On compare donc les contenus, pas les noms —
 * ce qui protège aussi des doublons que le tri manuel pourrait introduire.
 */
async function visuelsDe(dossier) {
  let noms = [];
  try { noms = await readdir(dossier); } catch { return []; }
  const images = noms.filter((n) => IMAGES.has(extname(n).toLowerCase())).sort();
  const ordonnees = [
    ...images.filter((n) => !estAmbiance(n)),
    ...images.filter((n) => estAmbiance(n)),
  ];
  const vus = new Set();
  const retenues = [];
  for (const n of ordonnees) {
    let h;
    try {
      h = createHash("md5").update(await readFile(join(dossier, n))).digest("hex");
    } catch { continue; }
    if (vus.has(h)) continue;
    vus.add(h);
    retenues.push(n);
  }
  return retenues;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — les images partent sur Cloudinary ═══\n"
    : "═══ SIMULATION — rien n'est envoyé ═══\n");
  if (APPLIQUER && (!CLOUD || !PRESET)) {
    console.error("Clés Cloudinary absentes de l'environnement. On s'arrête.");
    process.exitCode = 1;
    return;
  }

  // ── Les fiches ──
  const vitrines = await prisma.produitVitrine.findMany({
    select: { id: true, nom: true, imageUrl: true, images: true,
      gamme: { select: { nom: true, marque: { select: { slug: true } } } } },
  });
  // On retrouve le dossier d'une fiche comme les scripts de rangement l'ont
  // nommé : marque / gamme / produit, chacun assaini et tronqué.
  const INTERDITS = /[<>:"/\\|?*]|[\p{Cc}]/gu;
  const empreinte = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36).slice(0, 4);
  };
  const nomSain = (s, max) => {
    const p = String(s ?? "").replace(INTERDITS, "-")
      .replace(/\s+/g, " ").replace(/[. ]+$/, "").trim();
    return p.length <= max ? (p || "sans-nom") : `${p.slice(0, max - 5).trim()}~${empreinte(p)}`;
  };

  const travaux = [];
  let sansDossier = 0;
  if (!NUANCIERS_SEULS) {
    for (const v of vitrines) {
      const marque = v.gamme.marque.slug;
      if (FILTRE_MARQUE && marque !== FILTRE_MARQUE) continue;
      const dossier = [CIBLE, marque, nomSain(v.gamme.nom, 30), nomSain(v.nom, 58)].join("/");
      const visuels = await visuelsDe(dossier);
      if (!visuels.length) { sansDossier += 1; continue; }
      travaux.push({ type: "fiche", id: v.id, nom: v.nom, marque, dossier, visuels });
    }
  }

  // ── Les pastilles ──
  const modeles = await prisma.finitionModele.findMany({
    select: { id: true, nom: true, imageUrl: true,
      palette: { select: { nom: true, marque: true } } },
  });
  const pastilles = [];
  let correspondance = [];
  try {
    const csv = await readFile(`${CIBLE}/_NUANCIERS/_CORRESPONDANCE.csv`, "utf8");
    correspondance = csv.trim().split("\n").slice(1).map((l) => l.split(";"));
  } catch { /* pas de nuanciers rangés */ }
  const parModele = new Map();
  for (const [marque, palette, modele, fichier] of correspondance) {
    parModele.set(`${marque}|${palette}|${modele}`, `${CIBLE}/_NUANCIERS/${fichier}`);
  }
  for (const m of modeles) {
    const chemin = parModele.get(`${m.palette?.marque}|${m.palette?.nom}|${m.nom}`);
    if (chemin) pastilles.push({ id: m.id, nom: m.nom, palette: m.palette.nom, chemin });
  }

  titre("CE QUI SERAIT ENVOYÉ");
  const nImages = travaux.reduce((n, t) => n + t.visuels.length, 0);
  console.log(`\n   fiches illustrées         ${String(travaux.length).padStart(5)}`
    + `   ${nImages} images`);
  console.log(`   fiches sans image         ${String(sansDossier).padStart(5)}`
    + "   (dossier vide, rien à envoyer)");
  console.log(`   pastilles de nuancier     ${String(pastilles.length).padStart(5)}`
    + `   sur ${modeles.length} modèles`);

  const parMarque = new Map();
  for (const t of travaux) {
    if (!parMarque.has(t.marque)) parMarque.set(t.marque, { fiches: 0, images: 0 });
    parMarque.get(t.marque).fiches += 1;
    parMarque.get(t.marque).images += t.visuels.length;
  }
  console.log("\n   marque        fiches   images");
  for (const [m, e] of parMarque) {
    console.log(`   ${m.padEnd(13)}${String(e.fiches).padStart(6)}${String(e.images).padStart(9)}`);
  }

  titre("CE QUE CHAQUE FICHE RECEVRAIT");
  console.log("\n   Les trois premières, pour montrer l'ordre retenu :\n");
  for (const t of travaux.slice(0, 3)) {
    console.log(`   ${t.nom}`);
    t.visuels.forEach((v, i) => {
      const role = i === 0 ? "vignette" : estAmbiance(v) ? "ambiance" : "galerie";
      console.log(`      ${role.padEnd(9)} ${v}`);
    });
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour envoyer.");
    return;
  }

  titre("ENVOI");
  let n = 0;
  const echecs = [];
  for (const t of travaux) {
    const urls = [];
    for (const v of t.visuels) {
      const rel = `${t.dossier.slice(CIBLE.length + 1)}/${v}`;
      try {
        urls.push(await envoyer(join(t.dossier, v), publicId(rel)));
        n += 1;
        if (n % 50 === 0) process.stdout.write(`\r   ${n} / ${nImages} images`);
      } catch (e) {
        echecs.push(`${rel} : ${e.message}`);
      }
    }
    if (!urls.length) continue;
    // La première est la vignette, les suivantes la galerie.
    await prisma.produitVitrine.update({
      where: { id: t.id },
      data: { imageUrl: urls[0], images: urls.slice(1) },
    });
  }
  console.log(`\r   ${n} images envoyées, ${echecs.length} en échec`);
  for (const e of echecs.slice(0, 10)) console.log(`      ⚠ ${e}`);

  let nP = 0;
  for (const p of pastilles) {
    try {
      const url = await envoyer(p.chemin, publicId(
        `_NUANCIERS/${p.palette}/${basename(p.chemin)}`));
      await prisma.finitionModele.update({ where: { id: p.id }, data: { imageUrl: url } });
      nP += 1;
    } catch (e) {
      echecs.push(`pastille ${p.nom} : ${e.message}`);
    }
  }
  console.log(`   ${nP} pastilles envoyées`);

  titre("CONTRÔLE");
  console.log(`   fiches avec vignette   ${await prisma.produitVitrine.count({ where: { imageUrl: { not: null } } })} / ${vitrines.length}`);
  console.log(`   modèles avec pastille  ${await prisma.finitionModele.count({ where: { imageUrl: { not: null } } })} / ${modeles.length}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
