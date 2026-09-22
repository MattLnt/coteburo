// La fiche composée de la page 241 : « RANGEMENTS AVEC ALCÔVE à composer ».
//
//   node prisma/importer-rangement-alcove-quietude.mjs
//   node prisma/importer-rangement-alcove-quietude.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// CE QUE LA PAGE 241 VEND
//   Un produit que le client configure d'un bout à l'autre, et qui part en
//   QUATRE références chez Buronomic. Le tarif le dit lui-même, en bas de
//   page :
//
//     Rangement portes battantes H 69,5 / L 80 cm avec alcôve, structure
//     décor Blanc, portes battantes décor imitation Chêne Fil, alcôve décor
//     Blanc, poignée Design Blanc
//       = BH693 + S , DZ07 + S S , EH783 + N et DX21 + 7S
//
//   Quatre références, quatre prix. On ne les concatène pas en une seule :
//   « BH693+S+DZ07+SS+… » n'existe pas chez Buronomic, et docs/modele-produit.md
//   pose l'invariant inverse. La fiche porte donc `Combinaison.elements`, et
//   chaque choix de finition dit par `Choix.element` à quelle référence il
//   apporte son jeton.
//
// LES QUATRE ÉLÉMENTS, ET LEURS PRIX
//                                  L 80                 L 100
//     ① structure  BH693  150,00 € · BH703  180,00 €   H 69,5, ouvert 1 tablette
//     ② alcôve     DZ07   400,00 € · DZ08   415,00 €   P 52 / H 131, 3 tablettes
//     ③ portes     EH783  140,00 € · EH823  165,00 €   jeu de 2 battantes
//     ④ poignées   BA00    15,00 € · DX21    20,00 €   lot de 2
//
//   Les sommes retombent exactement sur celles que portait l'ancienne fiche
//   « Rangement à composer Quiétude », disparue depuis :
//     L 80  sans portes 550 · classiques 705 · design 710
//     L 100 sans portes 595 · classiques 775 · design 780
//
// POURQUOI LA STRUCTURE EST LE H 69,5 ET RIEN D'AUTRE
//   Le bloc ② l'écrit : « Se positionne uniquement sur le rangement H 69,5 cm ».
//   Les lignes H 201 et bibliothèque du bloc ① servent le module voisin de la
//   composition dessinée page 240, pas à porter l'alcôve.
//
// POURQUOI EH783 ALORS QUE LE BLOC ③ DIT « POUR RANGEMENT H 72 CM »
//   Parce que l'exemple de commande, lui, met EH783 sous un H 69,5. Comme
//   pour la coquille Wi-Max de la page 34, on suit ce que le tarif COMMANDE,
//   pas ce qu'il décrit.
//
// CE QUI MANQUE ENCORE, ET QUI EST DIT
//   Le bloc ④ donne quatre finitions réservées au modèle design — Horizon 13U,
//   Pêche 11W, Sauge 12R, Ombre 2L. La fiche « Kit de 2 poignées » les porte
//   sans jeton de référence ; on les pose ici AVEC leur jeton, et quatre
//   exclusions les interdisent au modèle classique.
//
// L'ALCÔVE SORT DU CATALOGUE
//   `accessoireSeul = true` : la fiche quitte les rayons et la recherche,
//   mais reste joignable par son adresse — un lien de devis ne doit pas
//   mourir — et reste utilisable par cette composition. Elle n'est PAS
//   dépubliée : `publie = false` la rendrait éligible à
//   prisma/supprimer-fiches-remplacees.mjs, et on ne veut pas qu'elle parte.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PDF = "catalogue-2026/catalogue_buronomic_2026_fr.pdf";
const PAGE = 241;
const NOM = "Rangements avec alcôve à composer - Quiétude";
const SLUG = "rangements-avec-alcove-a-composer-quietude";
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);

