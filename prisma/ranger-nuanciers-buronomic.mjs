// Corrige le rangement des nuanciers Buronomic.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/ranger-nuanciers-buronomic.mjs
//   node prisma/ranger-nuanciers-buronomic.mjs --appliquer
//
// CE QUE prisma/nuancier-buronomic.mjs A MAL FAIT
//   Il a classé les teintes d'après leur LIBELLÉ seul. Deux erreurs en ont
//   découlé.
//
//   « A2403 », « B2421 », « C1 — classique Aluminium » sont des codes de
//   tarif. Leur nature est écrite dans le GROUPE de la fiche qui les
//   emploie — « Tissu gamme A — Élégance », « Poignées » — pas dans le
//   libellé. Ils ont donc atterri dans « Teintes unies », tissus et poignées
//   confondus.
//
//   Et le nuancier « Tissus » refait BeSoft et Step Mélange, qui existaient
//   déjà avec de VRAIES PHOTOS de tissu. Le tarif écrit « PECHE TISSU » là
//   où la bibliothèque disait « Pêche » : le même tissu, en moins bien.
//
// CE QUE CELUI-CI FAIT
//   Il dissout « Tissus » dans les nuanciers d'origine — les finitions y
//   gagnent la photo — et découpe « Teintes unies » d'après le groupe qui
//   emploie chaque teinte.
//
//   Une teinte qu'aucune règle ne désigne reste où elle est. On ne range pas
//   au jugé ce qu'on n'a pas compris.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const MARQUE = "Buronomic";
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

// La forme d'un nom, débarrassée de ce qui dit la matière et des articles :
// « PECHE TISSU » et « Pêche » sont la même teinte, « Vert d'eau » et
// « VERT EAU TISSU » aussi.
const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/\b(tissu|tissus|metal|plastique)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .split(" ").filter((m) => m && !["d", "de", "du", "l", "la", "le"].includes(m))
  .join(" ");

// Le nom d'un groupe se normalise SANS retirer les mots de matière : c'est
// « Tissu gamme A » qui dit ce qu'est « A2403 », et le mot « tissu » y est
// l'essentiel. Le retirer, comme on le fait pour les noms de teinte, rendait
// la règle aveugle à ce qu'elle cherche.
const nuGroupe = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Le groupe de la fiche dit la nature de la teinte quand le libellé se tait.
const PAR_GROUPE = [
  [/tissu gamme a/, "Tissu gamme A — Élégance"],
  [/tissu gamme b/, "Tissu gamme B — Gabriel Chili"],
  [/poignee/, "Poignées"],
];

