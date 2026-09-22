// Décode les noms de fichiers Loria en référence catalogue, et dit à quelle
// fiche chacune irait — ou pourquoi aucune fiche actuelle ne l'accueille.
//
//   node prisma/decoder-loria.mjs
//
// N'ÉCRIT RIEN.
//
// POURQUOI CE SCRIPT ET PAS proposer-visuels.mjs
//   proposer-visuels compare des MOTS entre un nom de fichier et un nom de
//   fiche. Ça marche quand la fiche porte l'information — « Verano »,
//   « support de plantes ». Chez Loria, les photos sont nommées par
//   RÉFÉRENCE (« loria-l0a10w-blanc_01.jpg ») alors que les fiches actuelles
//   ne portent qu'un garnissage générique (« Chaise et fauteuil 4 pieds
//   métal, coque PP »). Aucun mot commun n'existe entre les deux : ce n'est
//   pas que le rapprochement échoue, c'est qu'il n'y a rien à rapprocher par
//   les mots. Il faut lire la référence.
//
// LA RÈGLE, ÉTABLIE EN COMPARANT LES 80 NOMS DU DÉPÔT AU TARIF (p.72-75)
//   loria-lcj001-noir-010_01.jpg  →  LCJ0/1  (patins  — le « 010 » reprend
//                                     le « coloris*/010 » du tarif p.73 ;
//                                     son absence = roulettes, le défaut)
//   loria-l0a10w-blanc_01.jpg     →  LOA1/W  (le 0 remplace la lettre O ;
//                                     suffixe W = Vert Foncé, p.74)
//
//   1. minuscules, le O de la référence est tapé 0
//   2. le suffixe est complété à deux caractères par un zéro à gauche
//      (1→01, B→0B, W→0W) sauf s'il en avait déjà deux (10, B0)
//   3. le mot qui suit est la couleur de COQUE (six teintes au choix,
//      indépendantes de la référence — d'où plusieurs photos par référence)
//
// CE QUE ÇA CHANGE
//   Une fois la référence lue, le rattachement n'est plus un score : c'est
//   une table. Soit la référence existe dans le tarif et l'on sait tout
//   d'elle (piétement, garnissage, couleur de jambe), soit elle n'existe
//   pas et le fichier est signalé, jamais deviné.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { racineMediatheque, dossierDepot } from "../lib/mediatheque.js";

const prisma = new PrismaClient();
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

// ── La table des références, telle que lue pages 72 à 75 ──────────────
// Chaque entrée : root (tel qu'imprimé) → { piétement, produit: {C:chaise,
// O:fauteuil}, garnissage, suffixes: { code → couleur/jambe } }.
const GARNISSAGE = { NU: "Sans placet", PLACET: "Avec placet", TAPISSE: "Entièrement tapissée" };
const METAL = { 1: "Époxy noir", 7: "Époxy blanc", 4: "Chromé" };
const OUTDOOR = { A: "Blanc Ciment", W: "Vert Foncé", T: "Taupe", E: "Bordeaux Foncé", P: "Noir Graphite" };

