// Reconstruit la gamme Loria depuis le tarif : un bloc du tarif = un produit.
// Trente-six fiches, chaise et fauteuil séparés.
//
//   node prisma/reimporter-loria.mjs
//   node prisma/reimporter-loria.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI UN RÉIMPORT ET PAS UN REGROUPEMENT
//   Les scripts regrouper-*.mjs relisent les fiches EXISTANTES et les
//   fusionnent : ils font confiance aux prix déjà en base. Chez Loria, cette
//   confiance est mal placée — la fiche « Chaise et fauteuil 4 pieds bois,
//   coque PP » porte par exemple une combinaison dont la référence stockée
//   est littéralement « LCBB/B + coloris* 414 » : l'import d'origine a
//   recopié un fragment de texte du PDF dans le champ référence, et n'a
//   gardé qu'UNE variante de tissu sur les quatre qui existent. Regrouper par-
//   dessus aurait propagé l'erreur avec plus de conviction.
//
//   Ce script ignore donc entièrement les combinaisons actuelles. Chaque
//   prix ci-dessous vient d'une lecture par coordonnées des pages 72 à 75
//   (prisma/lire-tableau-catalogue.mjs), qui évite le mélange de colonnes
//   du texte brut — c'est ce mélange qui, chez Adio, aurait inversé deux
//   accords de coloris si on lui avait fait confiance sans vérifier.
//
// LE FILET : LA RELECTURE AU MOMENT DE L'EXÉCUTION
//   Un prix mal recopié à la main est une erreur qu'aucune relecture visuelle
//   ne garantit d'attraper. Au démarrage, ce script rouvre donc lui-même le
//   PDF, relit le texte des pages 72 à 75, et vérifie que CHAQUE prix utilisé
//   ci-dessous y apparaît au moins autant de fois qu'il est employé. Un
//   nombre qui ne s'y trouve pas fait échouer le script avant toute écriture.
//
// LA GRAMMAIRE DES RÉFÉRENCES, ÉTABLIE PAGE PAR PAGE
//   Chaise = préfixe L C•, sans accotoirs. Fauteuil = préfixe L O•, avec
//   accotoirs — le même écart qu'Adio et Adela, ici porté par une lettre et
//   non un chiffre. Trois paliers de garnissage (nu / avec placet /
//   entièrement tapissé) forment trois racines différentes pour un même
//   piétement (LCA0 → LCB0 → LCC0 côté chaise métal, par exemple).
//
//   La finition (couleur du piétement) ne change JAMAIS le prix — seul le
//   tissu le fait, quand il y en a un. C'est la définition même d'un choix
//   de nature « finition » : elle déplace la référence, pas le prix.
//
// UN DÉFAUT DU TARIF, REPORTÉ SANS ÊTRE CORRIGÉ
//   Page 74 (Loria Outdoor), la référence LCBB/[A-P] est imprimée deux fois :
//   une fois pour la version « avec placet » (179 à 193 €), une fois pour la
//   version « entièrement tapissée » (267 à 320 €). Le garnissage — un champ
//   de notre propre modèle, pas de la référence Sokoa — distingue les deux
//   combinaisons ; ce n'est pas une collision pour nous, seulement pour le
//   tarif du fournisseur.
//
// CE QUI SE PERD, ASSUMÉ
//   Les dimensions varient de quelques millimètres selon le garnissage.
//   Chaque fiche porte l'intervalle réellement observé.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const GAMME = "Loria";
const CATALOGUE = "catalogue-2026/SOKOA_TARIF 2026_FR.pdf";

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const TISSU = ["Tissu B", "Tissu B+", "Tissu C", "Tissu D"];
const GARN = { NU: "Coque nue", PLACET: "Coque avec placet", TAPISSE: "Coque entièrement tapissée" };
const ORDRE_GARN = [GARN.NU, GARN.PLACET, GARN.TAPISSE];

// Les six coloris de coque, communs à toute la gamme (page 72). Codes NCS
// approchés en hexadécimal pour l'affichage — à corriger si un nuancier
// exact est fourni.
const COQUE = [
  { libelle: "Noir", couleur: "#1a1a1a" },
  { libelle: "Blanc plâtre", couleur: "#f2efe9" },
  { libelle: "Bordeaux", couleur: "#5c1f2e" },
  { libelle: "Vert torrent", couleur: "#3a5744" },
  { libelle: "Rose quartz", couleur: "#d9b3ae" },
  { libelle: "Taupe", couleur: "#8a7d6b" },
];
// Les cinq coloris de piétement outdoor (page 74). Le code est celui du
// tarif — « A » pour Blanc Ciment, etc. — jamais la première lettre du nom,
// qui ne correspond à rien (bug trouvé par le filet de vérification : dériver
// le code depuis le libellé donnait « B » pour Blanc Ciment au lieu de « A »,
// et la référence « LCAB/B » n'existe pas — c'est celle du bois).
const OUTDOOR = [
  { libelle: "Blanc Ciment", code: "A", couleur: "#e8e4da" },
  { libelle: "Vert Foncé", code: "W", couleur: "#3f4f3a" },
  { libelle: "Taupe", code: "T", couleur: "#8a7d6b" },
  { libelle: "Bordeaux Foncé", code: "E", couleur: "#4a1c22" },
  { libelle: "Noir Graphite", code: "P", couleur: "#2b2b2b" },
];

