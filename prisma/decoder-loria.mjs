// Pose les photos Loria sur leur fiche, par la référence lue dans leur nom.
//
//   node prisma/decoder-loria.mjs               simulation
//   node prisma/decoder-loria.mjs --appliquer   envoie et range
//
// À lancer APRÈS prisma/reimporter-loria.mjs : le routage cherche la
// référence dans les combinaisons réellement écrites en base.
//
// PAS DE SCORE ICI
//   proposer-visuels.mjs rapproche des mots et donne une note. Ici la
//   référence lue dans le nom de fichier est cherchée telle quelle parmi les
//   combinaisons des fiches Loria. La fiche qui la porte est la cible : c'est
//   une correspondance, pas une ressemblance. Une référence qu'aucune fiche
//   ne porte, ou que deux fiches portent sans qu'on puisse trancher, est
//   signalée et jamais posée.
//
// LA RÈGLE DE NOMMAGE, ÉTABLIE EN COMPARANT LES 90 FICHIERS AU TARIF
//   loria-lcj001-noir-010_01.jpg  →  LCJ0/1, version patins
//   loria-l0a10w-blanc_01.jpg     →  LOA1/W
//
//   1. minuscules ; le O de la référence est tapé 0 (il n'apparaît qu'en
//      deuxième position : LOA1, LOHA, LOJ1…)
//   2. le suffixe est complété à deux caractères par un zéro à gauche
//      (1 → 01, B → 0B, W → 0W) sauf s'il en avait déjà deux (10, B0)
//   3. « -010 » en fin de nom = version patins, « -000 » ou rien = roulettes
//   4. le mot restant est la couleur de coque, qui ne change pas la
//      référence — d'où plusieurs photos pour une même référence
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { racineMediatheque, dossierDepot } from "../lib/mediatheque.js";
import { attribuerAUneFiche, cloudinaryPret } from "../lib/attribuerVisuels.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

/**
 * Le nom d'un fichier, décomposé.
 * Rend { reference, base, reste } — ou null si rien de lisible.
 */
