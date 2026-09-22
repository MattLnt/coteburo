// Quelles images du dépôt vont à quelle fiche ?
//
//   node prisma/proposer-visuels.mjs
//   node prisma/proposer-visuels.mjs --gamme=ALTO
//   node prisma/proposer-visuels.mjs --vides
//
// N'ÉCRIT RIEN, ni sur le disque ni dans la base. Il lit les noms de fichiers
// des dépôts `_A-TRIER`, les rapproche des noms de fiches, et montre ses
// rapprochements avec leur score.
//
// POURQUOI UN SCORE ET PAS UNE DÉCISION
//   Certains dépôts se lisent tout seuls :
//
//     buronomic-Alto-Bureau-individuel-avec-panneau-frontal-Noir-Timber.jpg
//
//   D'autres ne disent rien du tout :
//
//     00670_01.jpg
//
//   Et entre les deux, l'ambiguïté est la règle : « Bureau-multiposte-avec-
//   caisson-duo » va-t-il au « Bureau multiposte fixe » ou au « Bureau
//   multiposte à plateaux coulissants » ? Les deux existent, et le nom du
//   fichier ne tranche pas.
//
//   Poser une image sur la mauvaise fiche est pire que de la laisser dans le
//   dépôt : le client voit un produit qu'il ne commande pas. Le script classe
//   donc, il ne décide pas — et l'écran de tri garde le dernier mot.
//
// COMMENT IL COMPTE
//   Un mot rare vaut plus qu'un mot courant : dans une gamme de bureaux,
//   « bureau » ne distingue rien, « multiposte » distingue beaucoup. Le poids
//   d'un mot est donc l'inverse du nombre de fiches qui le portent, et le
//   score d'un rapprochement est la part du poids de la fiche que le nom de
//   fichier couvre.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { racineMediatheque, dossierDepot, CATALOGUE, EST_IMAGE, nomSain } from "../lib/mediatheque.js";

const prisma = new PrismaClient();
const FILTRE = (process.argv.find((a) => a.startsWith("--gamme=")) || "").slice(8) || null;
const VIDES_SEULEMENT = process.argv.includes("--vides");

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

// Les mots qui ne distinguent rien : articles, et le vocabulaire du dépôt.
//
// « avec » et « sans » n'y sont PAS, et c'est délibéré : chez Verano ils
// séparent deux fiches — « Chaise avec accoudoirs » et « Chaise sans
// accoudoirs » — et les ignorer faisait proposer l'une pour l'autre. Un mot
// qui ne distingue rien est déjà neutralisé par son poids ; il n'a pas besoin
// d'être dans cette liste.
const VIDE = new Set(["de", "du", "des", "le", "la", "les", "et", "ou", "au",
  "aux", "en", "un", "une", "sur", "par", "ret", "cm",
  "jpg", "jpeg", "png", "webp", "photo", "ambiance", "schema", "detoure",
  "buronomic", "sokoa", "officepro", "packshot"]);

// « avec » et « sans » se contredisent : un nom de fichier qui dit l'un ne peut
// pas désigner une fiche qui dit l'autre. C'est la seule règle de ce genre —
// elle se vérifie, contrairement à une ressemblance de mots.
const CONTRAIRES = [["avec", "sans"]];

// Deux pièges vérifiés sur Verano :
//
//   « support-de-plante-gris » contre la fiche « Support pour plantes » — le
//   singulier et le pluriel ne se rencontraient jamais. On coupe donc le s
//   final, et « plante » retrouve « plantes ».
//
//   « table-4-places » contre « Petite table rectangulaire 4 places » et
//   « Grande table rectangulaire 6 places » — le chiffre est justement ce qui
//   les sépare, et il était jeté comme du bruit. Un nombre court est gardé.
//   Le seuil est à quatre lettres et non trois : « sans » y perdait son s et
//   devenait « san », si bien que la règle avec/sans ci-dessous ne se
//   déclenchait jamais et qu'une chaise à accoudoirs était proposée pour la
//   chaise sans accoudoirs.
const radical = (m) => (m.length > 4 && m.endsWith("s") ? m.slice(0, -1) : m);

