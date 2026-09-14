// Remplit descriptif et sectionsDevis des fiches OfficePro depuis
// officepro-descriptions.json.
//
// En simulation par défaut : le script contrôle et rend compte, sans écrire.
//
// Deux points méritent attention. Les sections attendent un `id` : l'éditeur
// admin s'en sert pour modifier ou supprimer une section, et sans lui toutes
// se confondent. Le JSON rédigé n'en a pas, on le pose à l'import.
//
// Et le contenu est du HTML affiché tel quel sur la fiche : on vérifie qu'il
// ne porte ni script ni gestionnaire d'événement, et que ses balises restent
// dans ce que le rendu sait faire.
//
//   node prisma/officepro-descriptions.mjs
//   node prisma/officepro-descriptions.mjs --appliquer
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const SOURCE = "officepro-descriptions.json";

// Balises admises dans un descriptif de fiche. Le reste passera peut-être,
// mais n'a pas été prévu : autant le savoir avant d'écrire.
const BALISES = new Set(["p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "h3", "h4", "span"]);
const DANGER = /<\s*(script|iframe|object|embed|style|link|meta)\b|\son[a-z]+\s*=|javascript:/i;

const uid = () => Math.random().toString(36).slice(2, 9);

function controlerHtml(html, ou) {
  const alertes = [];
  if (!html || !html.trim()) { alertes.push(`${ou} : vide`); return alertes; }
  if (DANGER.test(html)) alertes.push(`${ou} : contient du script ou un gestionnaire d'événement`);

  const utilisees = [...html.matchAll(/<\s*\/?\s*([a-z0-9]+)/gi)].map((m) => m[1].toLowerCase());
  const inconnues = [...new Set(utilisees)].filter((b) => !BALISES.has(b));
  if (inconnues.length) alertes.push(`${ou} : balises non prévues — ${inconnues.join(", ")}`);

  // Équilibre grossier des balises appariées, pour attraper un <ul> non fermé.
  for (const b of ["p", "ul", "ol", "li", "strong", "em"]) {
    const ouvrants = (html.match(new RegExp(`<${b}(\\s|>)`, "gi")) || []).length;
    const fermants = (html.match(new RegExp(`</${b}>`, "gi")) || []).length;
    if (ouvrants !== fermants) alertes.push(`${ou} : <${b}> ouvert ${ouvrants} fois, fermé ${fermants}`);
  }
  return alertes;
}

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION — rien n'est écrit ═══\n");

  let brut;
  try { brut = JSON.parse(await readFile(SOURCE, "utf8")); }
  catch (e) { console.log(`${SOURCE} illisible : ${e.message}`); return; }
  if (!Array.isArray(brut)) { console.log("Le fichier doit contenir un tableau."); return; }

  const ids = brut.map((x) => x.id).filter(Boolean);
  const doublons = ids.filter((i, n) => ids.indexOf(i) !== n);
  console.log(`${brut.length} entrées · ${new Set(ids).size} identifiants distincts${doublons.length ? ` · ⚠ ${doublons.length} doublons` : ""}`);

  const vitrines = await prisma.produitVitrine.findMany({
    where: { id: { in: ids } },
    select: { id: true, nom: true, descriptif: true, sectionsDevis: true, gamme: { select: { nom: true, marque: { select: { slug: true } } } } },
  });
  const parId = new Map(vitrines.map((v) => [v.id, v]));

  const aEcrire = [];
  const problemes = [];
  const alertes = [];

  for (const e of brut) {
    const v = parId.get(e.id);
    if (!v) { problemes.push(`${e.nom || e.id} : identifiant introuvable en base`); continue; }
    if (v.gamme.marque.slug !== "officepro") { problemes.push(`${v.nom} : n'est pas une fiche OfficePro (${v.gamme.marque.slug})`); continue; }
    // Le nom ne sert qu'à vérifier qu'on parle bien de la même fiche.
    if (e.nom && e.nom !== v.nom) alertes.push(`${e.id} : nom du fichier « ${e.nom} » ≠ base « ${v.nom} »`);

    alertes.push(...controlerHtml(e.descriptif, `${v.nom} · descriptif`));

    const sections = Array.isArray(e.sectionsDevis) ? e.sectionsDevis : [];
    const propres = sections.map((s, i) => {
      if (!s.titre?.trim()) alertes.push(`${v.nom} · section ${i + 1} : sans titre`);
      alertes.push(...controlerHtml(s.contenu, `${v.nom} · section « ${s.titre || i + 1} »`));
      // L'éditeur admin identifie chaque section par son id.
      return { id: s.id || uid(), titre: (s.titre || "").trim(), contenu: s.contenu || "" };
    });

    const ecrase = !!v.descriptif || (Array.isArray(v.sectionsDevis) && v.sectionsDevis.length);
    aEcrire.push({ v, descriptif: e.descriptif, sections: propres, ecrase });
  }

  const ignorees = vitrines.filter((v) => !brut.some((e) => e.id === v.id));
  const sansDescription = await prisma.produitVitrine.count({
    where: { gamme: { marque: { slug: "officepro" } }, id: { notIn: ids } },
  });

  console.log(`\n${aEcrire.length} fiches à remplir · ${problemes.length} écartées`);
  console.log(`${aEcrire.filter((x) => x.ecrase).length} écraseraient un contenu existant`);
  console.log(`${sansDescription} fiches OfficePro ne sont pas dans le fichier et resteront sans description`);

  const nbSections = aEcrire.reduce((s, x) => s + x.sections.length, 0);
  const sansSection = aEcrire.filter((x) => !x.sections.length);
  console.log(`\n${nbSections} sections au total · ${sansSection.length} fiches sans aucune section`);
  if (sansSection.length) console.log(`   ${sansSection.map((x) => x.v.nom).slice(0, 8).join(" · ")}`);

  const longueurs = aEcrire.map((x) => (x.descriptif || "").length).sort((a, b) => a - b);
  if (longueurs.length) {
    console.log(`descriptifs : ${longueurs[0]} à ${longueurs.at(-1)} caractères · médiane ${longueurs[Math.floor(longueurs.length / 2)]}`);
  }

  if (problemes.length) {
    console.log(`\n${problemes.length} entrées écartées :`);
    problemes.slice(0, 12).forEach((p) => console.log(`   ✗ ${p}`));
  }
  if (alertes.length) {
    console.log(`\n${alertes.length} alertes sur le contenu :`);
    alertes.slice(0, 15).forEach((a) => console.log(`   ⚠ ${a}`));
    if (alertes.length > 15) console.log(`   … ${alertes.length - 15} autres`);
  } else {
    console.log("\nAucune alerte sur le HTML : balises attendues, aucune non fermée, aucun script.");
  }

  console.log("\nexemple :");
  const ex = aEcrire[0];
  console.log(`   ${ex.v.nom}`);
  console.log(`      descriptif  ${(ex.descriptif || "").slice(0, 96)}…`);
  ex.sections.forEach((s) => console.log(`      section     « ${s.titre} » (${s.contenu.length} car., id ${s.id})`));

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer.");
    return;
  }
  if (problemes.length) { console.log("\nDes entrées sont écartées : corrige le fichier avant d'appliquer."); return; }

  await mkdir("prisma/sauvegardes", { recursive: true });
  const sauv = `prisma/sauvegardes/officepro-descriptions-avant-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(sauv, JSON.stringify(aEcrire.map((x) => ({ id: x.v.id, nom: x.v.nom, descriptif: x.v.descriptif, sectionsDevis: x.v.sectionsDevis })), null, 2), "utf8");
  console.log(`\nSauvegarde de l'existant : ${sauv}`);

  let n = 0;
  for (const x of aEcrire) {
    await prisma.produitVitrine.update({
      where: { id: x.v.id },
      data: { descriptif: x.descriptif, sectionsDevis: x.sections },
    });
    n++;
  }
  console.log(`${n} fiches mises à jour.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
