// Pose sur leurs fiches les images que leur nom de fichier suffit à identifier.
//
//   node prisma/appliquer-visuels.mjs
//   node prisma/appliquer-visuels.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire (envoi Cloudinary compris).
//
// POURQUOI
//   prisma/proposer-visuels.mjs mesure ce qui est rattachable par le nom de
//   fichier : cent soixante-cinq images, sur trente-deux fiches vides, avec
//   un score net devant toute autre fiche de la même gamme. Ce script exécute
//   exactement ces rapprochements-là — ni plus, ni moins — et rien d'autre :
//   un rapprochement ambigu (marqué « ? » par proposer-visuels) n'est jamais
//   posé automatiquement.
//
// CE QU'IL PARTAGE AVEC L'ÉCRAN DE TRI
//   lib/attribuerVisuels.js : le même envoi, la même création de Visuel, le
//   même rangement sur le disque que app/(admin)/admin/visuels. Un script et
//   un écran qui font le même geste par deux chemins différents finissent
//   toujours par diverger ; il n'y a donc qu'un seul chemin.
//
// CE QUI PROTÈGE
//   Un fichier n'est déplacé qu'après un envoi Cloudinary réussi. Un échec
//   laisse le dépôt intact. Rien n'est jamais supprimé.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { racineMediatheque, dossierDepot, CATALOGUE, EST_IMAGE, nomSain } from "../lib/mediatheque.js";
import { attribuerAUneFiche, cloudinaryPret } from "../lib/attribuerVisuels.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

// ── Le même rapprochement que proposer-visuels.mjs, verbatim ───────────
// (dupliqué à dessein : proposer-visuels reste l'outil de MESURE, celui-ci
// est l'outil d'ÉCRITURE. Les faire diverger serait pire que les dupliquer —
// mais un test compare leurs résultats, voir la fin de ce fichier.)
const VIDE = new Set(["de", "du", "des", "le", "la", "les", "et", "ou", "au",
  "aux", "en", "un", "une", "sur", "par", "ret", "cm",
  "jpg", "jpeg", "png", "webp", "photo", "ambiance", "schema", "detoure",
  "buronomic", "sokoa", "officepro", "packshot"]);
const CONTRAIRES = [["avec", "sans"]];
const radical = (m) => (m.length > 4 && m.endsWith("s") ? m.slice(0, -1) : m);
const mots = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .split(" ")
  .filter((m) => (/^\d{1,3}$/.test(m) || (m.length > 2 && !VIDE.has(m))))
  .map(radical);

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

/**
 * Les images sous un dossier, avec leur chemin RELATIF À LA RACINE déjà
 * construit — c'est ce chemin, et lui seul, qui identifie le fichier sur le
 * disque. Reconstruire l'origine d'une image après coup (dépôt ou dossier de
 * gamme ?) est le genre de chose qu'on se trompe à refaire deux fois.
 *
 * `sousDossiers: true` descend d'un niveau (photo/ambiance/schema/detoure du
 * dépôt) ; `false` ne prend que les fichiers directement posés (le dossier de
 * gamme contient aussi un sous-dossier par fiche déjà triée, qu'on ne veut
 * pas reparcourir).
 */
function imagesDu(dossier, relDossier, { sousDossiers } = { sousDossiers: true }) {
  if (!existsSync(dossier)) return [];
  const out = [];
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    if (e.isFile() && EST_IMAGE.test(e.name)) {
      out.push({ nom: e.name, rel: join(relDossier, e.name) });
    } else if (e.isDirectory() && sousDossiers) {
      const sous = join(dossier, e.name);
      for (const f of readdirSync(sous)) {
        if (EST_IMAGE.test(f)) out.push({ nom: f, rel: join(relDossier, e.name, f) });
      }
    }
  }
  return out;
}

