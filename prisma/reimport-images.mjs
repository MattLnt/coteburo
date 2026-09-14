import "dotenv/config";
import { readdir, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { PrismaClient } from "@prisma/client";

// Réimport des images sources, avec un nom déterministe.
//
// Trois problèmes se règlent d'un coup, parce qu'ils ont la même cause — le
// preset Cloudinary non signé attribue un identifiant aléatoire :
//
//  1. Le décor du fichier (« BX995N_Blanc_Chêne-fil.png ») est perdu à
//     l'envoi ; impossible d'afficher une pastille de coloris sur la photo.
//  2. /admin/detourage nomme ses fichiers « …_cadre.jpg » puis teste
//     url.includes("_cadre") pour ne pas retraiter. L'identifiant aléatoire
//     écrase ce nom : le garde-fou ne se déclenche jamais et chaque passage
//     duplique les images.
//  3. estAmbiance() cherche « amb_ » ou « bodegon » dans l'URL, en vain.
//
// Un public_id déterministe les résout tous les trois : l'envoi écrase au lieu
// de dupliquer, et le nom porte l'information jusqu'à la fiche.
//
//   node prisma/reimport-images.mjs              → simulation, n'écrit rien
//   node prisma/reimport-images.mjs --appliquer  → recadre et envoie
//
// Sans argument, les deux marques. Avec, seulement les gammes nommées.

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const DEMANDEES = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const MEDIAS = "C:\\Users\\pages\\Bureau\\Matt\\projets\\COTEBURO-MEDIAS";
const RACINE_BURONOMIC = join(MEDIAS, "Buronomic");
const RACINE_SOKOA = join(MEDIAS, "Sokoa", "fichiers_sokoa");
const IMAGES = [".png", ".jpg", ".jpeg", ".webp"];

// Une photo d'ambiance montre le produit en situation. Elle ne doit être ni
// rognée — le décor fait partie de l'image — ni étiquetée d'un coloris.
const MOTS_AMBIANCE = ["amb_", "amb-", "ambiance", "_amb", "bodegon"];

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const estAmbiance = (nom) => MOTS_AMBIANCE.some((m) => norm(nom).includes(m));

// « BX995N_Blanc_Chêne-fil » → { code: "BX995N", decor: "Blanc Chêne fil" }
function decouper(nomFichier) {
  const base = basename(nomFichier, extname(nomFichier));
  const parts = base.split("_");
  return {
    base,
    code: parts[0].trim().toUpperCase(),
    // Un fichier peut porter plusieurs finitions : « _Blanc_Chêne-fil » =
    // piètement blanc ET plateau chêne fil. Chaque jeton est testé à part.
    jetons: parts.slice(1).map((t) => t.replace(/-/g, " ").trim()).filter(Boolean),
  };
}

async function fichiersDe(dossier) {
  try {
    const entrees = await readdir(dossier, { withFileTypes: true });
    return entrees
      .filter((e) => e.isFile() && IMAGES.includes(extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION — rien n'est écrit ═══\n");

  // ── Index des références → fiche, toutes marques ──
  // Le fichier porte la référence du configurateur (« DH507N »), la base celle
  // du catalogue (« DH50 ») : on rattache par préfixe, la plus longue d'abord.
  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true, referenceUnitaire: true, declinaisons: true,
      gamme: { select: { id: true, nom: true, slug: true, marque: { select: { slug: true } } } },
    },
  });

  const refsDe = (v) => {
    const decl = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    return [
      ...(v.referenceUnitaire ? [v.referenceUnitaire] : []),
      ...decl.map((d) => d.referenceFournisseur).filter(Boolean),
    ].map((r) => String(r).trim().toUpperCase());
  };

  const indexRefs = [];
  for (const v of vitrines) for (const r of refsDe(v)) if (r) indexRefs.push({ ref: r, v });
  indexRefs.sort((a, b) => b.ref.length - a.ref.length);

  const trouverParCode = (code, marqueSlug) => {
    const c = code.toUpperCase();
    return indexRefs.find((x) => c.startsWith(x.ref) && x.v.gamme.marque?.slug === marqueSlug)?.v || null;
  };

  // ── Finitions connues, pour savoir si un suffixe est vraiment un coloris ──
  const finitions = await prisma.finition.findMany({ select: { nom: true } });
  const nomsFinition = new Set(finitions.map((f) => norm(f.nom)));
  // « R4E — Beige » doit aussi se reconnaître sous « Beige ».
  for (const f of finitions) {
    const apresTiret = f.nom.split(/[—–-]/).pop();
    if (apresTiret) nomsFinition.add(norm(apresTiret));
  }

  // ── Recensement des sources ──
  const lots = [];

  const dossiersBuro = (await readdir(RACINE_BURONOMIC, { withFileTypes: true }).catch(() => []))
    .filter((e) => e.isDirectory()).map((e) => e.name);
  for (const d of dossiersBuro) {
    if (DEMANDEES.length && !DEMANDEES.some((n) => norm(d).includes(norm(n)))) continue;
    for (const f of await fichiersDe(join(RACINE_BURONOMIC, d, "_captures"))) {
      lots.push({ marque: "buronomic", dossier: d, chemin: join(RACINE_BURONOMIC, d, "_captures", f), fichier: f });
    }
  }

  const dossiersSokoa = (await readdir(RACINE_SOKOA, { withFileTypes: true }).catch(() => []))
    .filter((e) => e.isDirectory()).map((e) => e.name);
  for (const d of dossiersSokoa) {
    if (DEMANDEES.length && !DEMANDEES.some((n) => norm(d).includes(norm(n)))) continue;
    for (const f of await fichiersDe(join(RACINE_SOKOA, d))) {
      lots.push({ marque: "sokoa", dossier: d, chemin: join(RACINE_SOKOA, d), fichier: f });
    }
  }

  // ── Analyse ──
  const gammesParSlug = new Map();
  for (const v of vitrines) if (v.gamme) gammesParSlug.set(v.gamme.slug, v.gamme);

  const res = {
    total: lots.length, apparies: 0, orphelins: [], ambiances: 0,
    parMarque: {}, avecDecor: 0, decorReconnu: 0, decorPartiel: 0, decorInconnu: {}, publicIds: new Map(), collisions: [],
  };

  for (const l of lots) {
    const { base, code, jetons } = decouper(l.fichier);
    const ambiance = estAmbiance(l.fichier);
    if (ambiance) res.ambiances++;

    res.parMarque[l.marque] ??= { total: 0, apparies: 0, ambiances: 0 };
    res.parMarque[l.marque].total++;
    if (ambiance) res.parMarque[l.marque].ambiances++;

    const v = trouverParCode(code, l.marque);
    if (!v) { res.orphelins.push(l); continue; }
    res.apparies++;
    res.parMarque[l.marque].apparies++;

    // Pastille : jamais sur une ambiance, et seulement si le suffixe est un
    // coloris connu — « avec échancrure » ou « patins » sont des variantes de
    // configuration, les étiqueter « coloris » serait faux.
    if (jetons.length && !ambiance) {
      res.avecDecor++;
      const reconnus = jetons.filter((j) => nomsFinition.has(norm(j)));
      if (reconnus.length === jetons.length) res.decorReconnu++;
      else if (reconnus.length > 0) res.decorPartiel++;
      for (const j of jetons) if (!nomsFinition.has(norm(j))) res.decorInconnu[j] = (res.decorInconnu[j] || 0) + 1;
    }

    const publicId = `coteburo/${l.marque}/${v.gamme.slug}/${slug(base)}`;
    // Un meme accessoire est range dans plusieurs dossiers de gamme : deux
    // sources pour un identifiant ne posent probleme QUE si les fichiers
    // different. La taille sert d indice, suffisant ici.
    const taille = (await stat(join(l.chemin, l.fichier)).catch(() => null))?.size ?? 0;
    const vu = res.publicIds.get(publicId);
    if (vu && vu.taille !== taille) res.collisions.push({ publicId, a: vu.src, b: join(l.chemin, l.fichier) });
    res.publicIds.set(publicId, { src: join(l.chemin, l.fichier), taille });
  }

  // ── Rapport ──
  console.log(`Fichiers sources analysés : ${res.total}`);
  console.log(`  appariés à une fiche    : ${res.apparies}  (${Math.round(res.apparies / res.total * 100)} %)`);
  console.log(`  sans fiche              : ${res.orphelins.length}`);
  console.log(`  ambiances (ni rognage, ni pastille) : ${res.ambiances}`);
  console.log("");
  for (const [m, d] of Object.entries(res.parMarque))
    console.log(`  ${m.padEnd(10)} ${String(d.total).padStart(5)} fichiers  ${String(d.apparies).padStart(5)} apparies (${Math.round(d.apparies/d.total*100)} %)  ${String(d.ambiances).padStart(4)} ambiances`);

  console.log(`\nPastille de coloris, sur les ${res.apparies} images appariées :`);
  console.log(`  suffixe présent            : ${res.avecDecor}`);
  console.log(`  tous jetons reconnus       : ${res.decorReconnu}  ← pastille sûre`);
  console.log(`  partiellement reconnus     : ${res.decorPartiel}  ← pastille sur la partie connue`);
  const nbInconnus = Object.values(res.decorInconnu).reduce((a, b) => a + b, 0);
  console.log(`  suffixe non reconnu        : ${nbInconnus}  ← variantes de configuration`);
  console.log(`  sans suffixe (vue de base) : ${res.apparies - res.avecDecor}`);

  if (nbInconnus) {
    console.log(`\n  Principaux suffixes NON reconnus :`);
    Object.entries(res.decorInconnu).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .forEach(([d, n]) => console.log(`     ${String(n).padStart(4)}  ${d}`));
  }

  console.log(`\nIdentifiants Cloudinary : ${res.publicIds.size} uniques pour ${res.apparies} images`);
  console.log(`  collisions réelles (contenus différents)    : ${res.collisions.length}`);
  res.collisions.slice(0, 5).forEach((c) => console.log(`     ${c.publicId}`));

  if (res.orphelins.length) {
    const parDossier = {};
    for (const o of res.orphelins) parDossier[`${o.marque}/${o.dossier}`] = (parDossier[`${o.marque}/${o.dossier}`] || 0) + 1;
    console.log(`\nFichiers sans fiche correspondante, par dossier :`);
    Object.entries(parDossier).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .forEach(([d, n]) => console.log(`     ${String(n).padStart(4)}  ${d}`));
  }

  console.log(`\nExemples d'identifiants proposés :`);
  [...res.publicIds.keys()].slice(0, 6).forEach((k) => console.log(`     ${k}`));

  if (!APPLIQUER) console.log(`\nSimulation terminée — aucun envoi, aucune écriture en base.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
