// Raccourcit les titres qui recopient le libellé de colonne du tarif.
//
//   node prisma/raccourcir-titres.mjs
//   node prisma/raccourcir-titres.mjs --marque=Sokoa
//   node prisma/raccourcir-titres.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Cent vingt-deux fiches portent un titre de plus de soixante-dix
//   caractères, toutes chez Sokoa. Ce sont les en-têtes de colonne du tarif,
//   repris tels quels :
//
//     Fauteuil haut dossier résille, accotoirs 3D, base nylon noir,
//     roulettes ø50 sol moquette
//
//   La moitié décrit un piétement qui figure déjà dans la section
//   « Piétement » de la fiche. Le client lit deux fois la même chose, et la
//   partie utile — le dossier, les accotoirs — se noie.
//
// CE QU'ON RETIRE
//   Uniquement les clauses qui ne parlent que du piétement ou du sol : base,
//   roulettes, lift, ø65, sol dur, sol moquette. Tout le reste est conservé,
//   parce que tout le reste peut distinguer deux produits — « accotoirs 1D »
//   et « accotoirs 3D » sont deux articles au tarif.
//
// LA GARDE QUI COMPTE
//   Raccourcir peut faire converger deux titres. Le script détecte ces
//   collisions et remet, pour les seules fiches concernées, les clauses qui
//   les distinguaient — jamais toutes, seulement celles qui diffèrent. Si
//   deux fiches restent indiscernables même ainsi, elles gardent leur titre
//   d'origine et sont signalées : un doublon de titre dans une liste est
//   pire qu'un titre long.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const MARQUE = (process.argv.find((a) => a.startsWith("--marque=")) || "").slice(9) || null;
const SEUIL = 70;

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Une clause ne décrivant que le piétement ou le sol : elle est déjà dans la
// section « Piétement » de la fiche.
const PIETEMENT = /^(avec\s+)?(base|roulettes?|pi[ée]tement|lift|rsd)\b|sol (dur|moquette)|ø\s?\d+|ajour/i;

/** Découpe « Nom, clause, clause - Gamme » en { clauses, suffixe }. */
function decouper(nom) {
  const i = nom.lastIndexOf(" - ");
  const tete = i === -1 ? nom : nom.slice(0, i);
  const suffixe = i === -1 ? "" : nom.slice(i);
  return { clauses: tete.split(",").map((s) => s.trim()).filter(Boolean), suffixe };
}