const mots = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .split(" ")
  .filter((m) => (/^\d{1,3}$/.test(m) || (m.length > 2 && !VIDE.has(m))))
  .map(radical);

/**
 * Le score d'un rapprochement : la part du poids de la fiche que le nom couvre.
 *
 * Un mot du fichier couvre un mot de la fiche s'il lui est égal ou s'il en est
 * un début — « acc » couvre « accoudoirs », comme dans « chaise-avec-acc ».
 * Rend 0 si les deux noms se contredisent.
 */
function score(motsFiche, motsFichier, poids) {
  for (const [a, b] of CONTRAIRES) {
    const dit = (ms, m) => ms.includes(m);
    if ((dit(motsFichier, a) && dit(motsFiche, b)) || (dit(motsFichier, b) && dit(motsFiche, a))) return 0;
  }
  const total = motsFiche.reduce((s, m) => s + (poids.get(m) || 0), 0);
  if (!total) return 0;
  const couvre = (mf) => motsFichier.some((m) => m === mf || (m.length >= 3 && mf.startsWith(m)));
  const couvert = motsFiche.reduce((s, m) => s + (couvre(m) ? (poids.get(m) || 0) : 0), 0);
  return couvert / total;
}

function imagesDu(dossier) {
  if (!existsSync(dossier)) return [];
  const out = [];
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    if (e.isFile() && EST_IMAGE.test(e.name)) out.push({ nom: e.name, sous: "" });
    else if (e.isDirectory()) {
      const sous = join(dossier, e.name);
      for (const f of readdirSync(sous)) {
        if (EST_IMAGE.test(f)) out.push({ nom: f, sous: e.name });
      }
    }
  }
  return out;
}

