// Rationalisation du catalogue Buronomic 2026.
//
// Confronte le document fournisseur « distributeurs-rationalisation-du-
// catalogue-2026 » à la base, et retire ce qui quitte la collection.
//
// En simulation par défaut : le script dit ce qu'il ferait, sans rien écrire.
//
//   node prisma/buronomic-rationalisation-2026.mjs
//   node prisma/buronomic-rationalisation-2026.mjs --appliquer
//
// Le PDF liste 31 lignes. Une bonne moitié ne concerne pas notre catalogue :
// les gammes Dialogue, Visio Hub, Calme, Fifty-Fifty et les sièges Colibri,
// Nami, Yumi, Libellule n'ont jamais été importés. Chaque règle ci-dessous
// porte donc son libellé d'origine, pour qu'on puisse relire le PDF ligne à
// ligne et vérifier qu'aucune n'a été oubliée — y compris celles qui ne
// trouvent rien.
//
// Les articles restent disponibles jusqu'à épuisement des stocks : la date
// du retrait est une décision commerciale, pas une conséquence du document.
import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

// Une règle vise soit des fiches entières, soit des déclinaisons, soit des
// finitions. `page` renvoie à la page du PDF, `libelle` reprend son titre.
const FICHES = [
  { page: 3, libelle: "FIFTY-FIFTY — accueil", gammeVide: "Fifty-Fifty" },
  { page: 3, libelle: "PRESTIGE — bureaux direction", noms: ["Table de conférence - Prestige Réunion", "Extension centrale pour table de conférence Prestige"] },
  { page: 4, libelle: "ALTO — toutes les tables carrées", noms: ["Table de réunion carrée - Alto Réunion"] },
  { page: 4, libelle: "PLATEAUX TONNEAUX — toutes les versions", noms: ["Table de réunion tonneau - Alto", "Table de réunion tonneau - Astro", "Table de réunion tonneau - Astrolite", "Table de réunion tonneau - Partage"] },
  { page: 6, libelle: "ASTRO — bureaux sur B-box individuels et multipostes", noms: ["Bureau sur console B-box - Astro", "Bureau multiposte sur consoles B-box - Astro"] },
  { page: 6, libelle: "MULTIPOSTE SUR B-BOX — toutes gammes concernées", noms: ["Bureau multiposte sur consoles B-box - Astrolite", "Bureau multiposte sur consoles B-box - Partage"] },
  { page: 6, libelle: "OBTURATEURS USB A — suppression fournisseur", noms: ["Obturateur électrifié USB-A et USB-C"] },
];

// Déclinaisons : la fiche reste, elle perd des lignes.
const DECLINAISONS = [
  { page: 4, libelle: "COHESION HAUTE — tous les plateaux électrifiés", fiche: "Table haute - Cohésion", garde: (v) => v.electrification !== "Avec bloc électrique encastré" },
  { page: 4, libelle: "ASTRO REUNION — L140 / L200 x P100 avec TAC", fiche: "Table de réunion rectangle - Astro", garde: (v) => v.equipement !== "Avec Top Access double" },
  { page: 4, libelle: "PLATEAU ROND diam. 80 cm", fiche: "Table de réunion ronde - Astrolite", garde: (v) => v.diametre !== "Ø 80 cm" },
  { page: 4, libelle: "PLATEAU ROND diam. 80 cm", fiche: "Table de réunion ronde - Partage", garde: (v) => v.diametre !== "Ø 80 cm" },
  { page: 4, libelle: "RETRO + ESSENTIEL — L80 x P80", fiche: "Bureau plan droit - Retro", garde: (v) => v.longueur !== "80 cm" },
  { page: 4, libelle: "RETRO + ESSENTIEL — L80 x P80", fiche: "Bureau plan droit avec voile de fond - Essentiel", garde: (v) => v.longueur !== "L 80 cm" },
  { page: 6, libelle: "SOLUTION — pied chrome", fiche: "Table droite pliante - Solution", garde: (v) => v.pietement !== "Chrome" },
  { page: 6, libelle: "COULISSANT SOLO — toutes gammes concernées", fiche: "Bureau plan droit hauteur fixe - Astrolite", garde: (v) => v.plateau !== "Plateau coulissant" },
  { page: 6, libelle: "COULISSANT SOLO — toutes gammes concernées", fiche: "Bureau plan droit - Partage", garde: (v) => v.plateau !== "Plateau coulissant" },
  // Le multiposte P143 est un face-à-face de deux plans P70 : c'est lui que
  // vise « coulissant P70 ». Le P163, face-à-face de P80, reste.
  { page: 6, libelle: "COULISSANT P70 CM — toutes gammes concernées", fiche: "Bureau multiposte - Astrolite", garde: (v) => !(v.plateau === "Plateaux coulissants" && /^P 143/.test(v.dimensions || "")) },
  { page: 6, libelle: "COULISSANT P70 CM — toutes gammes concernées", fiche: "Bureau multiposte - Partage", garde: (v) => !(v.plateau === "Plateaux coulissants" && /^P 143/.test(v.dimensions || "")) },
];

