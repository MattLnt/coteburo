import "dotenv/config";
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

// Réimport des captures Buronomic, avec un nom de fichier porteur.
//
// Trois problèmes ont la même cause — le preset Cloudinary non signé attribue
// un identifiant aléatoire, et le nom d'origine est perdu :
//
//  1. Le décor du fichier (« ED705N_Blanc_Chêne-fil.png ») disparaît, donc
//     rien à afficher en pastille sur la photo.
//  2. /admin/detourage nomme ses fichiers « …_cadre.jpg » puis teste
//     url.includes("_cadre") pour ne pas retraiter. L'identifiant aléatoire
//     écrase ce nom : le garde-fou ne se déclenche jamais, et chaque passage
//     duplique les images.
//  3. estAmbiance() cherche « amb_ » ou « bodegon » dans l'URL, en vain.
//
// Un public_id déterministe les règle tous les trois : l'envoi écrase au lieu
// de dupliquer, et le nom porte le libellé jusqu'à la galerie. Aucun
// rapprochement avec le nuancier : le nom du fichier fait foi.
//
//   node prisma/reimport-images.mjs                      → simulation
//   node prisma/reimport-images.mjs Cohésion --appliquer → une gamme, pour de vrai
//   node prisma/reimport-images.mjs --appliquer          → tout

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const DEMANDEES = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const RACINE = "C:/Users/pages/Bureau/Matt/projets/COTEBURO-MEDIAS/Buronomic";
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const IMAGES = [".png", ".jpg", ".jpeg", ".webp"];

// Reprend à l'identique les réglages de /admin/detourage, pour que le rendu
// soit le même des deux côtés.
const MARGE = 0.04;       // marge autour du produit, en part de sa plus grande dimension
const SEUIL_FOND = 244;   // au-delà, le pixel est du fond ; les captures pCon ont un blanc dégradé
const DEJA_PLEIN = 0.92;  // le produit remplit déjà le cadre : rien à rogner

// Une ambiance montre le produit en situation : ni rognage — le décor fait
// partie de l'image — ni pastille.
const MOTS_AMBIANCE = ["amb_", "amb-", "ambiance", "_amb", "bodegon"];

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const estAmbiance = (nom) => MOTS_AMBIANCE.some((m) => norm(nom).includes(m));

