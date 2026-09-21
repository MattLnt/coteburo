// Verse les photos haute définition Buronomic dans l'arborescence des médias.
//
// En simulation par défaut. --appliquer pour copier.
//
//   node prisma/verser-photos-hd.mjs
//   node prisma/verser-photos-hd.mjs --appliquer
//
// N'ÉCRIT RIEN EN BASE, et ne déplace rien : il COPIE. Le dossier
// PHOTOS_BURONOMIC_HD est une archive, elle reste intacte.
//
// POURQUOI
//   Soixante-deux fiches Buronomic n'ont aucune image et leur gamme n'a même
//   pas de dépôt à trier. Pendant ce temps, PHOTOS_BURONOMIC_HD contient sept
//   cent quatre-vingt-quatorze photos rangées par gamme, d'une largeur
//   médiane de cinq mille pixels — les meilleures du disque — et n'a jamais
//   été versé dans l'arborescence que televerser-medias sait lire.
//
// CE QU'IL FAIT
//   Il copie les photos dans le dépôt _A-TRIER de leur gamme. De là,
//   prisma/repartir-depots.mjs les distribue aux fiches, et
//   prisma/televerser-medias.mjs les envoie.
//
//   Il ne va pas jusqu'à la fiche lui-même : le dossier HD range par gamme,
//   pas par produit, et deviner lequel des trente clichés d'Alto montre la
//   « Tablette de liaison » demande un œil.
//
// LES VARIANTES DE GAMME
//   « Bewall-tissus », « Quietude-Portes coulissantes »,
//   « Alto-Solutions-assise » sont des sous-ensembles d'une gamme du
//   catalogue. Un nom de dossier qui COMMENCE par le nom d'une gamme lui
//   revient — mais on prend la gamme la plus longue qui convienne, sans quoi
//   « Alto Réunion » finirait dans « Alto ».
//
// LES DOUBLONS
//   La même photo figure parfois dans deux dossiers de l'archive. La
//   comparaison se fait sur le CONTENU, jamais sur le nom : une image déjà
//   présente dans le dépôt ou sur une fiche n'est pas recopiée.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readdir, mkdir, copyFile, readFile, stat } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const MEDIAS = join(homedir(), "Desktop", "Matt", "COTEBURO-MEDIAS");
const HD = join(MEDIAS, "PHOTOS_BURONOMIC_HD");
const CIBLE = join(MEDIAS, "CATALOGUE-2026", "buronomic");

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/^buronomic-/, "")
  .replace(/[^a-z0-9]+/g, " ").trim();

// Les mêmes règles de nommage que televerser-medias, pour viser ses dossiers.
const INTERDITS = /[<>:"/\\|?*]|[\p{Cc}]/gu;
const empreinteNom = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).slice(0, 4);
};
const nomSain = (s, max) => {
  const p = String(s ?? "").replace(INTERDITS, "-").replace(/\s+/g, " ").replace(/[. ]+$/, "").trim();
  return p.length <= max ? (p || "sans-nom") : `${p.slice(0, max - 5).trim()}~${empreinteNom(p)}`;
};

const EST_IMAGE = /\.(jpe?g|png|webp)$/i;

/** Tous les dossiers de l'archive qui contiennent des images. */
async function dossiersDe(racine) {
  const out = [];
  const parcourir = async (d) => {
    let entrees = [];
    try { entrees = await readdir(d, { withFileTypes: true }); } catch { return; }
    const images = entrees.filter((e) => e.isFile() && EST_IMAGE.test(e.name)).map((e) => e.name);
    if (images.length) out.push({ chemin: d, nom: basename(d), images });
    for (const e of entrees) if (e.isDirectory()) await parcourir(join(d, e.name));
  };
  await parcourir(racine);
  return out;
}

/** L'empreinte du contenu d'un fichier. */
async function empreinte(chemin) {
  return createHash("md5").update(await readFile(chemin)).digest("hex");
}

