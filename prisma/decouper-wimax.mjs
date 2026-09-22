// Ouvre les blocs « Modèle » de Wi-Max, et rend ses titres lisibles.
//
//   node prisma/decouper-wimax.mjs
//   node prisma/decouper-wimax.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Une fiche Wi-Max Ergo pose une question « Modèle » à trois réponses, et
//   les trois sont le même texte :
//
//     AIR/M Fauteuil haut dossier résille + têtière, synchro Flex + TA, RL,
//     base alu poli, RSD ø65 ajour. (WI37F58)   729,60 €
//     … (WI37F5P)   627,20 €
//     … (WI37F50)   498,40 €
//
//   Deux cent trente euros séparent la première de la dernière, et rien à
//   l'écran ne dit pourquoi. Le tarif, lui, le dit, page 57, en toutes lettres
//   à côté de chaque référence :
//
//     WI37F58   Acc. rég. réglables 4D, manchette cuir éventail
//     WI37F5P   Acc. rég. 4D, manchette PU
//     WI37F50   Sans accotoirs
//
//   C'est un axe accotoirs. L'import l'a rangé dans « Modèle » avec le titre
//   de la fiche recopié devant.
//
// CE QUE LA RÉFÉRENCE ÉCRIT, CHEZ LE WI-MAX ORDINAIRE
//   Deux axes, pas un, et les cinq pages du tarif les nomment pareil :
//
//     WM67/1N    3ᵉ caractère   6 = Synchro automatique   0 = Synchro Plus
//     WM07/15    suffixe, 2ᵉ    N L = réglables 4D
//                               5 6 = réglables 3D
//                                 8 = fixes tapissés
//                                 0 = sans accotoirs
//
//   Le premier caractère du suffixe est la teinte de la base — 1 noir, 7 blanc
//   — et elle est déjà dans le titre de la fiche.
//
// UNE COQUILLE DU TARIF, QU'ON NE SUIT PAS
//   Page 34, la ligne WX07/1N est étiquetée « Synchro automatique ». Les cinq
//   autres pages donnent uniformément Synchro Plus au 0, et l'écart de prix le
//   confirme : WX67→WX07 vaut +13 € sur toutes les lignes, comme WX67/15→
//   WX07/15, étiquetée Synchro Plus. C'est une répétition de la ligne du
//   dessus. Le script suit la règle et le prix, pas la coquille, et le dit.
//
// LES TITRES
//   Les cinq fiches Wi-Max Ergo portent toutes « synchro Flex + TA, RL » :
//   une clause qui ne distingue rien, puisqu'elles l'ont toutes, et qui figure
//   déjà dans la section « Mécanisme » de la fiche. Les préfixes AIR/M, ELO et
//   JOF sont les codes modèles du fournisseur ; la référence commandée les
//   porte, le client n'en a pas l'usage. Reste ce qui distingue vraiment :
//   le dossier, la têtière, la résille.
//
//     AIR/M Fauteuil haut dossier résille + têtière, synchro Flex + TA, RL
//        →  Fauteuil haut dossier résille + têtière
//
//   « résille » est ajouté à la fiche WI36F, dont l'en-tête du tarif l'omet
//   mais dont la page 57 dit « haut dossier résille sans têtière (AIR/M
//   WI36F) ». Sans lui, elle serait indiscernable de la fiche ELO.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PDF = "catalogue-2026/SOKOA_TARIF 2026_FR.pdf";
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const MECANISME = { 6: "Synchro automatique", 0: "Synchro Plus" };
const ORDRE_MECANISME = ["Synchro automatique", "Synchro Plus"];

const ACCOTOIRS = {
  N: "Réglables 4D", L: "Réglables 4D",
  5: "Réglables 3D", 6: "Réglables 3D",
  8: "Fixes tapissés",
  0: "Sans accotoirs",
};
const ORDRE_ACCOTOIRS = ["Réglables 4D", "Réglables 3D", "Fixes tapissés", "Sans accotoirs"];

const ACCOTOIRS_ERGO = {
  8: "Réglables 4D, manchette cuir", P: "Réglables 4D, manchette PU", 0: "Sans accotoirs",
};
const ORDRE_ERGO = ["Réglables 4D, manchette cuir", "Réglables 4D, manchette PU", "Sans accotoirs"];


// ── Les libellés de catégorie de tissu qui n'en sont pas ──────────────
//
// « XF3/B » est l'en-tête de la première colonne de prix, pas un tissu. La
// page 57 l'explique : « Finition X-Trevira noir avec traitement antitaches
// (XF3) ou finitions standard autorisées ». Et la note de bas de page donne
// à la colonne C sa restriction.
// Elle ne vaut QUE pour les cinq fiches Ergo, dont le tarif n'a que quatre
// colonnes de prix. Le Wi-Max ordinaire en a six — B, B+, C, D, E, H — et y
// appliquer ces rangs mettrait « Tissu D » sur le même que « Tissu E ».
const LIBELLES_ERGO = {
  "XF3/B": { nom: "Tissu B ou X-Trevira XF3", rang: 0 },
  "Tissu C": { nom: "Tissu C — Boucle FR, Runner et Spazio exclus", rang: 3 },
  "Tissu B+": { rang: 1 },
  "Tissu D": { rang: 4 },
};