function lireNom(nomFichier) {
  let k = nomFichier.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/_\d+$/, "");

  let base = null;
  if (/-010$/.test(k)) { base = "patins"; k = k.slice(0, -4); }
  else if (/-000$/.test(k)) { base = "roulettes"; k = k.slice(0, -4); }

  const m = /^loria-([a-z0-9]{4,6})(?:-(.+))?$/.exec(k);
  if (!m) return null;
  const [, bloc, reste] = m;

  // La racine fait quatre caractères ; le 0 en deuxième position est la
  // lettre O du tarif.
  let racine = bloc.slice(0, 4).toUpperCase();
  if (racine[1] === "0") racine = `${racine[0]}O${racine.slice(2)}`;

  const suffixeBrut = bloc.slice(4).toUpperCase();
  // Dépadder : « 01 » → « 1 », « 0B » → « B ». Aucun suffixe du tarif Loria
  // ne commence par un zéro, la règle est donc sans ambiguïté.
  const suffixe = suffixeBrut.length === 2 && suffixeBrut[0] === "0"
    ? suffixeBrut.slice(1) : suffixeBrut;

  return { racine, reference: suffixe ? `${racine}/${suffixe}` : null, base, reste: reste || null };
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — envoi Cloudinary et écriture ═══\n"
    : "═══ SIMULATION — rien n'est envoyé ni déplacé ═══\n");

  const racine = racineMediatheque();
  if (!racine) { console.error("Médiathèque introuvable sur ce poste."); process.exitCode = 1; return; }
  if (APPLIQUER && !cloudinaryPret()) {
    console.error("Cloudinary n'est pas configuré dans l'environnement.");
    process.exitCode = 1;
    return;
  }

  const gamme = await prisma.gamme.findFirst({
    where: { nom: "Loria" },
    select: {
      marque: { select: { slug: true } },
      vitrines: {
        where: { publie: true },
        orderBy: { nom: "asc" },
        select: {
          id: true, nom: true,
          gamme: { select: { nom: true, marque: { select: { slug: true } } } },
          visuels: { select: { url: true } },
          combinaisons: { select: { referenceBase: true } },
        },
      },
    },
  });
  if (!gamme) { console.error("Gamme Loria introuvable."); process.exitCode = 1; return; }

  // ── Quelle fiche porte quelle référence ─────────────────────────────
  const parReference = new Map();
  const parRacine = new Map();
  for (const v of gamme.vitrines) {
    for (const c of v.combinaisons) {
      const ref = String(c.referenceBase || "").trim().toUpperCase();
      if (!ref) continue;
      if (!parReference.has(ref)) parReference.set(ref, new Set());
      parReference.get(ref).add(v);
      const rac = ref.split("/")[0];
      if (!parRacine.has(rac)) parRacine.set(rac, new Set());
      parRacine.get(rac).add(v);
    }
  }

  // ── Lire le dépôt ───────────────────────────────────────────────────
  const depot = join(racine, dossierDepot(gamme.marque.slug, "Loria"));
  const fichiers = [];
  for (const sous of ["photo", "ambiance", "detoure", "schema"]) {
    const d = join(depot, sous);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) fichiers.push({ nom: f, sous, rel: join(dossierDepot(gamme.marque.slug, "Loria"), sous, f) });
  }

  const aPoser = new Map();   // vitrineId -> { vitrine, rels: [] }
  const sansReference = [];
  const ambigus = [];

  for (const f of fichiers) {
    const lu = lireNom(f.nom);
    if (!lu) { sansReference.push(f); continue; }

    // D'abord la référence complète, sinon la racine seule — sur « lcha0 »,
    // le suffixe manque mais la racine ne désigne qu'une fiche.
    let candidats = lu.reference ? parReference.get(lu.reference) : null;
    if (!candidats || !candidats.size) candidats = parRacine.get(lu.racine);
    if (!candidats || !candidats.size) { sansReference.push(f); continue; }

    let liste = [...candidats];
    // Le giratoire porte la même référence en roulettes et en patins : c'est
    // le marqueur du nom de fichier qui tranche. Son ABSENCE tranche aussi —
    // le dépôt contient « lcj001-noir-010 » ET « lcj001-noir », et le tarif
    // écrit « /000 » pour les roulettes, la version standard, « /010 » pour
    // les patins. Un nom sans marqueur est donc une photo sur roulettes.
    if (liste.length > 1 && liste.some((v) => /giratoire/i.test(v.nom))) {
      const base = lu.base || "roulettes";
      const filtre = liste.filter((v) => new RegExp(base, "i").test(v.nom));
      if (filtre.length === 1) liste = filtre;
    }
    if (liste.length !== 1) {
      ambigus.push({ f, lu, noms: liste.map((v) => v.nom) });
      continue;
    }

    const cible = liste[0];
    if (!aPoser.has(cible.id)) aPoser.set(cible.id, { vitrine: cible, rels: [] });
    aPoser.get(cible.id).rels.push(f.rel);
  }

  titre("CE QUI SERAIT POSÉ");
  let total = 0;
  for (const { vitrine, rels } of [...aPoser.values()].sort((a, b) => a.vitrine.nom.localeCompare(b.vitrine.nom))) {
    total += rels.length;
    console.log(`\n   ${vitrine.nom}`);
    for (const r of rels) console.log(`      ${r.split(/[/\\]/).slice(-2).join("/")}`);
  }
  console.log(`\n   ${aPoser.size} fiches · ${total} photos`);

  if (ambigus.length) {
    titre("RÉFÉRENCES QUE DEUX FICHES PARTAGENT");
    console.log("\n   Le tarif imprime la même référence pour deux produits.");
    console.log("   Rien n'est posé : à trancher à l'œil dans /admin/visuels.\n");
    for (const a of ambigus) {
      console.log(`   ${a.f.nom}  →  ${a.lu.reference}`);
      for (const n of a.noms) console.log(`        ${n}`);
    }
  }

  if (sansReference.length) {
    titre("FICHIERS SANS RÉFÉRENCE LISIBLE");
    console.log("\n   Ambiances, zooms, vues de gamme — ils restent au dépôt.\n");
    for (const f of sansReference) console.log(`   ${f.sous}/${f.nom}`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour envoyer et écrire.");
    return;
  }

  titre("ENVOI");
  let poses = 0;
  const echecs = [];
  for (const { vitrine, rels } of aPoser.values()) {
    const r = await attribuerAUneFiche({ prisma, base: racine, vitrine, rels });
    poses += r.faits.length;
    for (const e of r.echecs) echecs.push(`${vitrine.nom} — ${e.rel} : ${e.raison}`);
    console.log(`   ${vitrine.nom.slice(0, 54).padEnd(56)} ${r.faits.length} posée(s)`);
  }

  titre("CONTRÔLE");
  console.log(`   photos posées : ${poses} / ${total}`);
  for (const e of echecs.slice(0, 10)) console.log(`      ⚠ ${e}`);
  const sansImg = await prisma.produitVitrine.count({
    where: { gamme: { nom: "Loria" }, publie: true, visuels: { none: {} } },
  });
  console.log(`   fiches Loria publiées sans aucune image : ${sansImg}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