const SEUIL_NOTE = 0.45;
const SEUIL_ECART = 0.25;

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — envoi Cloudinary et écriture ═══\n"
    : "═══ SIMULATION — rien n'est envoyé ni déplacé ═══\n");

  const racine = racineMediatheque();
  if (!racine) { console.error("Médiathèque introuvable sur ce poste."); process.exitCode = 1; return; }
  if (APPLIQUER && !cloudinaryPret()) {
    console.error("Cloudinary n'est pas configuré (variables d'environnement manquantes).");
    process.exitCode = 1;
    return;
  }

  const gammes = await prisma.gamme.findMany({
    select: {
      nom: true,
      marque: { select: { nom: true, slug: true } },
      vitrines: {
        where: { publie: true },
        orderBy: { nom: "asc" },
        select: { id: true, nom: true, _count: { select: { visuels: true } } },
      },
    },
  });

  // ── Recalculer les propositions sûres, gamme par gamme ────────────────
  const aPoser = [];   // { vitrineId, nom, gammeNom, marqueNom, marqueSlug, rels: [...] }

  for (const g of gammes) {
    if (!g.vitrines.length) continue;
    const slugM = g.marque.slug || g.marque.nom.toLowerCase();
    const relDepot = dossierDepot(slugM, g.nom);
    const relGammeDossier = join(CATALOGUE, slugM, nomSain(g.nom, 30));
    const images = [
      ...imagesDu(join(racine, relDepot), relDepot, { sousDossiers: true }),
      ...imagesDu(join(racine, relGammeDossier), relGammeDossier, { sousDossiers: false }),
    ];
    if (!images.length) continue;

    const fiches = g.vitrines;   // on note contre toutes, vides ou non
    const suffixe = new RegExp(`\\s*-\\s*${g.nom}$`, "i");
    const motsDe = new Map(fiches.map((v) => [v.nom, mots(v.nom.replace(suffixe, ""))]));
    const compte = new Map();
    for (const ms of motsDe.values()) for (const m of new Set(ms)) compte.set(m, (compte.get(m) || 0) + 1);
    const poids = new Map([...compte].map(([m, n]) => [m, 1 / n]));

    for (const img of images) {
      const mf = mots(img.nom.replace(/_\d+$/, "").replace(/\.[a-z0-9]+$/i, ""))
        .filter((m) => m !== g.nom.toLowerCase());
      if (!mf.length) continue;
      const notes = fiches
        .map((v) => ({ v, note: score(motsDe.get(v.nom), mf, poids) }))
        .sort((a, b) => b.note - a.note);
      if (!notes[0] || notes[0].note <= 0) continue;
      const sur = notes[0].note >= SEUIL_NOTE && (notes[0].note - (notes[1]?.note || 0)) >= SEUIL_ECART;
      if (!sur) continue;
      // On ne pose que sur des fiches VIDES : une fiche déjà illustrée garde
      // la main humaine, même si son nom gagne le score.
      if (notes[0].v._count.visuels > 0) continue;

      let entree = aPoser.find((x) => x.vitrineId === notes[0].v.id);
      if (!entree) {
        entree = {
          vitrineId: notes[0].v.id, nom: notes[0].v.nom,
          gammeNom: g.nom, marqueNom: g.marque.nom, marqueSlug: slugM,
          rels: [],
        };
        aPoser.push(entree);
      }
      entree.rels.push(img.rel);
    }
  }

  titre("CE QUI SERAIT POSÉ");
  let totalImages = 0;
  for (const e of aPoser) {
    totalImages += e.rels.length;
    console.log(`\n   ${e.marqueNom} · ${e.gammeNom} — ${e.nom.slice(0, 50)}`);
    for (const r of e.rels) console.log(`      ${r}`);
  }
  console.log(`\n   ${aPoser.length} fiches · ${totalImages} images`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour envoyer et écrire.");
    return;
  }

  titre("ENVOI");
  let nFaits = 0;
  const echecsTotal = [];
  for (const e of aPoser) {
    const vitrine = await prisma.produitVitrine.findUnique({
      where: { id: e.vitrineId },
      select: {
        id: true, nom: true,
        gamme: { select: { nom: true, marque: { select: { slug: true } } } },
        visuels: { select: { url: true } },
      },
    });
    if (!vitrine) continue;
    const { faits, echecs } = await attribuerAUneFiche({ prisma, base: racine, vitrine, rels: e.rels });
    nFaits += faits.length;
    for (const x of echecs) echecsTotal.push(`${e.nom} — ${x.rel} : ${x.raison}`);
    console.log(`   ${e.nom.slice(0, 50).padEnd(52)} ${faits.length} posée(s)${echecs.length ? `, ${echecs.length} échec(s)` : ""}`);
  }

  titre("CONTRÔLE");
  console.log(`   images posées : ${nFaits} / ${totalImages}`);
  if (echecsTotal.length) {
    console.log(`   échecs :`);
    for (const e of echecsTotal.slice(0, 15)) console.log(`      ${e}`);
  }
  const sansVisuel = await prisma.produitVitrine.count({ where: { publie: true, visuels: { none: {} } } });
  console.log(`   fiches publiées sans aucune image, désormais : ${sansVisuel}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