// ── Les quatre éléments, par largeur ────────────────────────────────────
const ELEMENTS = {
  "80 cm": {
    structure: { cle: "structure", designation: "Rangement ouvert H 69,5 cm — 1 tablette", referenceBase: "BH693", prixTarifHT: 150, ecoContribution: 4.09 },
    alcove: { cle: "alcove", designation: "Alcôve P 52 / H 131 cm — 3 tablettes", referenceBase: "DZ07", prixTarifHT: 400, ecoContribution: 10.36 },
    portes: { cle: "portes", designation: "Jeu de 2 portes battantes", referenceBase: "EH783", prixTarifHT: 140, ecoContribution: 1.27 },
    poigneesClassique: { cle: "poignees", designation: "Lot de 2 poignées classiques", referenceBase: "BA00", prixTarifHT: 15, ecoContribution: 0.09 },
    poigneesDesign: { cle: "poignees", designation: "Lot de 2 poignées design", referenceBase: "DX21", prixTarifHT: 20, ecoContribution: 0.09 },
  },
  "100 cm": {
    structure: { cle: "structure", designation: "Rangement ouvert H 69,5 cm — 1 tablette", referenceBase: "BH703", prixTarifHT: 180, ecoContribution: 4.62 },
    alcove: { cle: "alcove", designation: "Alcôve P 52 / H 131 cm — 3 tablettes", referenceBase: "DZ08", prixTarifHT: 415, ecoContribution: 11.4 },
    portes: { cle: "portes", designation: "Jeu de 2 portes battantes", referenceBase: "EH823", prixTarifHT: 165, ecoContribution: 1.6 },
    poigneesClassique: { cle: "poignees", designation: "Lot de 2 poignées classiques", referenceBase: "BA00", prixTarifHT: 15, ecoContribution: 0.09 },
    poigneesDesign: { cle: "poignees", designation: "Lot de 2 poignées design", referenceBase: "DX21", prixTarifHT: 20, ecoContribution: 0.09 },
  },
};

// ── Les décors, avec le jeton que le tarif leur donne ───────────────────
const DECOR_CAISSON = [
  { libelle: "Blanc", suffixeReference: "S", couleur: "#f2f0ec" },
  { libelle: "Argile", suffixeReference: "X", couleur: "#a08d7c" },
  { libelle: "Noir", suffixeReference: "G", couleur: "#23262a" },
  { libelle: "Chêne fil", suffixeReference: "N", couleur: "#c9a876" },
  { libelle: "Nebraska", suffixeReference: "F", couleur: "#b89b73" },
  { libelle: "Timber", suffixeReference: "M", couleur: "#8a6a4a" },
  { libelle: "Yukon", suffixeReference: "Y", couleur: "#6e5b4a" },
];
// Le bloc ③ ajoute quatre décors réservés aux portes.
const DECOR_PORTES = [
  ...DECOR_CAISSON,
  { libelle: "Ombre", suffixeReference: "L", couleur: "#6b6f73" },
  { libelle: "Horizon", suffixeReference: "U", couleur: "#8fa3b0" },
  { libelle: "Sauge", suffixeReference: "R", couleur: "#9aa98a" },
  { libelle: "Pêche", suffixeReference: "W", couleur: "#e0b49a" },
];
const FINITION_POIGNEE = [
  { libelle: "Aluminium", suffixeReference: "1K", couleur: "#b8bcc0" },
  { libelle: "Blanc", suffixeReference: "7S", couleur: "#f2f0ec" },
  { libelle: "Noir", suffixeReference: "5G", couleur: "#23262a" },
  { libelle: "Horizon", suffixeReference: "13U", couleur: "#8fa3b0", designSeulement: true },
  { libelle: "Pêche", suffixeReference: "11W", couleur: "#e0b49a", designSeulement: true },
  { libelle: "Sauge", suffixeReference: "12R", couleur: "#9aa98a", designSeulement: true },
  { libelle: "Ombre", suffixeReference: "2L", couleur: "#6b6f73", designSeulement: true },
];

const CLASSIQUES = "Poignées classiques";
const DESIGN = "Poignées design";
const AVEC = "Avec portes battantes";
const SANS = "Sans portes";

// ── Les choix ───────────────────────────────────────────────────────────
const CHOIX = [
  { cle: "largeur", nom: "Largeur", nature: "tarifaire", rendu: "boutons", ordre: 0,
    element: null, rangReference: null,
    valeurs: [{ libelle: "80 cm" }, { libelle: "100 cm" }] },
  { cle: "portes", nom: "Portes", nature: "tarifaire", rendu: "boutons", ordre: 1,
    element: null, rangReference: null,
    valeurs: [{ libelle: AVEC }, { libelle: SANS }] },
  { cle: "poignees", nom: "Poignées", nature: "tarifaire", rendu: "boutons", ordre: 2,
    element: null, rangReference: null,
    valeurs: [{ libelle: CLASSIQUES }, { libelle: DESIGN }] },
  { cle: "decor-structure", nom: "Décor du rangement", nature: "finition", rendu: "pastilles", ordre: 3,
    element: "structure", rangReference: 0, valeurs: DECOR_CAISSON },
  { cle: "decor-alcove", nom: "Décor de l'alcôve", nature: "finition", rendu: "pastilles", ordre: 4,
    element: "alcove", rangReference: 0, valeurs: DECOR_CAISSON },
  { cle: "decor-alcove-tablettes", nom: "Décor des tablettes de l'alcôve", nature: "finition", rendu: "pastilles", ordre: 5,
    element: "alcove", rangReference: 1, valeurs: DECOR_CAISSON },
  { cle: "decor-portes", nom: "Décor des portes", nature: "finition", rendu: "pastilles", ordre: 6,
    element: "portes", rangReference: 0, valeurs: DECOR_PORTES },
  { cle: "finition-poignee", nom: "Finition de la poignée", nature: "finition", rendu: "pastilles", ordre: 7,
    element: "poignees", rangReference: 0, valeurs: FINITION_POIGNEE },
];