/**
 * Chaque ligne : { ref, prix: nombre ou [B,B+,C,D], page }.
 * `ref` est la référence EXACTE, telle qu'imprimée — jamais recomposée.
 */
const F = { NOIR: "Époxy noir", BLANC: "Époxy blanc", CHROME: "Chromé" };

const METAL = {
  nom: "Chaise et fauteuil 4 pieds métal - Loria",
  piétement: "Quatre pieds métal, finition noir, blanc ou chromé",
  descriptif: "<p>L'assise et le dossier Loria sur un piétement quatre pieds en métal. Coque en polypropylène recyclé, nue, garnie d'un placet ou entièrement tapissée, dans six coloris de coque et trois finitions de piétement.</p>",
  lignes: [
    // NU — page 72, un seul prix, la finition ne le change jamais
    { garn: GARN.NU, produit: "Chaise", finition: F.NOIR, ref: "LCA0/1", prix: 129, page: 72 },
    { garn: GARN.NU, produit: "Chaise", finition: F.BLANC, ref: "LCA0/7", prix: 129, page: 72 },
    { garn: GARN.NU, produit: "Chaise", finition: F.CHROME, ref: "LCA0/4", prix: 129, page: 72 },
    { garn: GARN.NU, produit: "Fauteuil", finition: F.NOIR, ref: "LOA1/1", prix: 159, page: 72 },
    { garn: GARN.NU, produit: "Fauteuil", finition: F.BLANC, ref: "LOA1/7", prix: 159, page: 72 },
    { garn: GARN.NU, produit: "Fauteuil", finition: F.CHROME, ref: "LOA1/4", prix: 159, page: 72 },
    // PLACET — page 72, quatre prix (B/B+/C/D), identiques quelle que soit la finition
    { garn: GARN.PLACET, produit: "Chaise", finition: F.NOIR, ref: "LCB0/1", prix: [179, 182, 185, 193], page: 72 },
    { garn: GARN.PLACET, produit: "Chaise", finition: F.BLANC, ref: "LCB0/7", prix: [179, 182, 185, 193], page: 72 },
    { garn: GARN.PLACET, produit: "Chaise", finition: F.CHROME, ref: "LCB0/4", prix: [179, 182, 185, 193], page: 72 },
    { garn: GARN.PLACET, produit: "Fauteuil", finition: F.NOIR, ref: "LOB1/1", prix: [209, 212, 215, 223], page: 72 },
    { garn: GARN.PLACET, produit: "Fauteuil", finition: F.BLANC, ref: "LOB1/7", prix: [209, 212, 215, 223], page: 72 },
    { garn: GARN.PLACET, produit: "Fauteuil", finition: F.CHROME, ref: "LOB1/4", prix: [209, 212, 215, 223], page: 72 },
    // TAPISSÉ — page 72
    { garn: GARN.TAPISSE, produit: "Chaise", finition: F.NOIR, ref: "LCC0/10", prix: [267, 273, 293, 320], page: 72 },
    { garn: GARN.TAPISSE, produit: "Chaise", finition: F.BLANC, ref: "LCC0/70", prix: [267, 273, 293, 320], page: 72 },
    { garn: GARN.TAPISSE, produit: "Chaise", finition: F.CHROME, ref: "LCC0/40", prix: [267, 273, 293, 320], page: 72 },
    { garn: GARN.TAPISSE, produit: "Fauteuil", finition: F.NOIR, ref: "LOC1/10", prix: [414, 420, 440, 468], page: 72 },
    { garn: GARN.TAPISSE, produit: "Fauteuil", finition: F.BLANC, ref: "LOC1/70", prix: [414, 420, 440, 468], page: 72 },
    { garn: GARN.TAPISSE, produit: "Fauteuil", finition: F.CHROME, ref: "LOC1/40", prix: [414, 420, 440, 468], page: 72 },
  ],
  finitionAxe: { cle: "finitionMetal", nom: "Finition du piétement", ordonne: [F.NOIR, F.BLANC, F.CHROME] },
  dimensions: "<ul><li>Hauteur : de 79,5 à 80,5 cm</li><li>Largeur : de 53,5 à 59 cm</li><li>Profondeur : de 52,5 à 54,5 cm</li></ul>",
};

