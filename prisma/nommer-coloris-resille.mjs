// Pose la question du coloris de dossier, et rend aux références leur forme.
//
//   node prisma/nommer-coloris-resille.mjs
//   node prisma/nommer-coloris-resille.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Quatre cent vingt-neuf combinaisons publiées portent une référence qui
//   n'est pas une référence :
//
//     RR76/10 +          Tertio
//     IR66/0*            Alaia by Sokoa
//     NR86/B+coloris*    Eman
//     WR67/1N+coloris*   Wi-Max
//
//   Le tarif imprime ce marqueur à côté de la référence, dans une colonne
//   séparée, pour dire « et précisez le coloris de résille ». L'import l'a
//   recopié DANS la référence. Telle quelle, elle partirait chez le
//   fournisseur avec un « + » ou un astérisque au bout.
//
//   Et la question qu'il annonce n'est posée nulle part : le client choisit un
//   mécanisme, une catégorie de tissu, puis commande un dossier dont personne
//   ne lui a demandé la couleur.
//
// CE QUE LE NUANCIER DIT, PAGE 206
//   Là où un code existe, le nuancier l'imprime :
//
//     EMAN - ADIO    Beige R4E · Terre R4T · Gris foncé R4G · Gris clair R4Q
//                    Noir R4N · Vert R4V · Bleu R4W
//
//   Là où il n'y en a pas, il ne donne que des noms :
//
//     ADELA - FLIPPER - KYOS - SMASH - TERTIO    Blanc pur · Gris · Noir
//     WI-MAX - KYOS                              Gris clair · Gris foncé · Noir
//     ALAIA                                      Noir, et le Spazio en six teintes
//
//   Et les deux tarifs concluent pareil : « Coloris de résille à préciser à la
//   commande. » Le coloris se nomme sur le bon de commande ; il ne s'ajoute
//   pas à la référence.
//
// CE QUE CE SCRIPT N'OSE PAS
//   Chez Alaia, la page 53 numérote les six coloris Spazio — « Orange (1),
//   Jaune (2), Blanc (3), Rose (4), Taupe (5) ou Vert Canard (6) » — et
//   l'astérisque de IR66/0* se tient à la place exacte où ce chiffre irait.
//   C'est probablement le jeton de référence. Probablement ne suffit pas pour
//   une référence qu'on envoie à un fournisseur : le chiffre est donc ENREGISTRÉ
//   sur chaque valeur, mais le choix ne participe pas à l'assemblage
//   (rangReference reste vide). Le jour où Sokoa le confirme, il n'y a qu'un
//   rang à renseigner. Même prudence pour les codes R4x d'Eman.
//
// CE QUI N'EST PAS ICI
//   Kulbu, dont les quatre marqueurs — *A coloris PP assise, *C coloris PP
//   corps, *TA tissu assise, *TC tissu corps — sont INTERNES à la référence
//   (KUA0/*A*C). Les retirer laisserait « KUA0/ ». Et il manque à ces fiches
//   l'axe culbuto/patins, qui vaut 4 €. C'est une reprise, pas un nettoyage :
//   prisma/reparer-kulbu.mjs.
//
//   Archikit, dont les références portent des espaces — ZAK 103 DAG — qui en
//   font partie. Le script ne coupe que sur « * » et « + ».
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PDF = "catalogue-2026/SOKOA_TARIF 2026_FR.pdf";
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

