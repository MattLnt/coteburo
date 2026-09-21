// Donne une icône aux catégories et aux rayons qui n'en ont pas.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/attribuer-icones.mjs
//   node prisma/attribuer-icones.mjs --appliquer
//   node prisma/attribuer-icones.mjs --toutes --appliquer   (réécrit aussi
//                                       celles qui en portent déjà une)
//
// L'ÉTAT DE DÉPART
//   Aucune des six catégories n'avait d'icône, et les trente et un rayons
//   n'avaient même pas le champ. Le sélecteur existait pourtant depuis le
//   début : personne n'avait jamais cliqué dedans, faute de le voir.
//
// COMMENT L'ICÔNE EST CHOISIE
//   Par le nom, avec une table de mots-clés lue dans l'ordre : le plus
//   précis d'abord. « Coussins et accessoires d'assise » rencontre
//   « coussin » avant « assise », et « Accessoires de rangement » rencontre
//   « accessoire » avant « rangement ».
//
//   Cet ordre est l'essentiel du fichier. Une table non ordonnée donnerait
//   l'icône d'un fauteuil à un coussin.
//
//   Un rayon que rien ne désigne reste sans icône plutôt que d'en recevoir
//   une au hasard : sur le site, il retombe sur celle de sa catégorie.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const TOUTES = process.argv.includes("--toutes");

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Lues dans l'ordre. Le premier mot rencontré l'emporte.
const REGLES = [
  [/cabine|acoustiqu|phonique/, "acoustique"],
  [/cloison|separateur|paravent|voile de fond/, "cloison"],
  [/comptoir|reception/, "accueil"],
  [/convivialite|canape|lounge|detente/, "canape"],
  [/banquette|poutre|\bbanc/, "banc"],
  [/tabouret|pouf/, "pouf"],
  [/vestiaire|casier|caisson/, "casier"],
  [/bibliotheque|etagere|archivage/, "etagere"],
  [/eclairage|lampe|luminaire/, "luminaire"],
  [/coussin/, "coussin"],
  [/plante|vegetal|jardiniere/, "plante"],
  [/tapis|moquette/, "tapis"],
  [/miroir/, "miroir"],
  [/porte manteau|portemanteau|penderie/, "portemanteau"],
  [/tableau|affichage|paperboard/, "tableau"],
  [/horloge|pendule/, "horloge"],
  [/parasol|voile d ombrage/, "parasol"],
  [/bras ecran|ecran|moniteur/, "ecran"],
  [/exterieur|terrasse|outdoor/, "exterieur"],
  [/siege|chaise|fauteuil|assise/, "sieges"],
  // Pas « bench » ici : un bureau bench est un bureau, et cette règle
  // passant avant celle des bureaux, il recevait l'icône d'une table.
  [/table|mange debout/, "tables"],
  [/bureau/, "bureaux"],
  // « Accessoires de rangement » est un accessoire ; « Rangements » n'est pas
  // un accessoire. D'où cet ordre, et non l'inverse.
  [/accessoire|complement|electrification|cable/, "accessoire"],
  [/armoire|rangement|stockage/, "rangements"],
];

// Les clés du jeu d icônes, lues dans le fichier sans l exécuter : il
// contient du JSX, que node ne sait pas charger. Les relire ici plutôt que de
// recopier la liste évite qu elles divergent.
const CONNUES = new Set(
  [...readFileSync(new URL("../lib/iconesCategories.js", import.meta.url), "utf8")
    .matchAll(/\[\s*"([a-z-]+)"\s*,\s*"/g)].map((m) => m[1]),
);

function iconeDe(nom) {
  const k = nu(nom);
  for (const [motif, icone] of REGLES) if (motif.test(k)) return icone;
  return null;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  // Garde : une icône proposée qui n'existe pas dans le jeu s'afficherait en
  // blanc, et l'erreur ne se verrait qu'à l'écran.
  const inconnues = [...new Set(REGLES.map(([, i]) => i))].filter((i) => !CONNUES.has(i));
  if (inconnues.length) {
    console.error(`Icônes absentes du jeu : ${inconnues.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const categories = await prisma.categorie.findMany({
    orderBy: { ordre: "asc" },
    select: {
      id: true, nom: true, icone: true,
      sousCategories: { orderBy: { ordre: "asc" }, select: { id: true, nom: true, icone: true } },
    },
  });

  const plan = [];
  const muets = [];

  for (const c of categories) {
    if (TOUTES || !c.icone) {
      const icone = iconeDe(c.nom);
      if (icone && icone !== c.icone) plan.push({ type: "categorie", id: c.id, nom: c.nom, de: c.icone, icone });
      else if (!icone && !c.icone) muets.push(c.nom);
    }
    for (const s of c.sousCategories) {
      if (!TOUTES && s.icone) continue;
      const icone = iconeDe(s.nom);
      if (icone && icone !== s.icone) plan.push({ type: "rayon", id: s.id, nom: s.nom, parent: c.nom, de: s.icone, icone });
      else if (!icone && !s.icone) muets.push(`${c.nom} › ${s.nom}`);
    }
  }

  titre("CE QUI SERAIT ATTRIBUÉ");
  console.log("");
  let parent = null;
  for (const p of plan) {
    if (p.type === "categorie") {
      console.log(`   ${p.icone.padEnd(14)} ${p.nom}${p.de ? `   (remplace ${p.de})` : ""}`);
      parent = p.nom;
    } else {
      if (p.parent !== parent) { console.log(`   ${"".padEnd(14)} ${p.parent}`); parent = p.parent; }
      console.log(`   ${p.icone.padEnd(14)}    └ ${p.nom}${p.de ? `   (remplace ${p.de})` : ""}`);
    }
  }
  console.log(`\n   ${plan.filter((p) => p.type === "categorie").length} catégorie(s) · ${plan.filter((p) => p.type === "rayon").length} rayon(s)`);

  if (muets.length) {
    titre("LAISSÉS SANS ICÔNE");
    console.log("\n   Aucun mot-clé ne les désigne ; sur le site ils retombent");
    console.log("   sur l'icône de leur catégorie.\n");
    for (const m of muets) console.log(`   ${m}`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  await prisma.$transaction([
    ...plan.filter((p) => p.type === "categorie")
      .map((p) => prisma.categorie.update({ where: { id: p.id }, data: { icone: p.icone } })),
    ...plan.filter((p) => p.type === "rayon")
      .map((p) => prisma.sousCategorie.update({ where: { id: p.id }, data: { icone: p.icone } })),
  ]);
  console.log(`   ${plan.length} icône(s) écrite(s)`);

  titre("CONTRÔLE");
  const [cats, rayons] = await Promise.all([
    prisma.categorie.count({ where: { icone: null } }),
    prisma.sousCategorie.count({ where: { icone: null } }),
  ]);
  console.log(`   catégories sans icône ${cats} · rayons sans icône ${rayons}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
