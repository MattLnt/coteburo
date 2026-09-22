// La fiche composée des pages 262-263 : « CASIERS OUVERTS à composer ».
//
//   node prisma/importer-casier-composer-eko.mjs
//   node prisma/importer-casier-composer-eko.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// CE QUE LE TARIF DIT, EN TOUTES LETTRES
//   Page 262, sous « Comment composer vos casiers Eko ? » :
//
//     ① Casier ouvert  +  ② Socle  +  ③ Jeu de portes et poignées
//                                            =  Casier équipé
//
// LES QUANTITÉS NE SONT PAS DÉDUITES, ELLES SONT PROUVÉES
//   Les portes se vendent par kit de trois ou de quatre, et il en faut
//   plusieurs par casier. Plutôt que de le déduire des dimensions, on le lit
//   dans les prix : les pages 264-265 vendent les mêmes casiers DÉJÀ équipés,
//   et leur prix est exactement la somme des éléments des pages 262-263.
//
//     casier      équipé (p.264)   =  casier ouvert  +  kits de portes
//      4 cases          620 €      =   DY133  370    +  1 × 250  (kit de 4)
//      6 cases          895 €      =   DN523  515    +  2 × 190  (kit de 3)
//      9 cases         1220 €      =   DK123  650    +  3 × 190  (kit de 3)
//     12 cases         1545 €      =   DK133  785    +  4 × 190  (kit de 3)
//
//   Les douze combinaisons tombent juste — serrure à clé, code privé et code
//   public. Et le douze cases prend QUATRE kits de trois, pas trois kits de
//   quatre : 785 + 4×190 = 1545, quand 785 + 3×250 donnerait 1535. Le tarif
//   tranche par son prix ce que la géométrie laissait ouvert.
//
// LES JETONS QUI N'EXISTENT PAS
//   Trois cas où la référence n'attend rien, et où poser un jeton vide serait
//   fabriquer une référence fausse :
//
//     · le socle MÉTAL porte sa couleur dans la référence — DY195G est noir,
//       DY197S est blanc — et n'a donc pas de colonne « finition socle » ;
//     · la serrure À CLÉ n'a pas de finition : la page écrit « — » ;
//     · la serrure CODE PUBLIC l'a imposée à 5, le noir.
//
//   Chaque choix concerné reçoit donc une valeur « — » au jeton VIDE, et des
//   exclusions ferment ce que le tarif ne vend pas. Une étape qui n'a plus
//   qu'une valeur ouverte ne se pose pas : le client ne voit pas la question.
//
// CE QU'ON LAISSE EN OPTION PLUTÔT QU'EN ÉTAPE
//   La porte vestiaire (EE58 / DZ51 / DZ523) remplace DEUX cases par une
//   penderie à patère. Elle ne remplace donc pas le jeu de portes, elle en
//   remplace une partie — et le tarif n'écrit NULLE PART combien de kits il
//   reste à commander quand une colonne passe en vestiaire. Cette
//   arithmétique-là serait une invention. Elle reste une option liée, où
//   chaque référence est celle que Buronomic imprime.
//   Le dos tissu et les clés passe sont des options sur la page même.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PDF = "catalogue-2026/catalogue_buronomic_2026_fr.pdf";
const PAGES = [262, 263];
const NOM = "Casiers à composer - Eko";
const SLUG = "casiers-a-composer-eko";
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);

const SANS_SOCLE = "Sans socle";
const SOCLE_MEL = "Socle mélaminé";
const SOCLE_METAL_N = "Socle métal noir";
const SOCLE_METAL_B = "Socle métal blanc";
const SANS_PORTES = "Sans portes";
const STANDARD = "Portes standards H 38,5 cm";
const COURRIER = "Portes fente courrier H 35,5 cm";
const PRIVE = "Serrure à code, mode privé";
const PUBLIC = "Serrure à code, mode public";
const CLE = "Serrure à clé";
const AUCUN = "—";