// ── Ce que le nuancier et les tarifs écrivent ─────────────────────────
//
// Chaque coloris porte : le nom, une pastille approchée pour l'écran, et le
// code du tarif quand le tarif en donne un. Le champ « preuve » est le texte
// que le script doit retrouver sur la page citée avant d'écrire.
const TABLES = [
  {
    gamme: "Tertio", page: 206,
    cle: "resille", nom: "Coloris de la résille",
    // Pages 49 et 50 : « disponible en trois coloris au choix : noir, gris
    // clair et blanc ». Le nuancier les nomme « Noir, Gris, Blanc pur ».
    valeurs: [
      { libelle: "Noir", couleur: "#1c1c1c" },
      { libelle: "Gris", couleur: "#8c8c8c" },
      { libelle: "Blanc pur", couleur: "#f2f2ee" },
    ],
    preuves: ["Blanc pur", "TERTIO"],
  },
  {
    gamme: "Wi-Max", page: 206,
    cle: "resille", nom: "Coloris de la résille",
    valeurs: [
      { libelle: "Noir", couleur: "#1c1c1c" },
      { libelle: "Gris foncé", couleur: "#4e5453" },
      { libelle: "Gris clair", couleur: "#9c9c99" },
    ],
    preuves: ["WI-MAX", "Gris clair", "Gris foncé"],
  },
  {
    gamme: "Alaia by Sokoa", page: 53,
    cle: "spazio", nom: "Coloris du tissu Spazio",
    // Le dossier Spazio ne concerne que les trois fiches « tissu Spazio » ;
    // les trois fiches « résille » d'Alaia n'ont qu'une résille noire, et un
    // seul coloris n'est pas un choix.
    valeurs: [
      { libelle: "Orange", couleur: "#e2701e", code: "1" },
      { libelle: "Jaune", couleur: "#e8b83a", code: "2" },
      { libelle: "Blanc", couleur: "#f2f2ee", code: "3" },
      { libelle: "Rose", couleur: "#d98f9a", code: "4" },
      { libelle: "Taupe", couleur: "#8a7d6d", code: "5" },
      { libelle: "Vert Canard", couleur: "#1f6b6b", code: "6" },
    ],
    // La preuve est le nom ET son chiffre, tels que la page 53 les imprime.
    preuves: (t) => t.valeurs.map((v) => `${v.libelle} (${v.code})`),
  },
  {
    // Eman a déjà son axe. Il lui manque les codes du nuancier, et un de ses
    // sept noms ne suit pas le nuancier : « Gris moyen » pour « Gris clair ».
    gamme: "Eman", page: 206,
    cle: "resille", nom: "Coloris de la résille",
    dejaLa: true,
    renommer: { "Gris moyen": "Gris clair" },
    codes: {
      Noir: "R4N", "Gris foncé": "R4G", "Gris clair": "R4Q", Beige: "R4E",
      Terre: "R4T", Vert: "R4V", Bleu: "R4W",
    },
    preuves: (t) => Object.entries(t.codes).map(([l, c]) => `${l} ${c}`),
  },
];

const HORS_SUJET = new Set(["Kulbu", "Archikit"]);

/** « RR76/10 + » → « RR76/10 ». Rend null si la coupe abîmerait la référence. */
function nettoyer(brut) {
  const s = String(brut || "");
  const i = s.search(/[*+]/);
  if (i === -1) return null;                        // rien à retirer
  const net = s.slice(0, i).trim();
  if (!net || /[/\-]$/.test(net)) return null;      // « KUA0/ » : on n'y touche pas
  return net;
}