// Finitions : la fiche et ses déclinaisons restent, le nuancier maigrit.
// Le nom seul ne suffit pas — « Orange » et « Ocre » existent dans plusieurs
// nuanciers et le PDF ne retire que celui qu'il nomme.
const FINITIONS = [
  { page: 2, libelle: "TIMBER — décor mélamine bois", nom: /^Timber$/i },
  { page: 2, libelle: "ARGILE — décor mélamine uni", nom: /^Argile$/i },
  { page: 2, libelle: "STEP ORANGE — tissu Step", nom: /^Orange$/i, groupe: /step/i },
  { page: 2, libelle: "VERT AMANDE — métal", nom: /^Vert amande/i },
  { page: 2, libelle: "OCRE — métal", nom: /^Ocre —/i },
];

// Lignes du PDF sans équivalent en base, vérifiées une par une.
const ABSENTES = [
  [3, "DIALOGUE — bureaux collaboratifs"], [3, "VISIO HUB — coworking"], [3, "CALME — confidentialité"],
  [4, "TRANSGAMME — L143 / L163 x P70"], [4, "ALTO — plateaux L100 x P70 / P80"],
  [5, "COLIBRI"], [5, "NAMI & YUMI"], [5, "LIBELLULE"],
  [6, "SEPARATEURS & BAC ALTO — forme trapèze"], [6, "LAMPES & BRAS DOUBLE ECRAN NOVUS"],
  [6, "DETENTE — plateau noir"], [6, "DESCENTE DE CÂBLES L110"],
];