const FAMILLES = [
  {
    gamme: "Wi-Max", pages: [34, 44, 45, 46, 47],
    // WM67/1N · WW67/7N · WR06/15 · WL66/70
    motif: /^W([MHXWRL])([60])(\d)\/(\d)([NL56880])$/,
    axes: (m) => [
      { cle: "mecanisme", nom: "Mécanisme", valeur: MECANISME[m[2]], ordre: ORDRE_MECANISME },
      { cle: "accotoirs", nom: "Accotoirs", valeur: ACCOTOIRS[m[5]], ordre: ORDRE_ACCOTOIRS },
    ],
    // Ce que le tarif doit écrire à côté de chaque valeur, pour la valider.
    preuves: ["Synchro automatique", "Synchro Plus", "acc. réglables 4D",
      "acc. réglables 3D", "acc. fixes tapissés", "sans accotoirs"],
  },
  {
    gamme: "Wi-Max Ergo", pages: [56, 57],
    // WI37F58 · WE34F5P · WI36F50
    motif: /^W([IE])(\d)(\d)F(\d)([8P0])$/,
    axes: (m) => [
      { cle: "accotoirs", nom: "Accotoirs", valeur: ACCOTOIRS_ERGO[m[5]], ordre: ORDRE_ERGO },
    ],
    preuves: ["manchette cuir éventail", "manchette PU", "Sans accotoirs"],
    libelles: LIBELLES_ERGO,
    // Les deux fiches AIR sont en résille : le tarif leur donne trois coloris.
    resille: /^WI/,
  },
];
// ── Les titres, tels que le tarif les justifie ────────────────────────
const TITRES = {
  "AIR/M Fauteuil haut dossier résille + têtière, synchro Flex + TA, RL - Wi-Max Ergo":
    "Fauteuil haut dossier résille + têtière - Wi-Max Ergo",
  "AIR/M Fauteuil haut dossier, synchro Flex + TA, RL - Wi-Max Ergo":
    "Fauteuil haut dossier résille - Wi-Max Ergo",
  "ELO / Fauteuil haut dossier + têtière, synchro Flex + TA, RL - Wi-Max Ergo":
    "Fauteuil haut dossier + têtière - Wi-Max Ergo",
  "ELO / Fauteuil haut dossier, synchro Flex + TA, RL - Wi-Max Ergo":
    "Fauteuil haut dossier - Wi-Max Ergo",
  "JOF / Fauteuil moyen dossier + têtière, synchro Flex + TA, RL - Wi-Max Ergo":
    "Fauteuil moyen dossier + têtière - Wi-Max Ergo",
};

const RESILLE = [
  { libelle: "Noir", couleur: "#1c1c1c" },
  { libelle: "Gris foncé", couleur: "#4e5453" },
  { libelle: "Gris clair", couleur: "#9c9c99" },
];

const nettoyerRef = (b) => String(b || "").trim().toUpperCase().split(/[\s*+]/)[0];