const ROOTS = {
  // Métal — 4 pieds
  LCA0: { piétement: "4 pieds métal", produit: "Chaise", garnissage: GARNISSAGE.NU, suffixes: METAL },
  LOA1: { piétement: "4 pieds métal", produit: "Fauteuil", garnissage: GARNISSAGE.NU, suffixes: METAL },
  LCB0: { piétement: "4 pieds métal", produit: "Chaise", garnissage: GARNISSAGE.PLACET, suffixes: METAL },
  LOB1: { piétement: "4 pieds métal", produit: "Fauteuil", garnissage: GARNISSAGE.PLACET, suffixes: METAL },
  LCC0: { piétement: "4 pieds métal", produit: "Chaise", garnissage: GARNISSAGE.TAPISSE, suffixes: { 10: "Époxy noir", 70: "Époxy blanc", 40: "Chromé" } },
  LOC1: { piétement: "4 pieds métal", produit: "Fauteuil", garnissage: GARNISSAGE.TAPISSE, suffixes: { 10: "Époxy noir", 70: "Époxy blanc", 40: "Chromé" } },
  // Bois — 4 pieds (LOA1/LOB1/LOC1 partagent leur root avec le métal : seul
  // le suffixe « B » les distingue, jamais ambigu avec les suffixes ci-dessus)
  LCAB: { piétement: "4 pieds bois", produit: "Chaise", garnissage: GARNISSAGE.NU, suffixes: { B: "Bois", ...OUTDOOR } },
  LCBB: { piétement: "4 pieds bois", produit: "Chaise", garnissage: GARNISSAGE.PLACET, suffixes: { B: "Bois", ...OUTDOOR } },
  // Giratoire
  LCJ0: { piétement: "Giratoire", produit: "Chaise", garnissage: GARNISSAGE.NU, suffixes: METAL },
  LOJ1: { piétement: "Giratoire", produit: "Fauteuil", garnissage: GARNISSAGE.NU, suffixes: METAL },
  LCK0: { piétement: "Giratoire", produit: "Chaise", garnissage: GARNISSAGE.PLACET, suffixes: METAL },
  LOK1: { piétement: "Giratoire", produit: "Fauteuil", garnissage: GARNISSAGE.PLACET, suffixes: METAL },
  LCL0: { piétement: "Giratoire", produit: "Chaise", garnissage: GARNISSAGE.TAPISSE, suffixes: { 10: "Époxy noir", 70: "Époxy blanc" } },
  LOL1: { piétement: "Giratoire", produit: "Fauteuil", garnissage: GARNISSAGE.TAPISSE, suffixes: { 10: "Époxy noir", 70: "Époxy blanc" } },
  // Chaise haute / tabouret, pieds métal
  LCHA: { piétement: "Pieds métal haute", produit: "Chaise haute", garnissage: GARNISSAGE.NU, suffixes: { 1: "Époxy noir", 4: "Chromé" } },
  LOHA: { piétement: "Pieds métal haute", produit: "Tabouret", garnissage: GARNISSAGE.NU, suffixes: { 1: "Époxy noir", 4: "Chromé" } },
  LCHB: { piétement: "Pieds métal haute", produit: "Chaise haute", garnissage: GARNISSAGE.PLACET, suffixes: { 1: "Époxy noir", 4: "Chromé" } },
  LOHB: { piétement: "Pieds métal haute", produit: "Tabouret", garnissage: GARNISSAGE.PLACET, suffixes: { 1: "Époxy noir", 4: "Chromé" } },
  LCHC: { piétement: "Pieds métal haute", produit: "Chaise haute", garnissage: GARNISSAGE.TAPISSE, suffixes: { 1: "Époxy noir", 4: "Chromé" } },
  LOHC: { piétement: "Pieds métal haute", produit: "Tabouret", garnissage: GARNISSAGE.TAPISSE, suffixes: { 1: "Époxy noir", 4: "Chromé" } },
};
// L'outdoor réutilise les roots LOA1/LOB1/LOC1 du métal fauteuil : mêmes
// clés, suffixes fusionnés (les alphabets ne se recouvrent jamais : chiffres
// contre lettres A/W/T/E/P).
ROOTS.LOA1.suffixes = { ...METAL, B: "Bois", ...OUTDOOR };
ROOTS.LOB1.suffixes = { ...METAL, B: "Bois", ...OUTDOOR };
ROOTS.LOC1.suffixes = { ...{ 10: "Époxy noir", 70: "Époxy blanc", 40: "Chromé" }, B0: "Bois", ...OUTDOOR };
ROOTS.LCC0.suffixes = { ...ROOTS.LCC0.suffixes, B0: "Bois" };
ROOTS.LCBB.suffixes = { ...ROOTS.LCBB.suffixes };   // déjà B + OUTDOOR

// L'ordre de test importe : LCC0/LOC1 doivent être essayés avant qu'on ne
// confonde leur préfixe avec un autre — mais les roots font tous 4
// caractères, donc aucun recouvrement n'est possible entre eux.
const ROOT_KEYS = Object.keys(ROOTS);