const BOIS = {
  nom: "Chaise et fauteuil 4 pieds bois - Loria",
  piétement: "Quatre pieds en hêtre massif, finition chêne",
  descriptif: "<p>L'assise et le dossier Loria sur un piétement quatre pieds en hêtre massif, finition chêne. Une seule finition de bois ; six coloris de coque au choix, nue, avec placet ou entièrement tapissée.</p>",
  lignes: [
    // NU — page 72, prix fixe, aucune finition de piétement à choisir
    { garn: GARN.NU, produit: "Chaise", ref: "LCAB/B", prix: 364, page: 72 },
    { garn: GARN.NU, produit: "Fauteuil", ref: "LOA1/B", prix: 394, page: 72 },
    // PLACET
    { garn: GARN.PLACET, produit: "Chaise", ref: "LCBB/B", prix: [414, 417, 420, 428], page: 72 },
    { garn: GARN.PLACET, produit: "Fauteuil", ref: "LOB1/B", prix: [444, 447, 450, 458], page: 72 },
    // TAPISSÉ
    { garn: GARN.TAPISSE, produit: "Chaise", ref: "LCC0/B0", prix: [502, 508, 528, 555], page: 72 },
    { garn: GARN.TAPISSE, produit: "Fauteuil", ref: "LOC1/B0", prix: [649, 655, 675, 703], page: 72 },
  ],
  finitionAxe: null,   // pas de choix de finition : un seul bois, une seule teinte
  dimensions: "<ul><li>Hauteur : de 79,5 à 80,5 cm</li><li>Largeur : de 53,5 à 59 cm</li><li>Profondeur : de 52,5 à 54,5 cm</li></ul>",
};

const OUTDOOR_LIGNES = [];
{
  const REF_NU = { A: 129, W: 129, T: 129, E: 129, P: 129 };          // chaise, page 74
  const REF_NU_O = { A: 159, W: 159, T: 159, E: 159, P: 159 };        // fauteuil
  const PLACET_C = [179, 182, 185, 193];
  const PLACET_O = [209, 212, 215, 223];
  const TAPISSE_C = [267, 273, 293, 320];   // partage LCBB/x avec la version placet — défaut du tarif
  const TAPISSE_O = [414, 420, 440, 468];
  for (const c of OUTDOOR) {
    OUTDOOR_LIGNES.push({ garn: GARN.NU, produit: "Chaise", coloris: c.libelle, ref: `LCAB/${c.code}`, prix: REF_NU[c.code], page: 74 });
    OUTDOOR_LIGNES.push({ garn: GARN.NU, produit: "Fauteuil", coloris: c.libelle, ref: `LOA1/${c.code}`, prix: REF_NU_O[c.code], page: 74 });
    OUTDOOR_LIGNES.push({ garn: GARN.PLACET, produit: "Chaise", coloris: c.libelle, ref: `LCBB/${c.code}`, prix: PLACET_C, page: 74 });
    OUTDOOR_LIGNES.push({ garn: GARN.PLACET, produit: "Fauteuil", coloris: c.libelle, ref: `LOB1/${c.code}`, prix: PLACET_O, page: 74 });
    OUTDOOR_LIGNES.push({ garn: GARN.TAPISSE, produit: "Chaise", coloris: c.libelle, ref: `LCBB/${c.code}`, prix: TAPISSE_C, page: 74 });
    OUTDOOR_LIGNES.push({ garn: GARN.TAPISSE, produit: "Fauteuil", coloris: c.libelle, ref: `LOC1/${c.code}`, prix: TAPISSE_O, page: 74 });
  }
}
const OUTDOOR_FICHE = {
  nom: "Chaise et fauteuil 4 pieds Outdoor - Loria",
  piétement: "Quatre pieds en polypropylène recyclé, usage extérieur (coque non tapissée uniquement)",
  descriptif: "<p>La version extérieure de Loria : piétement et coque en polypropylène recyclé, garantis pour un usage en terrasse. Cinq coloris de piétement, six coloris de coque — seule la version non tapissée est utilisable dehors, les versions garnies restent des sièges d'intérieur.</p>",
  lignes: OUTDOOR_LIGNES,
  // Pas de finitionAxe ici : le coloris du piétement outdoor est créé par un
  // bloc dédié, en pastilles colorées. Le déclarer aussi ici le créait deux
  // fois, et la contrainte d'unicité (vitrineId, cle) a — à raison — refusé
  // la seconde en plein milieu de l'écriture.
  finitionAxe: null,
  dimensions: "<ul><li>Hauteur : de 79,5 à 80 cm</li><li>Largeur : de 53,5 à 59 cm</li><li>Profondeur : de 52,5 à 54,5 cm</li></ul>",
  avertissement: "<p><strong>Attention à la commande.</strong> Le catalogue Sokoa imprime la même référence pour la coque avec placet et la coque entièrement tapissée (de 179 à 320 € selon le tissu). La version doit être précisée en clair sur la commande.</p>",
};