// Le nom est conservé tel quel, accents compris : c'est lui qui porte le
// libellé de la pastille. Seuls les caractères gênants dans une URL sautent.
const nettoyer = (s) => s.trim().replace(/\s+/g, "-").replace(/[?&#%\\/]/g, "");

// « ED705N_Blanc_Chêne-fil » → « Blanc · Chêne fil »
const libelleDe = (base) => base.split("_").slice(1).map((t) => t.replace(/-/g, " ").trim()).filter(Boolean).join(" · ");

async function fichiersDe(dossier) {
  try {
    return (await readdir(dossier, { withFileTypes: true }))
      .filter((e) => e.isFile() && IMAGES.includes(extname(e.name).toLowerCase()))
      .map((e) => e.name).sort();
  } catch { return []; }
}

// Rogne les marges uniformes et centre le produit dans un carré blanc.
// Même règle que le navigateur : seuil 244, marge 4 %, JPEG qualité 92.
async function rogner(chemin) {
  const entree = sharp(chemin).flatten({ background: "#ffffff" }); // la transparence devient blanche
  const { width: w0, height: h0 } = await entree.metadata();
  const tel_quel = async () => ({ buffer: await entree.clone().jpeg({ quality: 92 }).toBuffer(), inchange: true });

  let rogne;
  try {
    // threshold = 255 − SEUIL_FOND : l'écart toléré au blanc pur.
    rogne = await entree.clone()
      .trim({ background: "#ffffff", threshold: 255 - SEUIL_FOND })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return tel_quel();
  }

  const { width: w, height: h } = rogne.info;
  if (!w || !h || (w > w0 * DEJA_PLEIN && h > h0 * DEJA_PLEIN)) return tel_quel();

  const marge = Math.round(Math.max(w, h) * MARGE);
  const cote = Math.max(w, h) + marge * 2;
  const hautMarge = Math.round((cote - h) / 2);
  const gaucheMarge = Math.round((cote - w) / 2);

  const buffer = await sharp(rogne.data)
    .extend({
      top: hautMarge, bottom: cote - h - hautMarge,
      left: gaucheMarge, right: cote - w - gaucheMarge,
      background: "#ffffff",
    })
    .jpeg({ quality: 92 })
    .toBuffer();

  return { buffer, inchange: false, avant: `${w0}×${h0}`, apres: `${cote}×${cote}` };
}

async function envoyer(buffer, publicId) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "image/jpeg" }), "image.jpg");
  form.append("upload_preset", PRESET);
  // Le cœur du correctif : sans public_id, Cloudinary invente un identifiant
  // et le libellé est perdu.
  form.append("public_id", publicId);
  const rep = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: form });
  const data = await rep.json().catch(() => ({}));
  if (!rep.ok || !data.secure_url) throw new Error(data?.error?.message || `HTTP ${rep.status}`);
  return data.secure_url;
}

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION — rien n'est écrit ═══\n");
  if (APPLIQUER && (!CLOUD || !PRESET)) { console.log("Clés Cloudinary absentes du .env."); return; }

  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marque: { slug: "buronomic" } } },
    select: {
      id: true, nom: true, referenceUnitaire: true, declinaisons: true,
      gamme: { select: { slug: true, nom: true } },
    },
  });

  const refsDe = (v) => {
    const d = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    return [...(v.referenceUnitaire ? [v.referenceUnitaire] : []), ...d.map((x) => x.referenceFournisseur).filter(Boolean)]
      .map((r) => String(r).trim().toUpperCase()).filter(Boolean);
  };
  // Références les plus longues d'abord : « ED733 » doit l'emporter sur « ED73 ».
  const index = [];
  for (const v of vitrines) for (const r of refsDe(v)) index.push({ ref: r, v });
  index.sort((a, b) => b.ref.length - a.ref.length);

  // Le préfixe seul ne désigne pas une vitrine : 47 références sont partagées
  // par plusieurs fiches — « DQ35 » est à la fois la table de réunion Astro et
  // le bureau carré manager Astro Direction, « BT56 » le multiposte Astrolite
  // et son jumeau Partage. À égalité de longueur, l'ordre de la requête
  // tranchait, et toutes les captures d'une gamme partaient chez l'autre.
  //
  // Le dossier porte l'information : on cherche d'abord dans sa gamme, et on
  // ne retombe sur l'index global qu'à défaut — les accessoires sont rangés
  // ailleurs que dans le dossier du produit qu'ils accompagnent.
  //
  // Deux dossiers coexistent pour les gammes composées : « Astro Direction »,
  // créé par le script d'arborescence, et « Astro-Direction », créé par le
  // script de capture qui remplace les espaces par des tirets. On compare donc
  // sur les seules lettres et chiffres, comme l'import de photos d'origine.
  const cleDossier = (s) => norm(s).replace(/[^a-z0-9]/g, "");
  const indexParGamme = new Map();
  for (const e of index) {
    const cle = cleDossier(e.v.gamme.nom);
    if (!indexParGamme.has(cle)) indexParGamme.set(cle, []);
    indexParGamme.get(cle).push(e);
  }

  // Un dossier peut être plus fin que la gamme : « Quiétude-Coulissantes »
  // est le sous-dossier pCon des armoires à portes coulissantes, dont les
  // fiches sont dans la gamme Quiétude. À défaut de correspondance exacte, on
  // retient la clé de gamme la plus longue qui préfixe celle du dossier —
  // l'exactitude passe d'abord, « Essentielle » ne devant pas tomber sur
  // « Essentiel ».
  const clesGammes = [...indexParGamme.keys()].sort((a, b) => b.length - a.length);
  const gammeDuDossier = (d) => {
    const k = cleDossier(d);
    return indexParGamme.has(k) ? k : clesGammes.find((c) => k.startsWith(c)) || null;
  };

  const dossiers = (await readdir(RACINE, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const parVitrine = new Map();
  let total = 0, orphelins = 0, ambiances = 0;
  const orphelinsParDossier = {};

  for (const d of dossiers) {
    if (DEMANDEES.length && !DEMANDEES.some((n) => norm(d).includes(norm(n)))) continue;
    const local = indexParGamme.get(gammeDuDossier(d)) || [];
    for (const f of await fichiersDe(join(RACINE, d, "_captures"))) {
      total++;
      const base = basename(f, extname(f));
      const code = base.split("_")[0].toUpperCase();
      const v = (local.find((x) => code.startsWith(x.ref)) || index.find((x) => code.startsWith(x.ref)))?.v;
      if (!v) { orphelins++; orphelinsParDossier[d] = (orphelinsParDossier[d] || 0) + 1; continue; }
      const amb = estAmbiance(f);
      if (amb) ambiances++;
      const publicId = `coteburo/buronomic/${v.gamme.slug}/${nettoyer(base)}`;
      if (!parVitrine.has(v.id)) parVitrine.set(v.id, { v, images: [] });
      parVitrine.get(v.id).images.push({ chemin: join(RACINE, d, "_captures", f), publicId, base, ambiance: amb });
    }
  }

  console.log(`${total} captures · ${parVitrine.size} fiches concernées · ${orphelins} sans fiche · ${ambiances} ambiances\n`);

  if (!APPLIQUER) {
    // Taux, avant d'écrire quoi que ce soit.
    let avecLibelle = 0, sansLibelle = 0;
    const parGamme = {};
    for (const { v, images } of parVitrine.values()) {
      for (const i of images) {
        if (i.ambiance) continue;
        if (libelleDe(i.base)) avecLibelle++; else sansLibelle++;
      }
      parGamme[v.gamme.slug] ??= { fiches: 0, images: 0 };
      parGamme[v.gamme.slug].fiches++;
      parGamme[v.gamme.slug].images += images.length;
    }
    const retenues = avecLibelle + sansLibelle + ambiances;
    console.log(`Images retenues : ${retenues}`);
    console.log(`   avec pastille        : ${avecLibelle}  (${Math.round(avecLibelle / retenues * 100)} %)`);
    console.log(`   vue de base          : ${sansLibelle}`);
    console.log(`   ambiances            : ${ambiances}`);
    console.log(`
Répartition par gamme (${Object.keys(parGamme).length} gammes) :`);
    Object.entries(parGamme).sort((a, b) => b[1].images - a[1].images).slice(0, 12)
      .forEach(([g, d]) => console.log(`   ${String(d.images).padStart(4)} images  ${String(d.fiches).padStart(3)} fiches  ${g}`));
    if (orphelinsParDossier && Object.keys(orphelinsParDossier).length) {
      console.log(`
Captures sans fiche, par dossier :`);
      Object.entries(orphelinsParDossier).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .forEach(([d, n]) => console.log(`   ${String(n).padStart(4)}  ${d}`));
    }
    console.log("");
    let n = 0;
    for (const { v, images } of parVitrine.values()) {
      if (n++ >= 5) break;
      console.log(v.nom);
      for (const i of images.slice(0, 4)) {
        const l = libelleDe(i.base);
        const suffixe = i.ambiance ? "[ambiance : ni rognage ni pastille]" : l ? `pastille « ${l} »` : "(vue de base)";
        console.log(`   ${i.publicId}   ${suffixe}`);
      }
      if (images.length > 4) console.log(`   … ${images.length - 4} autres`);
    }
    console.log("\nSimulation terminée. Relancer avec --appliquer.");
    return;
  }

  // Les URLs actuelles sont remplacees en base : on les sauvegarde d abord,
  // les anciens assets restant par ailleurs sur Cloudinary.
  await mkdir("prisma/sauvegardes", { recursive: true });
  const avant = await prisma.produitVitrine.findMany({
    where: { id: { in: [...parVitrine.keys()] } },
    select: { id: true, nom: true, images: true, imageUrl: true },
  });
  const fichierSauv = `prisma/sauvegardes/images-avant-reimport-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(fichierSauv, JSON.stringify(avant, null, 2), "utf8");
  console.log(`Sauvegarde des URLs actuelles : ${fichierSauv}  (${avant.length} fiches)
`);

  let envoyees = 0, rognees = 0, echecs = 0;
  for (const { v, images } of parVitrine.values()) {
    // Les vues nommées passent devant : triée par nom de fichier, la vue de
    // base sans suffixe arrivait première et la fiche s'ouvrait sur une photo
    // sans pastille. Partition stable, l'ordre alphabétique des décors tient.
    const rang = (i) => (!i.ambiance && libelleDe(i.base) ? 0 : 1);
    images.sort((a, b) => rang(a) - rang(b));
    const urls = [];
    let vignette = null;
    for (const img of images) {
      try {
        let buffer;
        if (img.ambiance) {
          buffer = await sharp(img.chemin).flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
        } else {
          const r = await rogner(img.chemin);
          buffer = r.buffer;
          if (!r.inchange) rognees++;
        }
        const url = await envoyer(buffer, img.publicId);
        urls.push(url);
        // La vignette du catalogue garde la vue de base, photo canonique du
        // produit — c'est la galerie seule qui s'ouvre sur un décor nommé.
        if (!vignette && !img.ambiance && !libelleDe(img.base)) vignette = url;
        envoyees++;
      } catch (e) {
        echecs++;
        console.log(`   ✗ ${img.base} : ${e.message}`);
      }
    }
    if (urls.length) {
      await prisma.produitVitrine.update({ where: { id: v.id }, data: { images: urls, imageUrl: vignette || urls[0] } });
      console.log(`   ✓ ${v.nom} — ${urls.length} images`);
    }
  }
  console.log(`\n${envoyees} envoyées · ${rognees} rognées · ${echecs} échecs`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