async function textePage(doc, n) {
  const t = await (await doc.getPage(n)).getTextContent();
  return t.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  // ── Le filet : chaque nom d'axe, sur les pages de sa famille ─────────
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({
    data: new Uint8Array(readFileSync(PDF)), useSystemFonts: true,
  }).promise;

  titre("VÉRIFICATION CONTRE LE TARIF");
  let manquantes = 0;
  for (const f of FAMILLES) {
    const textes = [];
    for (const p of f.pages) textes.push(await textePage(doc, p));
    const ensemble = textes.join(" ").toLowerCase();
    const absentes = f.preuves.filter((p) => !ensemble.includes(p.toLowerCase()));
    console.log(`   pages ${f.pages.join(", ").padEnd(18)} ${f.gamme.padEnd(12)} ${f.preuves.length - absentes.length}/${f.preuves.length} mentions retrouvées`);
    for (const a of absentes) console.log(`      ABSENTE : « ${a} »`);
    manquantes += absentes.length;
  }
  const p57 = (await textePage(doc, 57)).toLowerCase();
  for (const c of RESILLE) {
    if (p57.includes(c.libelle.toLowerCase())) continue;
    console.log(`      coloris résille ABSENT de la page 57 : « ${c.libelle} »`);
    manquantes++;
  }
  if (manquantes) {
    titre(`${manquantes} MENTIONS INTROUVABLES — RIEN NE SERA ÉCRIT`);
    process.exitCode = 1;
    return;
  }

  // ── Le plan ──────────────────────────────────────────────────────────
  const plans = [];
  const refuses = [];
  const titresPris = new Map();
  for (const v of await prisma.produitVitrine.findMany({
    where: { publie: true }, select: { id: true, nom: true },
  })) titresPris.set(v.nom, v.id);

  for (const f of FAMILLES) {
    const vitrines = await prisma.produitVitrine.findMany({
      where: { publie: true, gamme: { nom: f.gamme } },
      orderBy: { nom: "asc" },
      select: {
        id: true, nom: true,
        choix: { orderBy: { ordre: "asc" }, select: { id: true, cle: true, nom: true, ordre: true,
          valeurs: { orderBy: { ordre: "asc" }, select: { id: true, libelle: true, ordre: true } } } },
        combinaisons: { select: { id: true, valeurs: true, referenceBase: true } },
      },
    });

    for (const v of vitrines) {
      const modele = v.choix.find((c) => /mod[èe]le|r[ée]f[ée]rence/i.test(c.nom));
      if (!modele) { refuses.push(`${v.nom} — pas de question « Modèle »`); continue; }

      // Les libellés de catégorie de tissu, relevés AVANT les combinaisons :
      // quand on en renomme un, les combinaisons doivent suivre. Le raccord
      // entre une valeur tarifaire et sa combinaison se fait par la chaîne de
      // caractères, et par elle seule ; renommer d'un côté seulement laisse
      // une réponse proposée à laquelle rien ne répond, donc invisible — et
      // rien ne casse pour le dire. C'est ce qui est arrivé aux cinq fiches
      // Ergo, réparées par prisma/reparer-libelles-combinaisons.mjs.
      const table = f.libelles || null;
      const axeTissu = table ? v.choix.find((c) => c.valeurs.some((x) => table[x.libelle])) : null;
      const renomme = new Map();
      if (axeTissu) {
        for (const x of axeTissu.valeurs) {
          const t = table[x.libelle];
          if (t?.nom && t.nom !== x.libelle) renomme.set(x.libelle, t.nom);
        }
      }

      const combos = [];
      let ennui = null;
      for (const k of v.combinaisons) {
        const m = f.motif.exec(nettoyerRef(k.referenceBase));
        if (!m) { ennui = `référence « ${k.referenceBase} » illisible`; break; }
        const axes = f.axes(m).filter((a) => a.valeur);
        if (axes.length !== f.axes(m).length) { ennui = `référence « ${k.referenceBase} » : un code sans nom`; break; }
        const { [modele.cle]: _, ...reste } = k.valeurs || {};
        const valeurs = { ...reste };
        if (axeTissu && renomme.has(valeurs[axeTissu.cle])) {
          valeurs[axeTissu.cle] = renomme.get(valeurs[axeTissu.cle]);
        }
        for (const a of axes) valeurs[a.cle] = a.valeur;
        combos.push({ id: k.id, valeurs, empreinte: empreinteDe(valeurs), axes });
      }
      if (ennui) { refuses.push(`${v.nom} — ${ennui}`); continue; }

      if (new Set(combos.map((c) => c.empreinte)).size !== combos.length) {
        refuses.push(`${v.nom} — deux variantes aboutiraient aux mêmes réponses`);
        continue;
      }

      // Un axe à valeur unique n'est jamais posé par le modèle : on ne le crée
      // pas. Ce qu'il dirait est dans le titre de la fiche.
      const aCreer = [];
      const plats = [];
      for (const a of f.axes(f.motif.exec(nettoyerRef(v.combinaisons[0].referenceBase)))) {
        const mots = [...new Set(combos.map((c) => c.valeurs[a.cle]))];
        const ordonnes = a.ordre.filter((m) => mots.includes(m));
        if (ordonnes.length !== mots.length) {
          refuses.push(`${v.nom} — valeur hors de l'ordre prévu pour « ${a.nom} »`);
          aCreer.length = 0; break;
        }
        (mots.length >= 2 ? aCreer : plats).push({ ...a, mots: ordonnes });
      }
      if (!aCreer.length) continue;

      const libelles = axeTissu
        ? axeTissu.valeurs
            .map((x) => ({ id: x.id, avant: x.libelle, ordre: x.ordre, ...(table[x.libelle] || {}) }))
            .filter((x) => x.rang != null && (x.nom != null || x.rang !== x.ordre))
        : [];

      // Le titre.
      const nouveau = TITRES[v.nom];
      let renommage = null;
      if (nouveau) {
        const occupe = titresPris.get(nouveau);
        if (occupe && occupe !== v.id) refuses.push(`${v.nom} — le titre visé est déjà pris`);
        else { renommage = { nom: nouveau, slug: slug(nouveau) }; titresPris.set(nouveau, v.id); }
      }

      const resille = f.resille && f.resille.test(nettoyerRef(v.combinaisons[0].referenceBase))
        && !v.choix.some((c) => c.cle === "resille");

      plans.push({ famille: f, v, modele, combos, aCreer, plats, axeTissu, libelles, renommage, resille });
    }
  }

  titre(`${plans.length} FICHES OUVERTES`);
  for (const p of plans) {
    console.log(`\n   ── ${p.v.nom.replace(/ - [^-]+$/, "").slice(0, 58)}`);
    for (const a of p.aCreer) console.log(`      « ${a.nom} » : ${a.mots.join(" · ")}`);
    for (const a of p.plats) console.log(`      « ${a.nom} » non posée — une seule valeur : ${a.mots[0]}`);
    if (p.libelles.length) {
      for (const l of p.libelles) {
        if (l.nom) console.log(`      libellé : « ${l.avant} » → « ${l.nom} »`);
      }
      console.log(`      ordre des catégories rétabli`);
    }
    if (p.resille) console.log(`      coloris de la résille posé : ${RESILLE.map((c) => c.libelle).join(" · ")}`);
    if (p.renommage) console.log(`      titre : ${p.renommage.nom}   (${p.v.nom.length} → ${p.renommage.nom.length} car.)`);
  }

  if (refuses.length) {
    titre("FICHES LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  titre("LE COMPTE");
  console.log(`   ${plans.length} fiches · ${plans.reduce((n, p) => n + p.combos.length, 0)} variantes réécrites`);
  console.log(`   ${plans.reduce((n, p) => n + p.aCreer.length, 0)} axes créés`);
  console.log(`   ${plans.filter((p) => p.renommage).length} titres · ${plans.filter((p) => p.resille).length} coloris résille`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const p of plans) {
    for (const c of p.combos) {
      await prisma.combinaison.update({
        where: { id: c.id }, data: { valeurs: c.valeurs, empreinte: c.empreinte },
      });
    }
    await prisma.choix.delete({ where: { id: p.modele.id } });

    // Les nouveaux axes prennent la tête, et les survivants reculent d'autant.
    // Deux questions au même rang s'afficheraient dans un ordre laissé à la
    // base — c'est arrivé à trente et une fiches. Et la tête est leur place :
    // le mécanisme et les accotoirs disent ce que le siège EST, la catégorie
    // de tissu ce qu'il COÛTE, et le tarif lui-même les range ainsi, les
    // premiers en lignes et la seconde en colonnes.
    const survivants = p.v.choix
      .filter((c) => c.id !== p.modele.id)
      .sort((a, b) => a.ordre - b.ordre);
    for (let i = 0; i < survivants.length; i++) {
      await prisma.choix.update({
        where: { id: survivants[i].id }, data: { ordre: p.aCreer.length + i },
      });
    }

    let rang = 0;
    for (const a of p.aCreer) {
      await prisma.choix.create({
        data: {
          vitrineId: p.v.id, cle: a.cle, nom: a.nom,
          nature: "tarifaire", rendu: "boutons", ordre: rang++, origine: "tarif",
          valeurs: { create: a.mots.map((libelle, i) => ({ libelle, ordre: i, suffixeReference: "" })) },
        },
      });
    }

    for (const l of p.libelles) {
      await prisma.valeurChoix.update({
        where: { id: l.id },
        data: { ...(l.nom ? { libelle: l.nom } : {}), ordre: l.rang },
      });
    }

    if (p.resille) {
      await prisma.choix.create({
        data: {
          vitrineId: p.v.id, cle: "resille", nom: "Coloris de la résille",
          nature: "finition", rendu: "pastilles", origine: "tarif",
          ordre: p.aCreer.length + survivants.length,
          valeurs: { create: RESILLE.map((c, i) => ({ libelle: c.libelle, couleur: c.couleur, ordre: i, suffixeReference: "" })) },
        },
      });
    }

    if (p.renommage) {
      await prisma.produitVitrine.update({
        where: { id: p.v.id }, data: { nom: p.renommage.nom, slug: p.renommage.slug },
      });
    }
  }
  console.log(`   ${plans.length} fiches ouvertes.`);

  titre("CONTRÔLE");
  for (const f of FAMILLES) {
    const reste = await prisma.choix.count({
      where: { vitrine: { publie: true, gamme: { nom: f.gamme } }, nom: { contains: "odèle" } },
    });
    const long = (await prisma.produitVitrine.findMany({
      where: { publie: true, gamme: { nom: f.gamme } }, select: { nom: true },
    })).filter((v) => v.nom.length > 70).length;
    console.log(`   ${f.gamme.padEnd(12)} « Modèle » restantes : ${reste} · titres de plus de 70 car. : ${long}`);
  }
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