/** Ce que contient déjà l'arborescence d'une gamme, par empreinte. */
async function dejaLa(dossierGamme) {
  const vues = new Set();
  const parcourir = async (d) => {
    let entrees = [];
    try { entrees = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entrees) {
      const p = join(d, e.name);
      if (e.isDirectory()) await parcourir(p);
      else if (EST_IMAGE.test(e.name)) vues.add(await empreinte(p));
    }
  };
  await parcourir(dossierGamme);
  return vues;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — les photos sont copiées ═══\n"
    : "═══ SIMULATION — rien n'est copié ═══\n");

  const gammes = await prisma.gamme.findMany({
    where: { marque: { slug: "buronomic" } },
    select: { nom: true, vitrines: { select: { _count: { select: { visuels: true } } } } },
  });
  const infos = gammes.map((g) => ({
    nom: g.nom,
    cle: nu(g.nom),
    vides: g.vitrines.filter((v) => v._count.visuels === 0).length,
    dossier: join(CIBLE, nomSain(g.nom, 30)),
  }));
  // La gamme la plus longue d'abord : « Alto Réunion » avant « Alto ».
  const parLongueur = [...infos].sort((a, b) => b.cle.length - a.cle.length);

  const dossiers = await dossiersDe(HD);
  const plan = new Map();     // gamme -> [{ source, nom }]
  const sansGamme = [];

  for (const d of dossiers) {
    const k = nu(d.nom);
    const g = parLongueur.find((x) => x.cle === k)
      || parLongueur.find((x) => k.startsWith(`${x.cle} `));
    if (!g) { if (d.images.length >= 3) sansGamme.push(`${d.nom} (${d.images.length})`); continue; }
    if (!g.vides) continue;   // la gamme est déjà illustrée : on ne l'encombre pas
    if (!plan.has(g.nom)) plan.set(g.nom, { gamme: g, fichiers: [] });
    for (const nom of d.images) plan.get(g.nom).fichiers.push({ source: join(d.chemin, nom), nom });
  }

  // ── Écarter ce qui est déjà là, au contenu ──────────────────────────
  titre("CE QUI SERAIT VERSÉ");
  console.log("");
  let total = 0;
  let deja = 0;
  for (const [nomGamme, e] of [...plan].sort((a, b) => b[1].fichiers.length - a[1].fichiers.length)) {
    const connues = await dejaLa(e.gamme.dossier);
    const retenus = [];
    const vues = new Set(connues);
    for (const f of e.fichiers) {
      let h;
      try { h = await empreinte(f.source); } catch { continue; }
      if (vues.has(h)) { deja += 1; continue; }
      vues.add(h);
      retenus.push(f);
    }
    e.retenus = retenus;
    total += retenus.length;
    if (retenus.length) {
      console.log(`   ${String(retenus.length).padStart(4)} photos → ${nomGamme.padEnd(22)} (${e.gamme.vides} fiche${e.gamme.vides > 1 ? "s" : ""} sans image)`);
    }
  }
  console.log(`\n   ${total} photo(s) vers ${[...plan.values()].filter((e) => e.retenus.length).length} gamme(s)`);
  if (deja) console.log(`   ${deja} déjà présentes, écartées sur leur contenu`);

  if (sansGamme.length) {
    titre("DOSSIERS HD SANS GAMME AU CATALOGUE");
    console.log(`\n   ${sansGamme.slice(0, 20).join(" · ")}`);
    console.log(`\n   ${sansGamme.length} dossier(s). Ce sont des gammes que le catalogue ne vend pas,`);
    console.log("   ou dont le nom diffère. Rien n'en est tiré.");
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour copier.");
    console.log("Puis : node prisma/repartir-depots.mjs --gamme=…");
    return;
  }

  titre("COPIE");
  let faits = 0;
  for (const [nomGamme, e] of plan) {
    if (!e.retenus?.length) continue;
    const depot = join(e.gamme.dossier, "_A-TRIER", "photo");
    await mkdir(depot, { recursive: true });
    for (const f of e.retenus) {
      // Deux dossiers de l'archive peuvent porter le même nom de fichier pour
      // des clichés différents : on suffixe plutôt que d'en perdre un.
      let cible = join(depot, f.nom);
      let i = 2;
      while (true) {
        try { await stat(cible); } catch { break; }
        const ext = extname(f.nom);
        cible = join(depot, `${basename(f.nom, ext)}-${i}${ext}`);
        i += 1;
      }
      await copyFile(f.source, cible);
      faits += 1;
    }
    console.log(`   ${String(e.retenus.length).padStart(4)} → ${nomGamme}`);
  }
  console.log(`\n   ${faits} photo(s) copiée(s). L'archive HD est intacte.`);
  console.log("\nÀ suivre : node prisma/repartir-depots.mjs");
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