const recomposer = (clauses, suffixe) => `${clauses.join(", ")}${suffixe}`;

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const vitrines = await prisma.produitVitrine.findMany({
    where: {
      publie: true,
      ...(MARQUE ? { gamme: { marque: { nom: { contains: MARQUE, mode: "insensitive" } } } } : {}),
    },
    select: { id: true, nom: true, gamme: { select: { id: true, nom: true } } },
  });

  const longs = vitrines.filter((v) => v.nom.length > SEUIL);
  if (!longs.length) { console.log(`Aucun titre de plus de ${SEUIL} caractères. Rien à faire.`); return; }

  // Premier jet : on retire les clauses de piétement.
  for (const v of longs) {
    const { clauses, suffixe } = decouper(v.nom);
    v.decoupe = { clauses, suffixe };
    v.gardees = clauses.filter((c) => !PIETEMENT.test(c));
    if (!v.gardees.length) v.gardees = [clauses[0]];
    v.retirees = clauses.filter((c) => PIETEMENT.test(c));
    v.court = recomposer(v.gardees, suffixe);
  }

  // Les titres déjà courts comptent aussi comme occupés : on ne doit pas
  // tomber dessus en raccourcissant.
  const occupes = new Map();
  for (const v of vitrines) {
    if (!occupes.has(v.nom)) occupes.set(v.nom, []);
    occupes.get(v.nom).push(v.id);
  }

  // Deuxième passe : résoudre les collisions en remettant ce qui distingue.
  const groupes = new Map();
  for (const v of longs) {
    if (!groupes.has(v.court)) groupes.set(v.court, []);
    groupes.get(v.court).push(v);
  }

  const irreductibles = [];
  for (const [court, membres] of groupes) {
    const heurteUnAutre = occupes.has(court) && occupes.get(court).some((id) => !membres.some((m) => m.id === id));
    if (membres.length === 1 && !heurteUnAutre) continue;

    // Quelles clauses retirées diffèrent d'un membre à l'autre ?
    for (const v of membres) {
      const autres = membres.filter((m) => m !== v);
      const distinctives = v.retirees.filter((c) => autres.some((m) => !m.retirees.includes(c)));
      v.court = recomposer([...v.gardees, ...distinctives], v.decoupe.suffixe);
    }
    const apres = membres.map((m) => m.court);
    if (new Set(apres).size !== membres.length) {
      for (const v of membres) { v.court = v.nom; irreductibles.push(v); }
    }
  }

  const changes = longs.filter((v) => v.court !== v.nom);

  titre(`${changes.length} TITRES RACCOURCIS`);
  const parGamme = new Map();
  for (const v of changes) {
    if (!parGamme.has(v.gamme.nom)) parGamme.set(v.gamme.nom, []);
    parGamme.get(v.gamme.nom).push(v);
  }
  for (const [g, liste] of [...parGamme].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n   ── ${g} (${liste.length})`);
    for (const v of liste.slice(0, 5)) {
      console.log(`      ${String(v.nom.length).padStart(3)} → ${String(v.court.length).padStart(3)}  ${v.court.replace(/ - [^-]+$/, "")}`);
    }
    if (liste.length > 5) console.log(`      … et ${liste.length - 5} autres`);
  }

  if (irreductibles.length) {
    titre("TITRES CONSERVÉS — DEUX FICHES RESTERAIENT INDISCERNABLES");
    console.log("");
    for (const v of irreductibles) console.log(`   ${v.gamme.nom.padEnd(16)} ${v.nom.slice(0, 56)}`);
  }

  // Dernier filet : ne pas CRÉER de doublon. Le catalogue en porte déjà —
  // trois « Tablette d'extension - Alto », par exemple — et ce n'est pas à ce
  // script de s'en occuper : refuser d'écrire pour un doublon qu'on n'a pas
  // fait reviendrait à bloquer un bon changement au nom d'un autre problème.
  const compter = (titres) => {
    const m = new Map();
    for (const n of titres) m.set(n, (m.get(n) || 0) + 1);
    return new Map([...m].filter(([, n]) => n > 1));
  };
  const finals = new Map();
  for (const v of vitrines) finals.set(v.id, v.nom);
  const avantDoublons = compter([...finals.values()]);
  for (const v of changes) finals.set(v.id, v.court);
  const apresDoublons = compter([...finals.values()]);

  const doublons = [...apresDoublons]
    .filter(([n, c]) => c > (avantDoublons.get(n) || 0));
  const dejaLa = [...avantDoublons];

  titre("LE COMPTE");
  const avant = Math.round(changes.reduce((n, v) => n + v.nom.length, 0) / (changes.length || 1));
  const apres = Math.round(changes.reduce((n, v) => n + v.court.length, 0) / (changes.length || 1));
  console.log(`   ${changes.length} titres · ${avant} → ${apres} caractères en moyenne`);
  console.log(`   ${irreductibles.length} conservés tels quels`);
  console.log(`   doublons créés par ce script : ${doublons.length}`);

  if (dejaLa.length) {
    titre("DOUBLONS DÉJÀ PRÉSENTS — SANS RAPPORT AVEC CE SCRIPT");
    console.log("\n   Ces fiches portent le même titre avant toute modification.");
    console.log("   À traiter à part : ce sont sans doute de vrais doublons de fiches.\n");
    for (const [n, c] of dejaLa) console.log(`   ${c}×  ${n}`);
  }

  if (doublons.length) {
    titre("CE SCRIPT CRÉERAIT DES DOUBLONS — RIEN NE SERA ÉCRIT");
    for (const [n, c] of doublons.slice(0, 10)) console.log(`   ${c}×  ${n}`);
    process.exitCode = 1;
    return;
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const v of changes) {
    await prisma.produitVitrine.update({
      where: { id: v.id }, data: { nom: v.court, slug: slug(v.court) },
    });
  }
  console.log(`   ${changes.length} titres réécrits.`);

  titre("CONTRÔLE");
  const restants = await prisma.produitVitrine.count({ where: { publie: true } });
  const encoreLongs = (await prisma.produitVitrine.findMany({
    where: { publie: true }, select: { nom: true },
  })).filter((v) => v.nom.length > SEUIL).length;
  console.log(`   ${restants} fiches publiées · ${encoreLongs} titres encore au-delà de ${SEUIL} caractères`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