// ── ① Les casiers ouverts, et le nombre de kits qu'ils réclament ─────────
const CASIERS = [
  { libelle: "4 cases — H 80,5 / L 78,5 cm", ref: "DY133", prix: 370, eco: 5.42,
    petit: true, kit: 4, nbKits: 1 },
  { libelle: "6 cases — H 119,5 / L 78,5 cm", ref: "DN523", prix: 515, eco: 8.84,
    petit: true, kit: 3, nbKits: 2 },
  { libelle: "9 cases — H 119,5 / L 117 cm", ref: "DK123", prix: 650, eco: 11.21,
    petit: false, kit: 3, nbKits: 3 },
  { libelle: "12 cases — H 157,5 / L 117 cm", ref: "DK133", prix: 785, eco: 14.44,
    petit: false, kit: 3, nbKits: 4 },
];

// ── ② Les socles. « petit » = casiers 4 et 6 cases. ──────────────────────
const SOCLES = {
  [SOCLE_MEL]: {
    petit: { ref: "DN533", prix: 103, eco: 1.05 },
    grand: { ref: "DK183", prix: 139, eco: 1.33 },
    designation: "Socle mélaminé H 13,5 cm, vérins",
  },
  [SOCLE_METAL_N]: {
    petit: { ref: "DY195G", prix: 210, eco: 1.55 },
    grand: { ref: "DY205G", prix: 245, eco: 1.91 },
    designation: "Socle métal noir H 41 cm, vérins",
  },
  [SOCLE_METAL_B]: {
    petit: { ref: "DY197S", prix: 210, eco: 1.55 },
    grand: { ref: "DY207S", prix: 245, eco: 1.91 },
    designation: "Socle métal blanc H 41 cm, vérins",
  },
};

// ── ③ Les kits de portes : [famille][taille du kit][serrure] ─────────────
const KITS = {
  [STANDARD]: {
    3: { [PRIVE]: { ref: "EE54", prix: 240 }, [PUBLIC]: { ref: "DZ43", prix: 310 }, [CLE]: { ref: "DZ453", prix: 190 }, eco: 1.5 },
    4: { [PRIVE]: { ref: "EE56", prix: 355 }, [PUBLIC]: { ref: "DZ47", prix: 455 }, [CLE]: { ref: "DZ493", prix: 250 }, eco: 1.52 },
  },
  [COURRIER]: {
    3: { [PRIVE]: { ref: "EE55", prix: 240 }, [PUBLIC]: { ref: "DZ44", prix: 310 }, [CLE]: { ref: "DZ463", prix: 190 }, eco: 1.41 },
    4: { [PRIVE]: { ref: "EE57", prix: 355 }, [PUBLIC]: { ref: "DZ48", prix: 455 }, [CLE]: { ref: "DZ503", prix: 250 }, eco: 1.43 },
  },
};

// ── Les décors ───────────────────────────────────────────────────────────
const DECOR_STRUCTURE = [
  { libelle: "Blanc", suffixeReference: "S", couleur: "#f2f0ec" },
  { libelle: "Argile", suffixeReference: "X", couleur: "#a08d7c" },
  { libelle: "Noir", suffixeReference: "G", couleur: "#23262a" },
];
// Le socle métal n'a pas de colonne « finition » : sa couleur est déjà dans
// la référence. La valeur « — » au jeton vide le dit sans mentir.
const DECOR_SOCLE = [...DECOR_STRUCTURE, { libelle: AUCUN, suffixeReference: "", couleur: null }];
const DECOR_PORTES = [
  { libelle: "Blanc", suffixeReference: "S", couleur: "#f2f0ec" },
  { libelle: "Argile", suffixeReference: "X", couleur: "#a08d7c" },
  { libelle: "Noir", suffixeReference: "G", couleur: "#23262a" },
  { libelle: "Chêne fil", suffixeReference: "N", couleur: "#c9a876" },
  { libelle: "Nebraska", suffixeReference: "F", couleur: "#b89b73" },
  { libelle: "Timber", suffixeReference: "M", couleur: "#8a6a4a" },
  { libelle: "Yukon", suffixeReference: "Y", couleur: "#6e5b4a" },
  { libelle: "Horizon", suffixeReference: "U", couleur: "#8fa3b0" },
  { libelle: "Pêche", suffixeReference: "W", couleur: "#e0b49a" },
  { libelle: "Sauge", suffixeReference: "R", couleur: "#9aa98a" },
  { libelle: "Ombre", suffixeReference: "L", couleur: "#6b6f73" },
];
const FINITION_POIGNEE = [
  { libelle: "Blanc", suffixeReference: "7", couleur: "#f2f0ec" },
  { libelle: "Noir", suffixeReference: "5", couleur: "#23262a" },
  { libelle: AUCUN, suffixeReference: "", couleur: null },
];