const val = (d) => d.valeurs || {};

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION — rien n'est écrit ═══\n");

  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marque: { slug: "buronomic" } } },
    select: { id: true, nom: true, publie: true, declinaisons: true, axesDeclinaisons: true,
              gamme: { select: { id: true, nom: true } },
              groupesFinition: { select: { id: true, nom: true, finitions: { select: { id: true, nom: true } } } } },
  });
  const parNom = new Map(vitrines.map((v) => [v.nom, v]));
  console.log(`${vitrines.length} fiches Buronomic en base\n`);

  // ── 1. Fiches qui disparaissent entièrement ──
  const aSupprimer = [];
  const gammesVides = [];
  console.log("── FICHES SUPPRIMÉES ENTIÈREMENT ──\n");
  for (const r of FICHES) {
    console.log(`p.${r.page}  ${r.libelle}`);
    if (r.gammeVide) {
      const g = await prisma.gamme.findFirst({ where: { nom: r.gammeVide, marque: { slug: "buronomic" } }, include: { _count: { select: { vitrines: true } } } });
      if (!g) console.log(`        gamme absente de la base — rien à faire\n`);
      else { gammesVides.push(g); console.log(`        gamme « ${g.nom} » présente, ${g._count.vitrines} fiche(s) — coquille vide à supprimer\n`); }
      continue;
    }
    for (const nom of r.noms) {
      const v = parNom.get(nom);
      if (!v) { console.log(`        ✗ « ${nom} » introuvable`); continue; }
      aSupprimer.push(v);
      console.log(`        ${v.nom.padEnd(52)} ${String((v.declinaisons || []).length).padStart(3)} décl. · ${v.gamme.nom}${v.publie ? "" : " [non publiée]"}`);
    }
    console.log("");
  }

  // ── 2. Fiches qui perdent des déclinaisons ──
  console.log("── FICHES QUI PERDENT DES DÉCLINAISONS ──\n");
  const coupes = new Map();
  for (const r of DECLINAISONS) {
    const v = parNom.get(r.fiche);
    if (!v) { console.log(`p.${r.page}  ${r.libelle}\n        ✗ « ${r.fiche} » introuvable\n`); continue; }
    const d = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    const precedent = coupes.get(v.id);
    const restant = precedent ? precedent.restant : d;
    const garde = restant.filter((x) => r.garde(val(x)));
    coupes.set(v.id, { vitrine: v, restant: garde, total: d.length });
    console.log(`p.${r.page}  ${r.libelle}`);
    console.log(`        ${v.nom.padEnd(52)} −${String(restant.length - garde.length).padStart(2)} sur ${d.length} → ${garde.length} restantes\n`);
  }

  // ── 3. Finitions retirées des nuanciers ──
  console.log("── FINITIONS RETIRÉES DES NUANCIERS ──\n");
  const finSupprimees = [];
  for (const r of FINITIONS) {
    const touchees = [];
    for (const v of vitrines) for (const g of v.groupesFinition) {
      if (r.groupe && !r.groupe.test(g.nom)) continue;
      for (const f of g.finitions) if (r.nom.test(f.nom)) touchees.push({ v, g, f });
    }
    finSupprimees.push(...touchees);
    const fiches = new Set(touchees.map((t) => t.v.id));
    console.log(`p.${r.page}  ${r.libelle}`);
    console.log(`        ${touchees.length} ligne(s) sur ${fiches.size} fiche(s)${touchees.length ? ` · nuancier(s) : ${[...new Set(touchees.map((t) => t.g.nom))].join(", ")}` : ""}\n`);
  }
  // Un nuancier qui perdrait toutes ses finitions est un signal, pas une fatalité.
  const parGroupe = new Map();
  for (const t of finSupprimees) parGroupe.set(t.g.id, [...(parGroupe.get(t.g.id) || []), t]);
  const groupesVides = [...parGroupe.values()].filter((ts) => ts.length === ts[0].g.finitions.length).map((ts) => ts[0]);

  // ── 4. Lignes du PDF sans équivalent ──
  console.log("── LIGNES DU PDF SANS ÉQUIVALENT EN BASE ──\n");
  for (const [page, libelle] of ABSENTES) console.log(`p.${page}  ${libelle}`);

  // ── Récapitulatif ──
  const declPerdues = [...coupes.values()].reduce((s, c) => s + (c.total - c.restant.length), 0);
  const declSupprimees = aSupprimer.reduce((s, v) => s + (v.declinaisons || []).length, 0);
  const idsSupprimes = new Set(aSupprimer.map((v) => v.id));
  const fichesFinitions = new Set(finSupprimees.filter((t) => !idsSupprimes.has(t.v.id)).map((t) => t.v.id));
  console.log("\n═══ AMPLEUR ═══\n");
  console.log(`  ${aSupprimer.length} fiches disparaissent entièrement  (${declSupprimees} déclinaisons avec elles)`);
  console.log(`  ${coupes.size} fiches perdent des déclinaisons  (${declPerdues} déclinaisons)`);
  console.log(`  ${fichesFinitions.size} fiches perdent des finitions  (${finSupprimees.length} lignes de finition)`);
  const touchees = new Set([...idsSupprimes, ...coupes.keys(), ...fichesFinitions]);
  console.log(`  ─────`);
  console.log(`  ${touchees.size} fiches touchées sur ${vitrines.length} · ${vitrines.length - aSupprimer.length} fiches restantes`);
  if (gammesVides.length) console.log(`  ${gammesVides.length} gamme vide à supprimer : ${gammesVides.map((g) => g.nom).join(", ")}`);
  if (groupesVides.length) {
    console.log(`\n  ⚠ ${groupesVides.length} nuancier(s) perdraient toutes leurs finitions :`);
    for (const t of groupesVides) console.log(`      ${t.v.nom} · groupe « ${t.g.nom} »`);
  }

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer."); return; }

  await mkdir("prisma/sauvegardes", { recursive: true });
  const sauv = `prisma/sauvegardes/buronomic-rationalisation-avant-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(sauv, JSON.stringify({ fiches: vitrines.filter((v) => touchees.has(v.id)), gammesVides: gammesVides.map((g) => ({ id: g.id, nom: g.nom })) }, null, 2), "utf8");
  console.log(`\nSauvegarde : ${sauv}\n`);

  for (const v of aSupprimer) { await prisma.produitVitrine.delete({ where: { id: v.id } }); console.log(`   ✓ fiche supprimée — ${v.nom}`); }
  for (const c of coupes.values()) {
    if (idsSupprimes.has(c.vitrine.id)) continue;
    await prisma.produitVitrine.update({ where: { id: c.vitrine.id }, data: { declinaisons: c.restant } });
    console.log(`   ✓ ${c.vitrine.nom} — ${c.total - c.restant.length} déclinaison(s) retirée(s)`);
  }
  const idsFin = [...new Set(finSupprimees.filter((t) => !idsSupprimes.has(t.v.id)).map((t) => t.f.id))];
  const { count } = await prisma.finition.deleteMany({ where: { id: { in: idsFin } } });
  console.log(`   ✓ ${count} finition(s) retirée(s) des nuanciers`);
  for (const g of gammesVides) { await prisma.gamme.delete({ where: { id: g.id } }); console.log(`   ✓ gamme vide supprimée — ${g.nom}`); }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