const GIRATOIRE = {
  nom: "Chaise et fauteuil giratoire - Loria",
  piétement: "Base pyramidale 4 branches en polyamide, sur roulettes sol dur ø65 ou sur patins",
  descriptif: "<p>La version giratoire de Loria, sur base pyramidale quatre branches. Roulettes pour sol dur ou patins, en noir ou blanc — idéale autour d'une table de réunion.</p>",
  lignes: [
    // NU — page 73 : un prix par (finition, base)
    { garn: GARN.NU, produit: "Chaise", finition: F.NOIR, base: "Roulettes", ref: "LCJ0/1", prix: 224, page: 73 },
    { garn: GARN.NU, produit: "Chaise", finition: F.NOIR, base: "Patins", ref: "LCJ0/1", prix: 232, page: 73 },
    { garn: GARN.NU, produit: "Chaise", finition: F.BLANC, base: "Roulettes", ref: "LCJ0/7", prix: 224, page: 73 },
    { garn: GARN.NU, produit: "Chaise", finition: F.BLANC, base: "Patins", ref: "LCJ0/7", prix: 238, page: 73 },
    { garn: GARN.NU, produit: "Fauteuil", finition: F.NOIR, base: "Roulettes", ref: "LOJ1/1", prix: 254, page: 73 },
    { garn: GARN.NU, produit: "Fauteuil", finition: F.NOIR, base: "Patins", ref: "LOJ1/1", prix: 262, page: 73 },
    { garn: GARN.NU, produit: "Fauteuil", finition: F.BLANC, base: "Roulettes", ref: "LOJ1/7", prix: 254, page: 73 },
    { garn: GARN.NU, produit: "Fauteuil", finition: F.BLANC, base: "Patins", ref: "LOJ1/7", prix: 268, page: 73 },
    // PLACET
    { garn: GARN.PLACET, produit: "Chaise", finition: F.NOIR, base: "Roulettes", ref: "LCK0/1", prix: [274, 277, 280, 288], page: 73 },
    { garn: GARN.PLACET, produit: "Chaise", finition: F.NOIR, base: "Patins", ref: "LCK0/1", prix: [282, 285, 288, 296], page: 73 },
    { garn: GARN.PLACET, produit: "Chaise", finition: F.BLANC, base: "Roulettes", ref: "LCK0/7", prix: [274, 277, 280, 288], page: 73 },
    { garn: GARN.PLACET, produit: "Chaise", finition: F.BLANC, base: "Patins", ref: "LCK0/7", prix: [288, 291, 294, 302], page: 73 },
    { garn: GARN.PLACET, produit: "Fauteuil", finition: F.NOIR, base: "Roulettes", ref: "LOK1/1", prix: [304, 307, 310, 318], page: 73 },
    { garn: GARN.PLACET, produit: "Fauteuil", finition: F.NOIR, base: "Patins", ref: "LOK1/1", prix: [312, 315, 318, 326], page: 73 },
    { garn: GARN.PLACET, produit: "Fauteuil", finition: F.BLANC, base: "Roulettes", ref: "LOK1/7", prix: [304, 307, 310, 318], page: 73 },
    { garn: GARN.PLACET, produit: "Fauteuil", finition: F.BLANC, base: "Patins", ref: "LOK1/7", prix: [318, 321, 324, 332], page: 73 },
    // TAPISSÉ — pas de coloris de COQUE ici (référence porte déjà /000 ou
    // /010, sans « +coloris* » : la coque est cachée par le tissu). La
    // finition de la BASE (noir/blanc), elle, reste un axe à part entière —
    // c'est le chiffre même de la référence (10 = noir, 70 = blanc) qui le
    // dit. Les deux confondre a produit une collision : le garde-fou avait
    // raison de refuser d'écrire.
    { garn: GARN.TAPISSE, produit: "Chaise", finition: F.NOIR, base: "Roulettes", ref: "LCL0/10", prix: [362, 368, 388, 415], page: 73 },
    { garn: GARN.TAPISSE, produit: "Chaise", finition: F.NOIR, base: "Patins", ref: "LCL0/10", prix: [370, 376, 396, 423], page: 73 },
    { garn: GARN.TAPISSE, produit: "Chaise", finition: F.BLANC, base: "Roulettes", ref: "LCL0/70", prix: [362, 368, 388, 415], page: 73 },
    { garn: GARN.TAPISSE, produit: "Chaise", finition: F.BLANC, base: "Patins", ref: "LCL0/70", prix: [378, 382, 402, 429], page: 73 },
    { garn: GARN.TAPISSE, produit: "Fauteuil", finition: F.NOIR, base: "Roulettes", ref: "LOL1/10", prix: [509, 515, 535, 563], page: 73 },
    { garn: GARN.TAPISSE, produit: "Fauteuil", finition: F.NOIR, base: "Patins", ref: "LOL1/10", prix: [517, 523, 543, 571], page: 73 },
    { garn: GARN.TAPISSE, produit: "Fauteuil", finition: F.BLANC, base: "Roulettes", ref: "LOL1/70", prix: [509, 515, 535, 563], page: 73 },
    { garn: GARN.TAPISSE, produit: "Fauteuil", finition: F.BLANC, base: "Patins", ref: "LOL1/70", prix: [523, 529, 549, 577], page: 73 },
  ],
  finitionAxe: { cle: "finitionMetal", nom: "Finition de la base", ordonne: [F.NOIR, F.BLANC] },
  baseAxe: { cle: "base", nom: "Roulettes ou patins", ordonne: ["Roulettes", "Patins"] },
  dimensions: "<ul><li>Hauteur : de 79 à 82 cm</li><li>Largeur : de 53,5 à 59 cm</li><li>Profondeur : 52,5 cm</li></ul>",
};