const CHOIX = [
  { cle: "casier", nom: "Casier", nature: "tarifaire", rendu: "liste", ordre: 0,
    element: null, rangReference: null, valeurs: CASIERS.map((c) => ({ libelle: c.libelle })) },
  { cle: "socle", nom: "Socle", nature: "tarifaire", rendu: "boutons", ordre: 1,
    element: null, rangReference: null,
    valeurs: [{ libelle: SANS_SOCLE }, { libelle: SOCLE_MEL }, { libelle: SOCLE_METAL_N }, { libelle: SOCLE_METAL_B }] },
  { cle: "portes", nom: "Portes", nature: "tarifaire", rendu: "boutons", ordre: 2,
    element: null, rangReference: null,
    valeurs: [{ libelle: SANS_PORTES }, { libelle: STANDARD }, { libelle: COURRIER }] },
  { cle: "serrure", nom: "Serrure", nature: "tarifaire", rendu: "boutons", ordre: 3,
    element: null, rangReference: null,
    valeurs: [{ libelle: PRIVE }, { libelle: PUBLIC }, { libelle: CLE }] },
  { cle: "decor-casier", nom: "Décor du casier", nature: "finition", rendu: "pastilles", ordre: 4,
    element: "casier", rangReference: 0, valeurs: DECOR_STRUCTURE },
  { cle: "decor-socle", nom: "Décor du socle", nature: "finition", rendu: "pastilles", ordre: 5,
    element: "socle", rangReference: 0, valeurs: DECOR_SOCLE },
  { cle: "decor-portes", nom: "Décor des portes", nature: "finition", rendu: "pastilles", ordre: 6,
    element: "portes", rangReference: 0, valeurs: DECOR_PORTES },
  { cle: "finition-poignee", nom: "Finition de la poignée", nature: "finition", rendu: "pastilles", ordre: 7,
    element: "portes", rangReference: 1, valeurs: FINITION_POIGNEE },
];