const cleDe = (nom) => `buronomic-${nu(nom).replace(/ /g, "-")}`;

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const palettes = await prisma.paletteFinition.findMany({
    where: { marque: MARQUE },
    select: {
      id: true, nom: true,
      finitions: {
        select: {
          id: true, nom: true, couleur: true, imageUrl: true,
          valeurs: { select: { id: true, choix: { select: { nom: true } } } },
        },
      },
    },
  });
  const par = Object.fromEntries(palettes.map((p) => [p.nom, p]));

  // ── 1. Dissoudre « Tissus » dans les nuanciers d'origine ────────────
  //
  // L'équivalent se cherche dans TOUS les autres nuanciers de la marque, et
  // non dans les deux qu'on avait en tête : « GRIS CLAIR TISSU » avait son
  // jumeau dans « Teintes unies », et restait seul dans un nuancier d'une
  // teinte faute qu'on soit allé l'y chercher.
  const origine = palettes
    .filter((p) => p.nom !== "Tissus")
    .flatMap((p) => p.finitions.map((f) => ({ f, palette: p })));
  // À égalité de nom, on préfère la teinte qui porte une photo de tissu.
  const parNom = new Map();
  for (const o of origine) {
    const k = nu(o.f.nom);
    const deja = parNom.get(k);
    if (!deja || (!deja.f.imageUrl && o.f.imageUrl)) parNom.set(k, o);
  }

  const fusions = [];
  const orphelins = [];
  for (const f of par["Tissus"]?.finitions || []) {
    const cible = parNom.get(nu(f.nom));
    if (cible) fusions.push({ f, vers: cible });
    else orphelins.push(f);
  }

  titre("« TISSUS » SERAIT DISSOUS");
  console.log("");
  for (const x of fusions) {
    const photo = x.vers.f.imageUrl ? "photo du tissu" : "couleur";
    console.log(`   ${x.f.nom.padEnd(22)} ${String(x.f.valeurs.length).padStart(3)} finitions  →  ${x.vers.palette.nom} « ${x.vers.f.nom} »  (${photo})`);
  }
  if (orphelins.length) {
    console.log("\n   sans équivalent, laissées où elles sont :");
    for (const f of orphelins) console.log(`      ${f.nom.padEnd(22)} ${String(f.valeurs.length).padStart(3)} finitions`);
  }

  // ── 2. Découper « Teintes unies » selon le groupe ───────────────────
  const deplacements = [];
  const restent = [];
  for (const f of par["Teintes unies"]?.finitions || []) {
    // Le groupe majoritaire parmi les fiches qui emploient la teinte.
    const compte = new Map();
    for (const v of f.valeurs) compte.set(v.choix.nom, (compte.get(v.choix.nom) || 0) + 1);
    const groupe = [...compte].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const regle = PAR_GROUPE.find(([r]) => r.test(nuGroupe(groupe)));
    if (regle) deplacements.push({ f, groupe, vers: regle[1] });
    else restent.push({ f, groupe });
  }

  titre("« TEINTES UNIES » SERAIT DÉCOUPÉ");
  const versPalette = new Map();
  for (const d of deplacements) {
    if (!versPalette.has(d.vers)) versPalette.set(d.vers, []);
    versPalette.get(d.vers).push(d);
  }
  for (const [nom, liste] of versPalette) {
    console.log(`\n   ${nom}`);
    for (const d of liste) {
      console.log(`      ${(d.f.couleur || "—").padEnd(9)} ${d.f.nom.padEnd(26)} ${String(d.f.valeurs.length).padStart(3)} finitions   ← « ${d.groupe} »`);
    }
  }
  if (restent.length) {
    console.log("\n   restent dans « Teintes unies » :");
    for (const r of restent) console.log(`      ${(r.f.couleur || "—").padEnd(9)} ${r.f.nom.padEnd(26)} ${String(r.f.valeurs.length).padStart(3)} finitions   ← « ${r.groupe} »`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");

  // Les finitions changent de modèle AVANT qu'on retire l'ancien : supprimer
  // d'abord les délierait en silence, et elles perdraient leur teinte.
  let rattachees = 0;
  for (const x of fusions) {
    const r = await prisma.valeurChoix.updateMany({
      where: { id: { in: x.f.valeurs.map((v) => v.id) } },
      data: { modeleId: x.vers.f.id, paletteId: x.vers.palette.id, couleur: null, imageUrl: null },
    });
    rattachees += r.count;
    await prisma.finitionModele.delete({ where: { id: x.f.id } });
  }
  console.log(`   « Tissus » : ${fusions.length} teintes dissoutes, ${rattachees} finitions rattachées`);

  if (!orphelins.length && par["Tissus"]) {
    await prisma.paletteFinition.delete({ where: { id: par["Tissus"].id } });
    console.log(`   « Tissus » : nuancier retiré, il ne restait rien dedans`);
  }

  for (const [nom, liste] of versPalette) {
    const palette = await prisma.paletteFinition.upsert({
      where: { id: cleDe(nom) },
      create: { id: cleDe(nom), nom, marque: MARQUE },
      update: { nom, marque: MARQUE },
    });
    for (let i = 0; i < liste.length; i += 1) {
      await prisma.finitionModele.update({
        where: { id: liste[i].f.id },
        data: { paletteId: palette.id, ordre: i },
      });
      await prisma.valeurChoix.updateMany({
        where: { modeleId: liste[i].f.id },
        data: { paletteId: palette.id },
      });
    }
    console.log(`   ${nom} : ${liste.length} teintes`);
  }

  titre("CONTRÔLE");
  const apres = await prisma.paletteFinition.findMany({
    where: { marque: MARQUE }, orderBy: { nom: "asc" },
    select: { nom: true, _count: { select: { finitions: true, valeurs: true } } },
  });
  for (const p of apres) {
    console.log(`   ${p.nom.padEnd(28)} ${String(p._count.finitions).padStart(3)} teintes · ${p._count.valeurs} finitions`);
  }
  const nues = await prisma.valeurChoix.count({
    where: {
      choix: { nature: "finition", vitrine: { gamme: { marque: { nom: MARQUE } } } },
      couleur: null, imageUrl: null, modele: null,
    },
  });
  console.log(`\n   finitions ${MARQUE} sans pastille : ${nues}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