const HAUTE = {
  nom: "Chaise haute et tabouret pieds métal - Loria",
  piétement: "Piétement haut métal, finition époxy noir ou chromé",
  descriptif: "<p>La déclinaison haute de Loria : une chaise haute avec dossier ou un tabouret sans dossier, sur un piétement métal assorti. Coque nue, avec placet ou entièrement tapissée, dans six coloris de coque.</p>",
  lignes: [
    { garn: GARN.NU, produit: "Chaise haute", finition: F.NOIR, ref: "LCHA/1", prix: 246, page: 75 },
    { garn: GARN.NU, produit: "Chaise haute", finition: F.CHROME, ref: "LCHA/4", prix: 246, page: 75 },
    { garn: GARN.NU, produit: "Tabouret", finition: F.NOIR, ref: "LOHA/1", prix: 276, page: 75 },
    { garn: GARN.NU, produit: "Tabouret", finition: F.CHROME, ref: "LOHA/4", prix: 276, page: 75 },
    { garn: GARN.PLACET, produit: "Chaise haute", finition: F.NOIR, ref: "LCHB/1", prix: [296, 299, 302, 310], page: 75 },
    { garn: GARN.PLACET, produit: "Chaise haute", finition: F.CHROME, ref: "LCHB/4", prix: [296, 299, 302, 310], page: 75 },
    { garn: GARN.PLACET, produit: "Tabouret", finition: F.NOIR, ref: "LOHB/1", prix: [326, 329, 332, 340], page: 75 },
    { garn: GARN.PLACET, produit: "Tabouret", finition: F.CHROME, ref: "LOHB/4", prix: [326, 329, 332, 340], page: 75 },
    { garn: GARN.TAPISSE, produit: "Chaise haute", finition: F.NOIR, ref: "LCHC/1", prix: [384, 390, 410, 437], page: 75 },
    { garn: GARN.TAPISSE, produit: "Chaise haute", finition: F.CHROME, ref: "LCHC/4", prix: [384, 390, 410, 437], page: 75 },
    { garn: GARN.TAPISSE, produit: "Tabouret", finition: F.NOIR, ref: "LOHC/1", prix: [472, 480, 495, 535], page: 75 },
    { garn: GARN.TAPISSE, produit: "Tabouret", finition: F.CHROME, ref: "LOHC/4", prix: [472, 480, 495, 535], page: 75 },
  ],
  finitionAxe: { cle: "finitionMetal", nom: "Finition du piétement", ordonne: [F.NOIR, F.CHROME] },
  modeleAxe: { cle: "modele", nom: "Modèle", ordonne: ["Chaise haute", "Tabouret"] },
  dimensions: "<ul><li>Hauteur : de 98 à 109 cm</li><li>Largeur : de 51 à 56 cm</li><li>Profondeur : 51 cm</li></ul>",
};


// ── Le découpage : un bloc du tarif = un produit ──────────────────────
//
// Et « Chaise et fauteuil X » se coupe en deux : une chaise et un fauteuil
// s'achètent séparément, ce ne sont pas deux options d'un même article.
// Les vingt-quatre blocs du tarif donnent ainsi trente-six fiches.
//
// Ce qui reste DANS une fiche, ce sont les finitions au sens strict : la
// couleur du piétement, celle de la coque, la catégorie de tissu. Rien qui
// change le meuble, seulement son habillage.
const SUFFIXE_GARN = {
  [GARN.NU]: "coque PP",
  [GARN.PLACET]: "coque PP avec placet assise tapissé",
  [GARN.TAPISSE]: "coque PP entièrement tapissée",
};