/** Les combinaisons, et les éléments que chacune commande. */
function combinaisons() {
  const out = [];
  for (const c of CASIERS) {
    const taille = c.petit ? "petit" : "grand";
    for (const socle of [SANS_SOCLE, SOCLE_MEL, SOCLE_METAL_N, SOCLE_METAL_B]) {
      for (const portes of [SANS_PORTES, STANDARD, COURRIER]) {
        const serrures = portes === SANS_PORTES ? [null] : [PRIVE, PUBLIC, CLE];
        for (const serrure of serrures) {
          const elements = [
            { cle: "casier", designation: `Casier ouvert ${c.libelle}`,
              referenceBase: c.ref, prixTarifHT: c.prix, ecoContribution: c.eco, quantite: 1 },
          ];
          if (socle !== SANS_SOCLE) {
            const s = SOCLES[socle][taille];
            elements.push({ cle: "socle", designation: SOCLES[socle].designation,
              referenceBase: s.ref, prixTarifHT: s.prix, ecoContribution: s.eco, quantite: 1 });
          }
          if (portes !== SANS_PORTES) {
            const k = KITS[portes][c.kit];
            const p = k[serrure];
            elements.push({
              cle: "portes",
              designation: `Jeu de ${c.kit} portes ${portes === STANDARD ? "standards" : "fente courrier"} avec serrures`,
              referenceBase: p.ref, prixTarifHT: p.prix, ecoContribution: k.eco, quantite: c.nbKits,
            });
          }
          const valeurs = { casier: c.libelle, socle, portes };
          if (serrure) valeurs.serrure = serrure;
          out.push({
            valeurs, elements,
            prixTarifHT: elements.reduce((a, e) => a + e.prixTarifHT * e.quantite, 0),
            ecoContribution: Number(elements.reduce((a, e) => a + e.ecoContribution * e.quantite, 0).toFixed(2)),
          });
        }
      }
    }
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

  // ── Le filet contre le tarif ────────────────────────────────────────
  titre("VÉRIFICATION CONTRE LE TARIF");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync(PDF)), useSystemFonts: true }).promise;
  const textes = [];
  for (const n of PAGES) textes.push(await textePage(doc, n));
  const ensemble = textes.join(" ");
  const refs = [...new Set(combis.flatMap((k) => k.elements.map((e) => e.referenceBase)))].sort();
  let manquantes = 0;
  console.log(`   pages ${PAGES.join(", ")} — ${refs.length} références`);
  for (const r of refs) if (!ensemble.includes(r)) { console.log(`      ABSENTE : ${r}`); manquantes++; }
  if (manquantes) { titre(`${manquantes} RÉFÉRENCES INTROUVABLES — RIEN NE SERA ÉCRIT`); process.exitCode = 1; return; }
  console.log("   toutes retrouvées");

  // ── Le second filet : les casiers ÉQUIPÉS des pages 264-265 ─────────
  // Leur prix doit être exactement celui de la composition équivalente.
  // C'est ce qui prouve les quantités de kits.
  titre("CONTRE LES CASIERS ÉQUIPÉS (pages 264-265)");
  const equipes = await prisma.produitVitrine.findFirst({
    where: { nom: "Casier à portes standard - Eko" },
    select: { combinaisons: { select: { valeurs: true, prixTarifHT: true } } },
  });
  const serrureDe = (s) => (s.includes("public") ? PUBLIC : s.includes("clé") ? CLE : PRIVE);
  let ecarts = 0;
  for (const e of equipes?.combinaisons || []) {
    const cases = String(e.valeurs.modele).match(/(\d+) cases/)?.[1];
    const serrure = serrureDe(String(e.valeurs.pietement));
    const mien = combis.find((k) => k.valeurs.casier.startsWith(`${cases} cases`)
      && k.valeurs.socle === SANS_SOCLE && k.valeurs.portes === STANDARD && k.valeurs.serrure === serrure);
    const ok = mien && mien.prixTarifHT === e.prixTarifHT;
    if (!ok) ecarts++;
    console.log(`   ${ok ? "=" : "≠"} ${String(cases).padStart(2)} cases · ${serrure.padEnd(26)} équipé ${e.prixTarifHT} €  composé ${mien?.prixTarifHT ?? "—"} €`);
  }
  if (ecarts) { titre(`${ecarts} ÉCARTS DE PRIX — RIEN NE SERA ÉCRIT`); process.exitCode = 1; return; }
  console.log(`\n   ${equipes.combinaisons.length} casiers équipés, ${equipes.combinaisons.length} prix retrouvés à l'euro`);

  // ── L'exemple de commande de la page 262 ────────────────────────────
  titre("L'EXEMPLE DE LA PAGE 262, REJOUÉ");
  const jeton = (cle, lib) => CHOIX.find((c) => c.cle === cle).valeurs.find((v) => v.libelle === lib).suffixeReference;
  const ex = combis.find((k) => k.valeurs.casier.startsWith("4 cases")
    && k.valeurs.socle === SOCLE_METAL_N && k.valeurs.portes === SANS_PORTES);
  const obtenu = [
    ex.elements[0].referenceBase + jeton("decor-casier", "Noir"),
    ex.elements[1].referenceBase + jeton("decor-socle", AUCUN),
  ];
  console.log(`   tarif    : DY133G  DY195G`);
  console.log(`   la fiche : ${obtenu.join("  ")}`);
  const concorde = obtenu.join() === ["DY133G", "DY195G"].join();
  console.log(`   ${concorde ? "CONCORDE" : "DIVERGE — on n'écrit pas"}`);
  if (!concorde) { process.exitCode = 1; return; }

  // ── Ce que la fiche posera ──────────────────────────────────────────
  titre("LA FICHE");
  const gamme = await prisma.gamme.findFirst({ where: { nom: "EKO" }, select: { id: true } });
  const modele = await prisma.produitVitrine.findFirst({
    where: { nom: "Casier à cases ouvertes - Eko" },
    select: { id: true, imageUrl: true, images: true,
      categories: { select: { id: true } }, sousCategories: { select: { id: true } },
      categoriePrincipaleId: true, sousCategoriePrincipaleId: true,
      visuels: { orderBy: { ordre: "asc" }, select: { url: true, role: true, ordre: true, recadre: true, urlOrigine: true } } },
  });
  if (!gamme || !modele) { console.log("   gamme ou fiche modèle introuvable"); process.exitCode = 1; return; }

  const existante = await prisma.produitVitrine.findFirst({ where: { gammeId: gamme.id, slug: SLUG }, select: { id: true } });
  console.log(`   ${existante ? "MISE À JOUR" : "CRÉATION"} · ${NOM}`);
  console.log(`   ${CHOIX.length} questions · ${combis.length} combinaisons · ${modele.visuels.length} visuels repris`);

  titre("LES ÉTAPES POSÉES AU CLIENT");
  for (const c of CHOIX) {
    console.log(`   ${c.ordre}. [${c.nature.padEnd(9)}] ${c.nom.padEnd(26)} ${String(c.valeurs.length).padStart(2)} valeurs${c.element ? `  →  ${c.element}` : ""}`);
  }

  titre("UN EXEMPLE COMPLET — 12 CASES, QUATRE KITS");
  const demo = combis.find((k) => k.valeurs.casier.startsWith("12 cases")
    && k.valeurs.socle === SOCLE_MEL && k.valeurs.portes === STANDARD && k.valeurs.serrure === CLE);
  console.log(`   ${Object.values(demo.valeurs).join(" · ")}\n   ${demo.prixTarifHT} € HT (éco ${demo.ecoContribution} €)`);
  for (const e of demo.elements) {
    console.log(`      ${String(e.quantite)} × ${e.referenceBase.padEnd(7)} ${String(e.prixTarifHT).padStart(4)} € → ${String(e.prixTarifHT * e.quantite).padStart(4)} €  ${e.designation}`);
  }

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }

  // ── L'écriture ──────────────────────────────────────────────────────
  const vitrine = existante
    ? await prisma.produitVitrine.update({ where: { id: existante.id }, data: { nom: NOM, publie: true } })
    : await prisma.produitVitrine.create({
      data: {
        nom: NOM, slug: SLUG, gammeId: gamme.id, publie: true, venteSurDevis: false,
        descriptif: "Le casier, son socle et son jeu de portes se choisissent ici un par un. Les portes se commandent par kit : un kit de quatre pour un casier quatre cases, quatre kits de trois pour un douze cases. La commande part en une à trois références Buronomic, réunies sur une seule ligne.",
        imageUrl: modele.imageUrl, images: modele.images,
        categories: { connect: modele.categories.map((c) => ({ id: c.id })) },
        sousCategories: { connect: modele.sousCategories.map((s) => ({ id: s.id })) },
        categoriePrincipaleId: modele.categoriePrincipaleId,
        sousCategoriePrincipaleId: modele.sousCategoriePrincipaleId,
      },
    });

  await prisma.combinaison.deleteMany({ where: { vitrineId: vitrine.id } });
  await prisma.exclusionFinition.deleteMany({ where: { vitrineId: vitrine.id } });
  await prisma.choix.deleteMany({ where: { vitrineId: vitrine.id } });

  const ids = new Map();
  for (const c of CHOIX) {
    const choix = await prisma.choix.create({
      data: { vitrineId: vitrine.id, cle: c.cle, nom: c.nom, nature: c.nature,
        rendu: c.rendu, ordre: c.ordre, element: c.element, rangReference: c.rangReference },
    });
    for (const [i, v] of c.valeurs.entries()) {
      const valeur = await prisma.valeurChoix.create({
        data: { choixId: choix.id, libelle: v.libelle, ordre: i,
          suffixeReference: v.suffixeReference ?? null, couleur: v.couleur ?? null },
      });
      ids.set(`${c.cle}::${v.libelle}`, valeur.id);
    }
  }

  for (const k of combis) {
    await prisma.combinaison.create({
      data: { vitrineId: vitrine.id, valeurs: k.valeurs, empreinte: empreinteDe(k.valeurs),
        prixTarifHT: k.prixTarifHT, ecoContribution: k.ecoContribution,
        referenceBase: k.elements[0].referenceBase, elements: k.elements, pageCatalogue: 262 },
    });
  }

  // Les interdits, tels que la page les écrit.
  const interdire = (a, b) => prisma.exclusionFinition.create({ data: { vitrineId: vitrine.id, valeurs: [a, b] } });
  const couleurs = DECOR_STRUCTURE.map((d) => d.libelle);
  // Socle métal : la couleur est dans la référence, pas de jeton.
  for (const metal of [SOCLE_METAL_N, SOCLE_METAL_B]) {
    for (const t of couleurs) await interdire(ids.get(`socle::${metal}`), ids.get(`decor-socle::${t}`));
  }
  // Socle mélaminé : il FAUT un décor.
  await interdire(ids.get(`socle::${SOCLE_MEL}`), ids.get(`decor-socle::${AUCUN}`));
  // Serrure à clé : pas de finition. Code public : imposée au noir.
  for (const t of ["Blanc", "Noir"]) await interdire(ids.get(`serrure::${CLE}`), ids.get(`finition-poignee::${t}`));
  await interdire(ids.get(`serrure::${PUBLIC}`), ids.get(`finition-poignee::Blanc`));
  await interdire(ids.get(`serrure::${PUBLIC}`), ids.get(`finition-poignee::${AUCUN}`));
  await interdire(ids.get(`serrure::${PRIVE}`), ids.get(`finition-poignee::${AUCUN}`));

  const dejaVus = await prisma.visuel.count({ where: { vitrineId: vitrine.id } });
  if (dejaVus === 0) {
    for (const v of modele.visuels) {
      await prisma.visuel.create({ data: { vitrineId: vitrine.id, url: v.url, role: v.role, ordre: v.ordre, recadre: v.recadre, urlOrigine: v.urlOrigine } });
    }
  }

  // La porte vestiaire, le dos tissu et les clés passe se cochent en option.
  const options = await prisma.produitVitrine.findMany({
    where: { gammeId: gamme.id, nom: { in: [
      "Porte vestiaire avec patère - Eko", "Dos tissu pour casier - Eko",
      "Clé passe et réinitialisation de serrure - Eko"] } },
    select: { id: true, nom: true },
  });
  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { optionsLiees: { set: options.map((o) => ({ id: o.id })) } },
  });

  titre("LE COMPTE");
  console.log(`   fiche ${existante ? "mise à jour" : "créée"} · ${CHOIX.length} questions · ${combis.length} combinaisons`);
  console.log(`   options liées : ${options.map((o) => o.nom).join(", ")}`);
  console.log(`\n   /${SLUG}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