/** Un nom de fichier Loria, décodé — ou null s'il ne correspond à rien. */
function decoder(nomFichier) {
  let k = nomFichier.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/_\d+$/, "");
  // Le marqueur giratoire patins/roulettes, en fin de nom.
  let base = null;
  if (/-010$/.test(k)) { base = "Patins"; k = k.slice(0, -4); }
  else if (/-000$/.test(k)) { base = "Roulettes"; k = k.slice(0, -4); }

  const m = /^loria-([a-z0-9]+?)(?:-(.+))?$/.exec(k);
  if (!m) return null;
  const [, bloc, reste] = m;

  for (const root of ROOT_KEYS) {
    // Le O de la référence est tapé 0 dans le nom de fichier.
    const rootFichier = root.toLowerCase().replace(/o/g, "0");
    if (!bloc.startsWith(rootFichier)) continue;
    let suffixeFichier = bloc.slice(rootFichier.length);
    if (!suffixeFichier) continue;
    // Le suffixe catalogue est complété à deux caractères par un zéro
    // devant, sauf s'il en avait déjà deux.
    const infos = ROOTS[root];
    for (const [suffixeCatalogue, jambe] of Object.entries(infos.suffixes)) {
      const attendu = (suffixeCatalogue.length === 1 ? `0${suffixeCatalogue}` : suffixeCatalogue).toLowerCase();
      if (suffixeFichier === attendu) {
        return {
          reference: `${root}/${suffixeCatalogue}`,
          ...infos, jambe,
          base: infos.piétement === "Giratoire" ? (base || "Roulettes") : null,
          coque: reste || null,
        };
      }
    }
  }
  return null;
}

async function main() {
  const racine = racineMediatheque();
  if (!racine) { console.error("Médiathèque introuvable sur ce poste."); process.exitCode = 1; return; }

  const gamme = await prisma.gamme.findFirst({
    where: { nom: "Loria" },
    select: {
      marque: { select: { slug: true } },
      vitrines: {
        orderBy: { nom: "asc" },
        select: { id: true, nom: true, publie: true, _count: { select: { visuels: true } } },
      },
    },
  });
  if (!gamme) { console.error("Gamme Loria introuvable."); process.exitCode = 1; return; }

  const depot = join(racine, dossierDepot(gamme.marque.slug, "Loria"));
  const fichiers = [];
  for (const sous of ["photo", "ambiance", "detoure", "schema"]) {
    const d = join(depot, sous);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) fichiers.push({ nom: f, sous });
  }

  const decodes = [];
  const illisibles = [];
  for (const f of fichiers) {
    const d = decoder(f.nom);
    if (d) decodes.push({ ...f, ...d });
    else illisibles.push(f);
  }

  titre("CE QUE LES RÉFÉRENCES DISENT");
  console.log(`\n   ${fichiers.length} fichiers dans le dépôt`);
  console.log(`   ${decodes.length} référence(s) reconnue(s)`);
  console.log(`   ${illisibles.length} sans référence lisible (ambiances, zooms, génériques)`);

  // Regrouper par tier (piétement + produit + garnissage + base), et dire
  // combien de fiches actuelles portent ce tier.
  const parTier = new Map();
  for (const d of decodes) {
    const cle = `${d.produit} · ${d.piétement}${d.base ? ` (${d.base})` : ""} · ${d.garnissage}`;
    if (!parTier.has(cle)) parTier.set(cle, []);
    parTier.get(cle).push(d);
  }

  titre("PAR FAMILLE (piétement × garnissage)");
  console.log("");
  for (const [cle, ds] of [...parTier].sort((a, b) => b[1].length - a[1].length)) {
    const refs = new Set(ds.map((d) => d.reference));
    console.log(`   ${String(ds.length).padStart(3)} photos · ${refs.size} référence(s)   ${cle}`);
  }

  titre("CE QUI N'A AUCUNE FICHE AUJOURD'HUI");
  console.log("\n   (les 23 fiches actuelles sont génériques et ne distinguent pas");
  console.log("   toujours piétement bois / métal / outdoor — celles marquées");
  console.log("   « bois nu » et « outdoor » n'ont souvent pas de fiche dédiée)\n");
  // On ne peut pas savoir SANS relire chaque fiche quelles combinaisons elle
  // porte réellement (les noms sont génériques) : on affiche donc la liste
  // des familles pour que la décision se prenne à l'œil, pas par un score.
  const nomsFiches = gamme.vitrines.map((v) => v.nom);
  console.log(`   Fiches actuelles (${gamme.vitrines.length}) :`);
  for (const n of nomsFiches) console.log(`      ${n}`);

  if (illisibles.length) {
    titre("FICHIERS SANS RÉFÉRENCE LISIBLE");
    console.log("");
    for (const f of illisibles) console.log(`   ${f.sous}/${f.nom}`);
  }

  console.log("\nAucune image n'a été déplacée, aucune fiche modifiée.");
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