const FAMILLES = [
  { ...METAL, cle: "metal", nomDe: (l) => `${l.produit} 4 pieds métal, ${SUFFIXE_GARN[l.garn]} - Loria` },
  { ...BOIS, cle: "bois", nomDe: (l) => `${l.produit} 4 pieds bois, ${SUFFIXE_GARN[l.garn]} - Loria` },
  { ...OUTDOOR_FICHE, cle: "outdoor", nomDe: (l) => `${l.produit} 4 pieds PP, ${SUFFIXE_GARN[l.garn]} - Loria` },
  { ...GIRATOIRE, cle: "giratoire", nomDe: (l) => `${l.produit} giratoire sur ${l.base.toLowerCase()}, ${SUFFIXE_GARN[l.garn]} - Loria` },
  { ...HAUTE, cle: "haute", nomDe: (l) => `${l.produit} pieds métal, ${SUFFIXE_GARN[l.garn]} - Loria` },
];

/** Les fiches, une par bloc du tarif, chaise et fauteuil séparés. */
function construireFiches() {
  const fiches = new Map();
  for (const fam of FAMILLES) {
    for (const l of fam.lignes) {
      const nom = fam.nomDe(l);
      if (!fiches.has(nom)) {
        fiches.set(nom, {
          nom, famille: fam, garn: l.garn, produit: l.produit, base: l.base || null,
          lignes: [], combinaisons: [], vues: new Map(), collisions: [],
        });
      }
      fiches.get(nom).lignes.push(l);
    }
  }
  return [...fiches.values()];
}

// ── Le filet : chaque prix cité doit apparaître sur sa page ────────────
async function verifierContrePdf() {
  console.log("Relecture du PDF pour vérifier chaque prix cité...");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync(CATALOGUE)), useSystemFonts: true }).promise;
  const texteParPage = new Map();
  for (const p of [72, 73, 74, 75]) {
    const t = await (await doc.getPage(p)).getTextContent();
    texteParPage.set(p, t.items.map((i) => i.str).join(" "));
  }

  const attendu = new Map();
  for (const fam of FAMILLES) {
    for (const l of fam.lignes) {
      const prix = Array.isArray(l.prix) ? l.prix : [l.prix];
      if (!attendu.has(l.page)) attendu.set(l.page, new Map());
      const m = attendu.get(l.page);
      for (const p of prix) m.set(p, (m.get(p) || 0) + 1);
    }
  }

  const manques = [];
  for (const [page, m] of attendu) {
    const texte = texteParPage.get(page) || "";
    for (const [nombre, compteAttendu] of m) {
      const vus = texte.split(new RegExp(`(?<![\\d.,])${nombre}(?![\\d.,])`)).length - 1;
      if (vus < compteAttendu) manques.push(`page ${page} : « ${nombre} » attendu ${compteAttendu}x, trouvé ${vus}x`);
    }
  }
  return manques;
}