/** Les six combinaisons, et les éléments que chacune commande. */
function combinaisons() {
  const out = [];
  for (const largeur of ["80 cm", "100 cm"]) {
    const E = ELEMENTS[largeur];
    const poser = (valeurs, elements) => {
      out.push({
        valeurs,
        elements,
        prixTarifHT: elements.reduce((a, e) => a + e.prixTarifHT, 0),
        ecoContribution: Number(elements.reduce((a, e) => a + e.ecoContribution, 0).toFixed(2)),
      });
    };
    poser({ largeur, portes: SANS }, [E.structure, E.alcove]);
    poser({ largeur, portes: AVEC, poignees: CLASSIQUES }, [E.structure, E.alcove, E.portes, E.poigneesClassique]);
    poser({ largeur, portes: AVEC, poignees: DESIGN }, [E.structure, E.alcove, E.portes, E.poigneesDesign]);
  }
  return out;
}

async function textePage(doc, n) {
  const t = await (await doc.getPage(n)).getTextContent();
  return t.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim().toUpperCase();
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const combis = combinaisons();

  // ── Le filet : toute référence posée est sur la page 241 ─────────────
  titre("VÉRIFICATION CONTRE LE TARIF");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync(PDF)), useSystemFonts: true }).promise;
  const texte = await textePage(doc, PAGE);

  const refs = [...new Set(combis.flatMap((c) => c.elements.map((e) => e.referenceBase)))].sort();
  const jetons = [...new Set(CHOIX.flatMap((c) => c.valeurs.map((v) => v.suffixeReference)).filter(Boolean))];
  let manquantes = 0;
  console.log(`   page ${PAGE} — ${refs.length} références, ${jetons.length} jetons de finition`);
  for (const r of refs) if (!texte.includes(r)) { console.log(`      RÉFÉRENCE ABSENTE : ${r}`); manquantes++; }
  for (const j of jetons) if (!texte.includes(j)) { console.log(`      JETON ABSENT : ${j}`); manquantes++; }
  if (manquantes) {
    titre(`${manquantes} MENTIONS INTROUVABLES — RIEN NE SERA ÉCRIT`);
    process.exitCode = 1;
    return;
  }
  console.log("   toutes retrouvées");

  // ── Ce que la fiche posera ──────────────────────────────────────────
  titre("LA FICHE");
  const gamme = await prisma.gamme.findFirst({ where: { nom: "QUIETUDE" }, select: { id: true, nom: true } });
  if (!gamme) { console.log("   gamme QUIETUDE introuvable"); process.exitCode = 1; return; }
  const alcove = await prisma.produitVitrine.findFirst({
    where: { nom: "Alcôve - Quiétude" },
    select: { id: true, imageUrl: true, images: true, accessoireSeul: true,
      categories: { select: { id: true } }, sousCategories: { select: { id: true } },
      categoriePrincipaleId: true, sousCategoriePrincipaleId: true },
  });
  if (!alcove) { console.log("   fiche Alcôve introuvable"); process.exitCode = 1; return; }

  const existante = await prisma.produitVitrine.findFirst({ where: { gammeId: gamme.id, slug: SLUG }, select: { id: true } });
  console.log(`   ${existante ? "MISE À JOUR" : "CRÉATION"} · ${NOM}`);
  console.log(`   ${CHOIX.length} questions · ${combis.length} combinaisons · rayon repris de la fiche Alcôve`);

  titre("LES ÉTAPES POSÉES AU CLIENT");
  for (const c of CHOIX) {
    const el = c.element ? `  →  ${c.element}` : "";
    console.log(`   ${c.ordre}. [${c.nature.padEnd(9)}] ${c.nom.padEnd(32)} ${c.valeurs.length} valeurs${el}`);
  }

  titre("LES SIX COMBINAISONS");
  for (const k of combis) {
    console.log(`\n   ${Object.values(k.valeurs).join(" · ")}   ${k.prixTarifHT} € HT  (éco ${k.ecoContribution} €)`);
    for (const e of k.elements) console.log(`      ${e.referenceBase.padEnd(6)} ${String(e.prixTarifHT).padStart(4)} €  ${e.designation}`);
  }

  titre("EXEMPLE DE LA PAGE 241, REJOUÉ");
  const ex = combis.find((k) => k.valeurs.largeur === "80 cm" && k.valeurs.poignees === DESIGN);
  const jeton = (cle, lib) => CHOIX.find((c) => c.cle === cle).valeurs.find((v) => v.libelle === lib).suffixeReference;
  const attendu = ["BH693S", "DZ07SS", "EH783N", "DX217S"];
  const obtenu = [
    ex.elements[0].referenceBase + jeton("decor-structure", "Blanc"),
    ex.elements[1].referenceBase + jeton("decor-alcove", "Blanc") + jeton("decor-alcove-tablettes", "Blanc"),
    ex.elements[2].referenceBase + jeton("decor-portes", "Chêne fil"),
    ex.elements[3].referenceBase + jeton("finition-poignee", "Blanc"),
  ];
  console.log(`   tarif   : ${attendu.join("  ")}`);
  console.log(`   la fiche: ${obtenu.join("  ")}`);
  const concorde = attendu.join() === obtenu.join();
  console.log(`   ${concorde ? "CONCORDE" : "DIVERGE — on n'écrit pas"}`);
  if (!concorde) { process.exitCode = 1; return; }

  if (!APPLIQUER) {
    titre("LE COMPTE");
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  // ── L'écriture ──────────────────────────────────────────────────────
  const vitrine = existante
    ? await prisma.produitVitrine.update({ where: { id: existante.id }, data: { nom: NOM, publie: true } })
    : await prisma.produitVitrine.create({
      data: {
        nom: NOM, slug: SLUG, gammeId: gamme.id, publie: true, venteSurDevis: false,
        descriptif: "Le rangement bas, l'alcôve qui le surmonte, les portes et les poignées se choisissent ici un par un. La commande part en quatre références Buronomic, réunies sur une seule ligne de panier.",
        imageUrl: alcove.imageUrl, images: alcove.images,
        categories: { connect: alcove.categories.map((c) => ({ id: c.id })) },
        sousCategories: { connect: alcove.sousCategories.map((s) => ({ id: s.id })) },
        categoriePrincipaleId: alcove.categoriePrincipaleId,
        sousCategoriePrincipaleId: alcove.sousCategoriePrincipaleId,
      },
    });

  // On repart d'une fiche nette : les choix et combinaisons de la version
  // précédente de CE script, pas ceux d'une autre fiche.
  await prisma.combinaison.deleteMany({ where: { vitrineId: vitrine.id } });
  await prisma.exclusionFinition.deleteMany({ where: { vitrineId: vitrine.id } });
  await prisma.choix.deleteMany({ where: { vitrineId: vitrine.id } });

  const valeurIds = new Map();
  for (const c of CHOIX) {
    const choix = await prisma.choix.create({
      data: {
        vitrineId: vitrine.id, cle: c.cle, nom: c.nom, nature: c.nature,
        rendu: c.rendu, ordre: c.ordre, element: c.element, rangReference: c.rangReference,
      },
    });
    for (const [i, v] of c.valeurs.entries()) {
      const valeur = await prisma.valeurChoix.create({
        data: {
          choixId: choix.id, libelle: v.libelle, ordre: i,
          suffixeReference: v.suffixeReference ?? null, couleur: v.couleur ?? null,
        },
      });
      valeurIds.set(`${c.cle}::${v.libelle}`, valeur.id);
    }
  }

  for (const k of combis) {
    await prisma.combinaison.create({
      data: {
        vitrineId: vitrine.id, valeurs: k.valeurs, empreinte: empreinteDe(k.valeurs),
        prixTarifHT: k.prixTarifHT, ecoContribution: k.ecoContribution,
        referenceBase: k.elements[0].referenceBase, elements: k.elements,
        pageCatalogue: PAGE,
      },
    });
  }

  // Les quatre finitions de poignée que seul le modèle design propose.
  for (const f of FINITION_POIGNEE.filter((v) => v.designSeulement)) {
    await prisma.exclusionFinition.create({
      data: {
        vitrineId: vitrine.id,
        valeurs: [valeurIds.get(`poignees::${CLASSIQUES}`), valeurIds.get(`finition-poignee::${f.libelle}`)],
      },
    });
  }

  // L'alcôve quitte les rayons sans quitter la base.
  if (!alcove.accessoireSeul) {
    await prisma.produitVitrine.update({ where: { id: alcove.id }, data: { accessoireSeul: true } });
  }

  titre("LE COMPTE");
  console.log(`   fiche ${existante ? "mise à jour" : "créée"} · ${CHOIX.length} questions · ${combis.length} combinaisons · 4 exclusions`);
  console.log(`   Alcôve - Quiétude : accessoireSeul = true (hors catalogue et recherche)`);
  console.log(`\n   /${SLUG}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