/** Le texte d'une page du tarif, espaces normalisés. */
async function textePage(doc, n) {
  const t = await (await doc.getPage(n)).getTextContent();
  return t.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  // ── Le filet : chaque nom, chaque code, sur la page citée ────────────
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({
    data: new Uint8Array(readFileSync(PDF)), useSystemFonts: true,
  }).promise;

  titre("VÉRIFICATION CONTRE LE TARIF");
  let manquantes = 0;
  for (const t of TABLES) {
    const texte = await textePage(doc, t.page);
    const attendues = typeof t.preuves === "function" ? t.preuves(t) : t.preuves;
    const absentes = attendues.filter((p) => !texte.includes(p));
    console.log(`   page ${String(t.page).padEnd(4)} ${t.gamme.padEnd(16)} ${attendues.length - absentes.length}/${attendues.length} retrouvées`);
    for (const a of absentes) console.log(`      ABSENTE : « ${a} »`);
    manquantes += absentes.length;
  }
  if (manquantes) {
    titre(`${manquantes} MENTIONS INTROUVABLES — RIEN NE SERA ÉCRIT`);
    console.log("\n   Le tarif ne dit pas ce que la table prétend. Corriger la table.");
    process.exitCode = 1;
    return;
  }

  // ── Ce qu'il y a à faire, fiche par fiche ────────────────────────────
  const nettoyages = [];   // { id, avant, apres }
  const creations = [];    // { vitrine, table }
  const recodages = [];    // { choix, table }
  const refuses = [];

  const vitrines = await prisma.produitVitrine.findMany({
    where: { publie: true },
    select: {
      id: true, nom: true,
      gamme: { select: { nom: true } },
      choix: {
        select: { id: true, cle: true, nom: true, ordre: true,
          valeurs: { select: { id: true, libelle: true, suffixeReference: true } } },
      },
      combinaisons: { select: { id: true, referenceBase: true } },
    },
  });

  for (const v of vitrines) {
    const g = v.gamme?.nom || "";
    const table = TABLES.find((t) => t.gamme === g);

    // 1. La référence, pour toute fiche marquée hors Kulbu et Archikit.
    const sales = v.combinaisons
      .map((k) => ({ id: k.id, avant: k.referenceBase, apres: nettoyer(k.referenceBase) }))
      .filter((k) => k.apres && k.apres !== k.avant);
    if (sales.length && !HORS_SUJET.has(g)) nettoyages.push(...sales);

    if (!table) continue;
    const existant = v.choix.find((c) => c.cle === table.cle || /coloris/i.test(c.nom));

    // 2. Compléter un axe déjà là ne dépend pas du marqueur : les codes du
    //    nuancier valent pour toutes les fiches qui portent l'axe, et laisser
    //    « Gris moyen » sur quatre fiches Eman et « Gris clair » sur cinq
    //    serait pire que de n'en corriger aucune.
    if (table.dejaLa) {
      if (existant) recodages.push({ vitrine: v, choix: existant, table });
      continue;
    }

    // 3. En revanche, ne CRÉER l'axe que là où le tarif l'annonce. Une
    //    référence sans marqueur est une fiche que le tarif ne décline pas :
    //    la résille noire d'Alaia n'existe qu'en noir, et un seul coloris
    //    n'est pas un choix.
    const marquee = v.combinaisons.some((k) => /[*+]/.test(String(k.referenceBase || "")));
    if (!marquee) continue;
    if (existant?.cle === table.cle) continue;   // déjà posé par une exécution précédente
    if (existant) {
      refuses.push(`${v.nom} — porte déjà « ${existant.nom} », on n'en ajoute pas un second`);
    } else {
      creations.push({ vitrine: v, table });
    }
  }

  // ── Ce qui reste marqué après coup, pour mémoire ─────────────────────
  const restants = new Map();
  for (const v of vitrines) {
    for (const k of v.combinaisons) {
      if (!/[*+]/.test(String(k.referenceBase || ""))) continue;
      if (nettoyages.some((n) => n.id === k.id)) continue;
      const g = v.gamme?.nom || "—";
      if (!restants.has(g)) restants.set(g, new Set());
      restants.get(g).add(String(k.referenceBase));
    }
  }

  titre(`${nettoyages.length} RÉFÉRENCES REMISES EN FORME`);
  const exemples = new Map();
  for (const n of nettoyages) if (!exemples.has(n.avant)) exemples.set(n.avant, n.apres);
  console.log("");
  for (const [avant, apres] of [...exemples].slice(0, 14)) {
    console.log(`   ${avant.padEnd(22)} → ${apres}`);
  }
  if (exemples.size > 14) console.log(`   … et ${exemples.size - 14} autres formes`);

  titre(`${creations.length} FICHES REÇOIVENT LA QUESTION DU COLORIS`);
  const parGamme = new Map();
  for (const c of creations) {
    const g = c.table.gamme;
    if (!parGamme.has(g)) parGamme.set(g, []);
    parGamme.get(g).push(c);
  }
  for (const [g, liste] of parGamme) {
    const t = liste[0].table;
    console.log(`\n   ── ${g} → « ${t.nom} » : ${t.valeurs.map((v) => v.libelle).join(" · ")}`);
    for (const c of liste) console.log(`      ${c.vitrine.nom.replace(/ - [^-]*$/, "").slice(0, 62)}`);
  }

  if (recodages.length) {
    titre(`${recodages.length} AXES EXISTANTS COMPLÉTÉS`);
    const t = recodages[0].table;
    console.log(`\n   ── ${t.gamme} → codes du nuancier reportés sur « ${t.nom} »`);
    console.log(`      ${Object.entries(t.codes).map(([l, c]) => `${l} ${c}`).join(" · ")}`);
    for (const [avant, apres] of Object.entries(t.renommer || {})) {
      console.log(`      nom aligné sur le nuancier : « ${avant} » → « ${apres} »`);
    }
    console.log(`      ${recodages.length} fiches`);
  }

  if (refuses.length) {
    titre("FICHES LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  if (restants.size) {
    titre("RÉFÉRENCES ENCORE MARQUÉES — HORS SUJET ICI");
    console.log("");
    for (const [g, refs] of restants) {
      console.log(`   ${g.padEnd(12)} ${[...refs].slice(0, 4).join(" | ")}`);
    }
  }

  titre("LE COMPTE");
  console.log(`   ${nettoyages.length} références remises en forme`);
  console.log(`   ${creations.length} axes coloris créés · ${creations.reduce((n, c) => n + c.table.valeurs.length, 0)} valeurs`);
  console.log(`   ${recodages.length} axes existants complétés`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  // Les axes passent AVANT les références, et non l'inverse : c'est le marqueur
  // qui dit où l'axe manque. Le retirer d'abord, puis mourir en chemin, ferait
  // perdre la trace de ce qu'il restait à poser.
  for (const c of creations) {
    const rang = Math.max(0, ...c.vitrine.choix.map((x) => x.ordre)) + 1;
    await prisma.choix.create({
      data: {
        vitrineId: c.vitrine.id, cle: c.table.cle, nom: c.table.nom,
        nature: "finition", rendu: "pastilles", ordre: rang, origine: "tarif",
        // rangReference reste vide : le coloris se nomme sur la commande, il
        // ne s'ajoute pas à la référence. Voir l'en-tête.
        valeurs: {
          create: c.table.valeurs.map((v, i) => ({
            libelle: v.libelle, couleur: v.couleur, ordre: i,
            suffixeReference: v.code ?? "",
          })),
        },
      },
    });
  }
  console.log(`   ${creations.length} axes coloris créés.`);

  for (const n of nettoyages) {
    await prisma.combinaison.update({ where: { id: n.id }, data: { referenceBase: n.apres } });
  }
  console.log(`   ${nettoyages.length} références remises en forme.`);

  for (const r of recodages) {
    for (const v of r.choix.valeurs) {
      const libelle = r.table.renommer?.[v.libelle] || v.libelle;
      const code = r.table.codes[libelle];
      if (libelle === v.libelle && code == null) continue;
      await prisma.valeurChoix.update({
        where: { id: v.id },
        data: { libelle, ...(code != null ? { suffixeReference: code } : {}) },
      });
    }
  }
  console.log(`   ${recodages.length} axes existants complétés.`);

  titre("CONTRÔLE");
  const apres = await prisma.combinaison.findMany({
    where: { vitrine: { publie: true } },
    select: { referenceBase: true, vitrine: { select: { gamme: { select: { nom: true } } } } },
  });
  const encore = new Map();
  for (const k of apres) {
    if (!/[*+]/.test(String(k.referenceBase || ""))) continue;
    const g = k.vitrine.gamme?.nom || "—";
    encore.set(g, (encore.get(g) || 0) + 1);
  }
  console.log(`   références encore marquées : ${[...encore.values()].reduce((a, b) => a + b, 0)}`);
  for (const [g, n] of encore) console.log(`      ${g.padEnd(12)} ${n}`);

  for (const t of TABLES) {
    const n = await prisma.choix.count({
      where: { cle: t.cle, vitrine: { publie: true, gamme: { nom: t.gamme } } },
    });
    console.log(`   ${t.gamme.padEnd(16)} fiches portant « ${t.nom} » : ${n}`);
  }
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