async function main() {
  const racine = racineMediatheque();
  if (!racine) {
    console.error("Médiathèque introuvable sur ce poste. Renseigner MEDIATHEQUE_LOCALE.");
    process.exitCode = 1;
    return;
  }
  console.log(`médiathèque : ${racine}\n`);

  const gammes = await prisma.gamme.findMany({
    where: FILTRE ? { nom: { contains: FILTRE, mode: "insensitive" } } : {},
    select: {
      nom: true,
      marque: { select: { nom: true, slug: true } },
      vitrines: {
        where: { publie: true },
        orderBy: { nom: "asc" },
        select: { nom: true, _count: { select: { visuels: true } } },
      },
    },
  });

  const bilan = { fiches: 0, vides: 0, images: 0, proposees: 0, sures: 0, muettes: 0 };
  const parGamme = [];

  for (const g of gammes) {
    if (!g.vitrines.length) continue;
    const slugM = g.marque.slug || g.marque.nom.toLowerCase();
    const depot = join(racine, dossierDepot(slugM, g.nom));
    const gammeDossier = join(racine, CATALOGUE, slugM, nomSain(g.nom, 30));
    const images = [...imagesDu(depot), ...imagesDu(gammeDossier).filter((i) => i.sous === "")];
    if (!images.length) continue;

    // On note TOUJOURS contre toutes les fiches de la gamme, même celles déjà
    // illustrées : sinon l'image d'un produit voisin se pose sur sa sœur faute
    // de concurrente. --vides ne change que ce qu'on rapporte, pas ce qu'on
    // compare.
    const fiches = g.vitrines;
    const retenue = (nom) => !VIDES_SEULEMENT
      || g.vitrines.find((v) => v.nom === nom)?._count.visuels === 0;
    if (!fiches.length) continue;

    // Le poids d'un mot : l'inverse du nombre de fiches qui le portent.
    const suffixe = new RegExp(`\\s*-\\s*${g.nom}$`, "i");
    const motsDe = new Map(fiches.map((v) => [v.nom, mots(v.nom.replace(suffixe, ""))]));
    const compte = new Map();
    for (const ms of motsDe.values()) {
      for (const m of new Set(ms)) compte.set(m, (compte.get(m) || 0) + 1);
    }
    const poids = new Map([...compte].map(([m, n]) => [m, 1 / n]));

    // Pour chaque image, la meilleure fiche et sa dauphine.
    const propositions = [];
    let muettes = 0;
    for (const img of images) {
      const mf = mots(img.nom.replace(/_\d+$/, "").replace(/\.[a-z0-9]+$/i, ""))
        .filter((m) => m !== g.nom.toLowerCase());
      if (!mf.length) { muettes += 1; continue; }
      const notes = fiches
        .map((v) => ({ fiche: v.nom, note: score(motsDe.get(v.nom), mf, poids) }))
        .sort((a, b) => b.note - a.note);
      if (!notes[0] || notes[0].note <= 0) { muettes += 1; continue; }
      if (!retenue(notes[0].fiche)) continue;   // elle a déjà ses images
      propositions.push({
        image: img.sous ? `${img.sous}/${img.nom}` : img.nom,
        fiche: notes[0].fiche,
        note: notes[0].note,
        // Un rapprochement n'est sûr que s'il devance nettement le suivant.
        ecart: notes[0].note - (notes[1]?.note || 0),
      });
    }

    // Ce qui fait la confiance n'est pas le score absolu mais l'écart :
    // « table-4-places » ne couvre que trois des cinq mots de « Petite table
    // rectangulaire 4 places » — 0,57 — mais il devance de loin toutes les
    // autres fiches, et le rapprochement est juste. Un score élevé dans un
    // peloton serré, lui, ne vaut rien.
    const sures = propositions.filter((p) => p.note >= 0.45 && p.ecart >= 0.25);
    bilan.fiches += g.vitrines.length;
    bilan.vides += g.vitrines.filter((v) => v._count.visuels === 0).length;
    bilan.images += images.length;
    bilan.proposees += propositions.length;
    bilan.sures += sures.length;
    bilan.muettes += muettes;

    parGamme.push({
      nom: `${g.marque.nom} · ${g.nom}`,
      vides: g.vitrines.filter((v) => v._count.visuels === 0).length,
      images: images.length,
      muettes,
      propositions,
      sures,
      fichesCouvertes: new Set(sures.map((p) => p.fiche)).size,
    });
  }

  titre("CE QUE LES NOMS DE FICHIERS PERMETTENT");
  console.log(`
   images dans les dépôts ............... ${bilan.images}
   dont le nom ne dit rien d'exploitable  ${bilan.muettes}
   rapprochements possibles ............. ${bilan.proposees}
   dont sûrs (nets devant les autres) ... ${bilan.sures}`);

  titre("PAR GAMME");
  console.log("\n   vides  images  muets  sûrs  fiches couvertes");
  for (const g of parGamme.sort((a, b) => b.sures - a.sures)) {
    console.log(`   ${String(g.vides).padStart(4)}  ${String(g.images).padStart(6)}  ${String(g.muettes).padStart(5)}  ${String(g.sures.length).padStart(4)}  ${String(g.fichesCouvertes).padStart(6)}   ${g.nom}`);
  }

  if (FILTRE) {
    titre(`LE DÉTAIL DE « ${FILTRE} »`);
    for (const g of parGamme) {
      for (const p of g.propositions.sort((a, b) => b.note - a.note)) {
        const marque = p.note >= 0.45 && p.ecart >= 0.25 ? "✓" : p.note >= 0.35 ? "?" : " ";
        console.log(`   ${marque} ${p.note.toFixed(2)}  ${p.image.slice(0, 54).padEnd(56)} → ${p.fiche.slice(0, 44)}`);
      }
    }
  } else {
    console.log("\n   Le détail d'une gamme : --gamme=ALTO");
  }

  console.log("\nAucune image n'a été déplacée, aucune fiche modifiée.");
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