// ── Où va chaque visuel déjà en place ─────────────────────────────────
//
// Les visuels ont été déplacés une fois par la version précédente de ce
// script, qui regroupait trop. Leur adresse Cloudinary garde le dossier
// d'origine — « …/chaise-et-fauteuil-4-pieds-metal-coque-pp-avec-place-sihf/
// lcb0-01-jpg.jpg » — et le nom de fichier garde la racine de référence.
// Le dossier donne le piétement et le garnissage, la racine donne chaise ou
// fauteuil. Un visuel qu'on ne sait pas router est signalé, jamais posé au
// hasard.
function routerVisuel(url) {
  const morceaux = url.split("/");
  const fichier = (morceaux.pop() || "").toLowerCase();
  const dossier = (morceaux.pop() || "").toLowerCase();

  const garn = /entierement-tapissee/.test(dossier) ? GARN.TAPISSE
    : /avec-placet/.test(dossier) ? GARN.PLACET : GARN.NU;

  if (/tabouret/.test(dossier)) return `Tabouret pieds métal, ${SUFFIXE_GARN[garn]} - Loria`;
  if (/haute/.test(dossier)) return `Chaise haute pieds métal, ${SUFFIXE_GARN[garn]} - Loria`;

  // Chaise ou fauteuil : la deuxième lettre de la racine (LC… / LO…).
  const racine = fichier.slice(0, 4);
  if (!/^l[co]/.test(racine)) return null;
  const produit = racine[1] === "c" ? "Chaise" : "Fauteuil";

  if (/giratoire/.test(dossier)) {
    const base = /patins/.test(dossier) ? "patins" : "roulettes";
    return `${produit} giratoire sur ${base}, ${SUFFIXE_GARN[garn]} - Loria`;
  }
  if (/4-pieds-metal/.test(dossier)) return `${produit} 4 pieds métal, ${SUFFIXE_GARN[garn]} - Loria`;
  if (/4-pieds-bois/.test(dossier)) return `${produit} 4 pieds bois, ${SUFFIXE_GARN[garn]} - Loria`;
  if (/4-pieds-pp/.test(dossier)) return `${produit} 4 pieds PP, ${SUFFIXE_GARN[garn]} - Loria`;
  return null;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const manques = await verifierContrePdf();
  if (manques.length) {
    titre("VÉRIFICATION ÉCHOUÉE — RIEN NE SERA ÉCRIT");
    console.log("\n   Un prix cité dans ce script ne se retrouve pas sur la page indiquée.");
    console.log("   C'est le signe d'une faute de recopie : mieux vaut s'arrêter ici.\n");
    for (const m of manques.slice(0, 20)) console.log(`   ${m}`);
    process.exitCode = 1;
    return;
  }
  console.log("   ✓ chaque prix cité a été retrouvé sur sa page.\n");

  const gamme = await prisma.gamme.findFirst({
    where: { nom: GAMME },
    select: {
      id: true,
      vitrines: {
        orderBy: { nom: "asc" },
        select: {
          id: true, nom: true, publie: true,
          visuels: { select: { id: true, url: true } },
        },
      },
    },
  });
  if (!gamme) { console.error(`Gamme ${GAMME} introuvable.`); process.exitCode = 1; return; }

  const fiches = construireFiches();

  // ── Les combinaisons de chaque fiche ────────────────────────────────
  let totalCombos = 0;
  const collisionsTotal = [];
  for (const f of fiches) {
    for (const l of f.lignes) {
      // Le garnissage, le produit et la base identifient désormais la FICHE :
      // ils ne sont plus des axes à l'intérieur.
      const socle = {};
      if (l.finition) socle.finitionMetal = l.finition;
      if (l.coloris) socle.coloris = l.coloris;

      const prixListe = Array.isArray(l.prix) ? l.prix : [l.prix];
      const tissus = prixListe.length === 4 ? TISSU : [null];
      prixListe.forEach((prix, i) => {
        const v = tissus[i] ? { ...socle, tissu: tissus[i] } : { ...socle };
        const empreinte = empreinteDe(v);
        if (f.vues.has(empreinte)) {
          f.collisions.push({ a: f.vues.get(empreinte), b: `${l.ref} (${prix} €)`, valeurs: v });
          return;
        }
        f.vues.set(empreinte, `${l.ref} (${prix} €)`);
        f.combinaisons.push({ valeurs: v, empreinte, prixTarifHT: prix, referenceBase: l.ref, pageCatalogue: l.page });
      });
    }
    totalCombos += f.combinaisons.length;
    collisionsTotal.push(...f.collisions);
  }

  // ── Où va chaque visuel ─────────────────────────────────────────────
  const parNom = new Map(fiches.map((f) => [f.nom, f]));
  for (const f of fiches) f.visuelsAPoser = [];
  const visuelsPerdus = [];
  for (const v of gamme.vitrines) {
    for (const img of v.visuels) {
      const cible = routerVisuel(img.url);
      if (cible && parNom.has(cible)) parNom.get(cible).visuelsAPoser.push(img);
      else visuelsPerdus.push({ url: img.url, cible });
    }
  }

  titre("LES FICHES QU'ON OBTIENDRAIT");
  for (const fam of FAMILLES) {
    const siennes = fiches.filter((f) => f.famille.cle === fam.cle);
    console.log(`\n   ── ${fam.piétement}`);
    for (const f of siennes) {
      const prix = f.combinaisons.map((c) => c.prixTarifHT);
      const p = Math.min(...prix) === Math.max(...prix)
        ? `${Math.min(...prix)} €`
        : `${Math.min(...prix)} à ${Math.max(...prix)} €`;
      console.log(`      ${f.nom.replace(" - Loria", "").padEnd(52)} ${String(f.combinaisons.length).padStart(2)} var. · ${p.padStart(12)}${f.visuelsAPoser.length ? ` · ${f.visuelsAPoser.length} img` : ""}`);
    }
  }

  if (collisionsTotal.length) {
    titre("DEUX PRIX POUR UNE MÊME CONFIGURATION — RIEN NE SERA ÉCRIT");
    for (const c of collisionsTotal.slice(0, 12)) {
      console.log(`   ${c.a}  ≠  ${c.b}`);
      console.log(`      ${JSON.stringify(c.valeurs)}`);
    }
    process.exitCode = 1;
    return;
  }

  if (visuelsPerdus.length) {
    titre("VISUELS QU'ON NE SAIT PAS ROUTER");
    console.log("");
    for (const v of visuelsPerdus) console.log(`   ${v.url.split("/").slice(-2).join("/")}  →  ${v.cible || "illisible"}`);
    console.log("\n   Ils resteront où ils sont plutôt que d'être posés au hasard.");
  }

  titre("LE COMPTE");
  const visuelsRoutes = fiches.reduce((n, f) => n + f.visuelsAPoser.length, 0);
  console.log(`   ${fiches.length} fiches · ${totalCombos} variantes · ${visuelsRoutes} visuels routés`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  // ── Écriture ────────────────────────────────────────────────────────
  titre("ÉCRITURE");
  const reprises = new Set();
  for (const f of fiches) {
    const existante = gamme.vitrines.find((v) => v.nom === f.nom);
    const sections = [
      { titre: "Piétement", contenu: `<p>${f.famille.piétement}</p>` },
      { titre: "Dimensions", contenu: f.famille.dimensions },
      ...(f.famille.avertissement ? [{ titre: "Bon à savoir", contenu: f.famille.avertissement }] : []),
    ];
    const descriptif = `<p>${f.produit} Loria, ${SUFFIXE_GARN[f.garn].replace("coque PP", "coque en polypropylène recyclé")}${f.base ? `, base giratoire sur ${f.base.toLowerCase()}` : ""}. ${f.famille.piétement}.</p>`;

    let id;
    if (existante) {
      id = existante.id;
      reprises.add(id);
      await prisma.choix.deleteMany({ where: { vitrineId: id } });
      await prisma.combinaison.deleteMany({ where: { vitrineId: id } });
      await prisma.produitVitrine.update({
        where: { id },
        data: { nom: f.nom, slug: slug(f.nom), publie: true, descriptif, sectionsDevis: sections },
      });
    } else {
      const neuve = await prisma.produitVitrine.create({
        data: { nom: f.nom, slug: slug(f.nom), publie: true, gammeId: gamme.id, descriptif, sectionsDevis: sections },
      });
      id = neuve.id;
      reprises.add(id);
    }

    let ordre = 0;
    const ajouter = async (cle, nom, ordonne, nature, rendu = "boutons", pastilles = null) => {
      const vues = [...new Set(f.combinaisons.map((c) => c.valeurs[cle]).filter(Boolean))];
      if (vues.length < 2) return;
      const vals = ordonne ? ordonne.filter((x) => vues.includes(x)) : vues.sort();
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: id, cle, nom, nature, rendu, ordre, origine: "editorial",
          valeurs: {
            create: vals.map((libelle, i) => {
              const p = pastilles?.find((x) => x.libelle === libelle);
              return { libelle, ordre: i, ...(p ? { couleur: p.couleur, suffixeReference: "" } : {}) };
            }),
          },
        },
      });
    };

    await ajouter("finitionMetal", f.famille.finitionAxe?.nom || "Finition du piétement",
      f.famille.finitionAxe?.ordonne, "finition");
    await ajouter("coloris", "Coloris du piétement", OUTDOOR.map((c) => c.libelle), "finition", "pastilles", OUTDOOR);
    await ajouter("tissu", "Tissu", TISSU, "tarifaire");

    // Le coloris de coque ne se pose que si la coque se voit : sur une
    // version entièrement tapissée, le tissu la recouvre. (Le tarif l'imprime
    // tout de même pour la chaise haute tapissée — seul bloc sur six dans ce
    // cas ; on suit la règle générale et la question part au fournisseur.)
    if (f.garn !== GARN.TAPISSE) {
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: id, cle: "coque", nom: "Coloris de la coque",
          nature: "finition", rendu: "pastilles", ordre, origine: "tarif",
          valeurs: { create: COQUE.map((c, i) => ({ libelle: c.libelle, couleur: c.couleur, ordre: i, suffixeReference: "" })) },
        },
      });
    }

    await prisma.combinaison.createMany({ data: f.combinaisons.map((c) => ({ ...c, vitrineId: id })) });

    for (const [i, img] of f.visuelsAPoser.entries()) {
      await prisma.visuel.update({ where: { id: img.id }, data: { vitrineId: id, ordre: i } });
    }
  }
  console.log(`   ${fiches.length} fiches écrites.`);

  const autres = gamme.vitrines.filter((v) => !reprises.has(v.id));
  if (autres.length) {
    await prisma.produitVitrine.updateMany({
      where: { id: { in: autres.map((v) => v.id) } },
      data: { publie: false, accessoireSeul: true },
    });
    console.log(`   ${autres.length} anciennes fiches dépubliées (conservées, non détruites).`);
  }

  titre("CONTRÔLE");
  const pub = await prisma.produitVitrine.count({ where: { gamme: { nom: GAMME }, publie: true } });
  const comb = await prisma.combinaison.count({ where: { vitrine: { gamme: { nom: GAMME }, publie: true } } });
  const sansPrix = await prisma.combinaison.count({ where: { vitrine: { gamme: { nom: GAMME }, publie: true }, prixTarifHT: null } });
  const sansImg = await prisma.produitVitrine.count({ where: { gamme: { nom: GAMME }, publie: true, visuels: { none: {} } } });
  console.log(`   fiches publiées : ${pub} · variantes : ${comb} · sans prix : ${sansPrix} · sans visuel : ${sansImg}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
