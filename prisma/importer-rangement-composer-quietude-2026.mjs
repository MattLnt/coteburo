// La fiche composée des pages 238-239 : « RANGEMENTS à composer ».
//
//   node prisma/importer-rangement-composer-quietude-2026.mjs
//   node prisma/importer-rangement-composer-quietude-2026.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// CE QUE LES PAGES 238-239 VENDENT
//   Un rangement que le client compose, et qui part en quatre références au
//   plus : la structure, le top, les portes, les poignées. Le tarif donne
//   deux exemples de commande, et ils bornent le produit :
//
//     p.238  Rangement à composer H 201 / L 100 cm, 4 tablettes métal
//            dossiers suspendus, décor imitation Timber = BH843 + M
//     p.239  2 portes battantes pour rangement H 104 cm, L 80 cm, décor
//            Argile et 2 poignées type C Aluminium = EH793 + X et BA00 + 1K
//
//   Le premier ne commande qu'une référence — à H 201 le top n'est pas
//   obligatoire et il n'a pris ni portes ni poignées. Le second en commande
//   deux. La fiche doit donc savoir n'en poser qu'une, ou quatre.
//
// LA HAUTEUR DE CAISSE ET LA HAUTEUR FINIE
//   Les structures s'appellent H 69,5 / 101,5 / 133,5 / 201 ; les portes
//   « pour rangement H 72 / 104 / 136 / 201 ». L'écart est constant :
//
//     72,0 − 69,5  = 2,5     top obligatoire
//    104,0 − 101,5 = 2,5     top obligatoire
//    136,0 − 133,5 = 2,5     top obligatoire
//    201,0 − 201,0 = 0       top NON obligatoire
//
//   C'est l'épaisseur du top, et il est obligatoire exactement sur les trois
//   hauteurs qui gagnent 2,5 cm. Le tarif ne nomme donc pas deux fois la même
//   chose : il nomme la caisse d'un côté, le meuble fini de l'autre.
//
// CE QU'ON LAISSE DEHORS, ET POURQUOI
//   · Les tops communs BJ083 (L 160), BJ103 (L 200) et BJ093 (L 240)
//     couvrent DEUX ou TROIS meubles juxtaposés. Les proposer ici
//     laisserait acheter un plateau de 240 cm pour un meuble de 80. Ils
//     restent sur la fiche « Top pour rangement ».
//   · La ligne DR163 / DR173, « ouvert pour bibliothèque à portes basses »,
//     est déjà vendue sous « Bibliothèque ouverte - Quiétude ». En faire une
//     huitième structure donnerait deux fiches pour une ligne de tarif.
//
// LES DÉCORS, DEUX LISTES
//   La page 238 en donne huit pour les structures et les tops, Hêtre compris.
//   La page 239 en donne douze pour les portes : les huit, plus Horizon,
//   Pêche, Sauge et Ombre. On suit chaque page pour son bloc.
//
//   Attention : la page 241, celle de l'alcôve, n'en a que sept — elle omet
//   le Hêtre. Les deux fiches composées ne partagent donc pas leurs décors.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PDF = "catalogue-2026/catalogue_buronomic_2026_fr.pdf";
const PAGES = [238, 239];
const NOM = "Rangements à composer - Quiétude";
const SLUG = "rangements-a-composer-quietude";
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);

const AVEC_TOP = "Avec top de finition";
const SANS_TOP = "Sans top";
const AVEC_PORTES = "Avec portes battantes";
const SANS_PORTES = "Sans portes";
const CLASSIQUES = "Poignées classiques";
const DESIGN = "Poignées design";

// ── ① Les structures. topImpose vient du tarif, pas d'une déduction. ─────
const STRUCTURES = [
  { libelle: "H 69,5 cm — 1 tablette mélaminé", hauteurPorte: "72",
    topImpose: true,
    L80: { ref: "BH693", prix: 150, eco: 4.09 }, L100: { ref: "BH703", prix: 180, eco: 4.62 } },
  { libelle: "H 101,5 cm — 2 tablettes mélaminé", hauteurPorte: "104",
    topImpose: true,
    L80: { ref: "BH733", prix: 260, eco: 7.07 }, L100: { ref: "BH743", prix: 305, eco: 8.4 } },
  { libelle: "H 101,5 cm — 2 tablettes métal dossiers suspendus", hauteurPorte: "104",
    topImpose: true,
    L80: { ref: "BH753", prix: 300, eco: 6.19 }, L100: { ref: "BH763", prix: 345, eco: 7.41 } },
  { libelle: "H 133,5 cm — 3 tablettes mélaminé", hauteurPorte: "136",
    topImpose: true,
    L80: { ref: "BH773", prix: 310, eco: 9.31 }, L100: { ref: "BH783", prix: 355, eco: 11.23 } },
  { libelle: "H 133,5 cm — 3 tablettes métal dossiers suspendus", hauteurPorte: "136",
    topImpose: true,
    L80: { ref: "BH793", prix: 365, eco: 7.92 }, L100: { ref: "BH803", prix: 410, eco: 9.56 } },
  { libelle: "H 201 cm — 4 tablettes mélaminé", hauteurPorte: "201",
    topImpose: false,
    L80: { ref: "BH813", prix: 405, eco: 12.58 }, L100: { ref: "BH823", prix: 455, eco: 14.82 } },
  { libelle: "H 201 cm — 4 tablettes métal dossiers suspendus", hauteurPorte: "201",
    topImpose: false,
    L80: { ref: "BH833", prix: 485, eco: 10.83 }, L100: { ref: "BH843", prix: 535, eco: 12.84 } },
];

// ── ② Le top, pour UN meuble ─────────────────────────────────────────────
const TOP = {
  L80: { ref: "BH713", prix: 55, eco: 1.31 },
  L100: { ref: "BH723", prix: 65, eco: 1.63 },
};

// ── ③ Les portes, par hauteur finie ──────────────────────────────────────
const PORTES = {
  "72": { L80: { ref: "EH783", prix: 140, eco: 1.27 }, L100: { ref: "EH823", prix: 165, eco: 1.6 } },
  "104": { L80: { ref: "EH793", prix: 160, eco: 1.9 }, L100: { ref: "EH833", prix: 175, eco: 2.34 } },
  "136": { L80: { ref: "EH803", prix: 185, eco: 2.57 }, L100: { ref: "EH843", prix: 200, eco: 2.98 } },
  "201": { L80: { ref: "EH813", prix: 200, eco: 3.9 }, L100: { ref: "EH853", prix: 255, eco: 4.52 } },
};

// ── ④ Les poignées ───────────────────────────────────────────────────────
const POIGNEES = {
  [CLASSIQUES]: { ref: "BA00", prix: 15, eco: 0.09 },
  [DESIGN]: { ref: "DX21", prix: 20, eco: 0.09 },
};

// ── Les décors ───────────────────────────────────────────────────────────
// Page 238 : structures, tablettes et tops.
const DECOR_CAISSON = [
  { libelle: "Blanc", suffixeReference: "S", couleur: "#f2f0ec" },
  { libelle: "Argile", suffixeReference: "X", couleur: "#a08d7c" },
  { libelle: "Noir", suffixeReference: "G", couleur: "#23262a" },
  { libelle: "Hêtre", suffixeReference: "A", couleur: "#d8b183" },
  { libelle: "Chêne fil", suffixeReference: "N", couleur: "#c9a876" },
  { libelle: "Nebraska", suffixeReference: "F", couleur: "#b89b73" },
  { libelle: "Timber", suffixeReference: "M", couleur: "#8a6a4a" },
  { libelle: "Yukon", suffixeReference: "Y", couleur: "#6e5b4a" },
];
// Page 239 : les portes ajoutent quatre teintes.
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

const CHOIX = [
  { cle: "modele", nom: "Structure", nature: "tarifaire", rendu: "liste", ordre: 0,
    element: null, rangReference: null,
    valeurs: STRUCTURES.map((s) => ({ libelle: s.libelle })) },
  { cle: "largeur", nom: "Largeur", nature: "tarifaire", rendu: "boutons", ordre: 1,
    element: null, rangReference: null,
    valeurs: [{ libelle: "80 cm" }, { libelle: "100 cm" }] },
  { cle: "top", nom: "Top de finition", nature: "tarifaire", rendu: "boutons", ordre: 2,
    element: null, rangReference: null,
    valeurs: [{ libelle: AVEC_TOP }, { libelle: SANS_TOP }] },
  { cle: "portes", nom: "Portes", nature: "tarifaire", rendu: "boutons", ordre: 3,
    element: null, rangReference: null,
    valeurs: [{ libelle: AVEC_PORTES }, { libelle: SANS_PORTES }] },
  { cle: "poignees", nom: "Poignées", nature: "tarifaire", rendu: "boutons", ordre: 4,
    element: null, rangReference: null,
    valeurs: [{ libelle: CLASSIQUES }, { libelle: DESIGN }] },
  { cle: "decor-structure", nom: "Décor du rangement", nature: "finition", rendu: "pastilles", ordre: 5,
    element: "structure", rangReference: 0, valeurs: DECOR_CAISSON },
  { cle: "decor-top", nom: "Décor du top", nature: "finition", rendu: "pastilles", ordre: 6,
    element: "top", rangReference: 0, valeurs: DECOR_CAISSON },
  { cle: "decor-portes", nom: "Décor des portes", nature: "finition", rendu: "pastilles", ordre: 7,
    element: "portes", rangReference: 0, valeurs: DECOR_PORTES },
  { cle: "finition-poignee", nom: "Finition de la poignée", nature: "finition", rendu: "pastilles", ordre: 8,
    element: "poignees", rangReference: 0, valeurs: FINITION_POIGNEE },
];

/** Les combinaisons, et les éléments que chacune commande. */
function combinaisons() {
  const out = [];
  for (const s of STRUCTURES) {
    for (const largeur of ["80 cm", "100 cm"]) {
      const cle = largeur === "80 cm" ? "L80" : "L100";
      // Le top : imposé sous H 201, au choix à H 201.
      const tops = s.topImpose ? [true] : [true, false];
      for (const avecTop of tops) {
        for (const portes of [SANS_PORTES, AVEC_PORTES]) {
          const poigneesPossibles = portes === AVEC_PORTES ? [CLASSIQUES, DESIGN] : [null];
          for (const poignee of poigneesPossibles) {
            const elements = [
              { cle: "structure", designation: `Rangement ouvert ${s.libelle}`,
                referenceBase: s[cle].ref, prixTarifHT: s[cle].prix, ecoContribution: s[cle].eco },
            ];
            if (avecTop) {
              elements.push({ cle: "top", designation: `Top de finition L ${largeur.replace(" cm", "")} cm`,
                referenceBase: TOP[cle].ref, prixTarifHT: TOP[cle].prix, ecoContribution: TOP[cle].eco });
            }
            if (portes === AVEC_PORTES) {
              const p = PORTES[s.hauteurPorte][cle];
              elements.push({ cle: "portes", designation: "Jeu de 2 portes battantes",
                referenceBase: p.ref, prixTarifHT: p.prix, ecoContribution: p.eco });
              const g = POIGNEES[poignee];
              elements.push({ cle: "poignees", designation: `Lot de 2 ${poignee.toLowerCase()}`,
                referenceBase: g.ref, prixTarifHT: g.prix, ecoContribution: g.eco });
            }
            const valeurs = { modele: s.libelle, largeur, top: avecTop ? AVEC_TOP : SANS_TOP, portes };
            if (poignee) valeurs.poignees = poignee;
            out.push({
              valeurs, elements,
              prixTarifHT: elements.reduce((a, e) => a + e.prixTarifHT, 0),
              ecoContribution: Number(elements.reduce((a, e) => a + e.ecoContribution, 0).toFixed(2)),
            });
          }
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

  // ── Le filet : toute référence posée est sur l'une des deux pages ────
  titre("VÉRIFICATION CONTRE LE TARIF");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync(PDF)), useSystemFonts: true }).promise;
  const textes = [];
  for (const n of PAGES) textes.push(await textePage(doc, n));
  const ensemble = textes.join(" ");

  const refs = [...new Set(combis.flatMap((c) => c.elements.map((e) => e.referenceBase)))].sort();
  let manquantes = 0;
  console.log(`   pages ${PAGES.join(", ")} — ${refs.length} références`);
  for (const r of refs) if (!ensemble.includes(r)) { console.log(`      ABSENTE : ${r}`); manquantes++; }
  if (manquantes) {
    titre(`${manquantes} RÉFÉRENCES INTROUVABLES — RIEN NE SERA ÉCRIT`);
    process.exitCode = 1;
    return;
  }
  console.log("   toutes retrouvées");

  // ── Les deux exemples de commande du tarif, rejoués ──────────────────
  titre("LES EXEMPLES DU TARIF, REJOUÉS");
  const jeton = (cle, lib) => CHOIX.find((c) => c.cle === cle).valeurs.find((v) => v.libelle === lib).suffixeReference;

  // p.238 — H 201 / L 100, 4 tablettes métal, Timber, sans top ni portes.
  const ex1 = combis.find((k) => k.valeurs.modele.includes("4 tablettes métal")
    && k.valeurs.largeur === "100 cm" && k.valeurs.top === SANS_TOP && k.valeurs.portes === SANS_PORTES);
  const obtenu1 = ex1 ? [ex1.elements[0].referenceBase + jeton("decor-structure", "Timber")] : [];
  console.log(`   p.238  tarif    : BH843M`);
  console.log(`          la fiche : ${obtenu1.join(" ") || "—"}`);

  // p.239 — portes H 104 / L 80 décor Argile + poignées classiques Aluminium.
  const ex2 = combis.find((k) => k.valeurs.modele.includes("H 101,5") && k.valeurs.modele.includes("mélaminé")
    && k.valeurs.largeur === "80 cm" && k.valeurs.portes === AVEC_PORTES && k.valeurs.poignees === CLASSIQUES);
  const obtenu2 = ex2
    ? [ex2.elements.find((e) => e.cle === "portes").referenceBase + jeton("decor-portes", "Argile"),
       ex2.elements.find((e) => e.cle === "poignees").referenceBase + jeton("finition-poignee", "Aluminium")]
    : [];
  console.log(`   p.239  tarif    : EH793X  BA001K`);
  console.log(`          la fiche : ${obtenu2.join("  ") || "—"}`);

  const concorde = obtenu1.join() === "BH843M" && obtenu2.join() === ["EH793X", "BA001K"].join();
  console.log(`\n   ${concorde ? "LES DEUX CONCORDENT" : "DIVERGENCE — on n'écrit pas"}`);
  if (!concorde) { process.exitCode = 1; return; }

  // ── Ce que la fiche posera ──────────────────────────────────────────
  titre("LA FICHE");
  const gamme = await prisma.gamme.findFirst({ where: { nom: "QUIETUDE" }, select: { id: true } });
  if (!gamme) { console.log("   gamme QUIETUDE introuvable"); process.exitCode = 1; return; }
  const modele = await prisma.produitVitrine.findFirst({
    where: { nom: "Rangement ouvert sans top - Quiétude" },
    select: { id: true, imageUrl: true, images: true,
      categories: { select: { id: true } }, sousCategories: { select: { id: true } },
      categoriePrincipaleId: true, sousCategoriePrincipaleId: true,
      visuels: { orderBy: { ordre: "asc" }, select: { url: true, role: true, ordre: true, recadre: true, urlOrigine: true } } },
  });
  if (!modele) { console.log("   fiche « Rangement ouvert sans top » introuvable"); process.exitCode = 1; return; }

  const existante = await prisma.produitVitrine.findFirst({ where: { gammeId: gamme.id, slug: SLUG }, select: { id: true } });
  console.log(`   ${existante ? "MISE À JOUR" : "CRÉATION"} · ${NOM}`);
  console.log(`   ${CHOIX.length} questions · ${combis.length} combinaisons · ${modele.visuels.length} visuels repris`);

  titre("LES ÉTAPES POSÉES AU CLIENT");
  for (const c of CHOIX) {
    console.log(`   ${c.ordre}. [${c.nature.padEnd(9)}] ${c.nom.padEnd(28)} ${String(c.valeurs.length).padStart(2)} valeurs${c.element ? `  →  ${c.element}` : ""}`);
  }

  titre("LES COMBINAISONS, PAR STRUCTURE");
  for (const s of STRUCTURES) {
    const miennes = combis.filter((k) => k.valeurs.modele === s.libelle);
    const prix = miennes.map((k) => k.prixTarifHT);
    console.log(`   ${String(miennes.length).padStart(2)} · ${s.libelle.padEnd(50)} ${Math.min(...prix)} → ${Math.max(...prix)} €  ${s.topImpose ? "top imposé" : "top au choix"}`);
  }
  console.log(`\n   ${combis.length} combinaisons au total`);

  titre("UN EXEMPLE COMPLET");
  const demo = combis.find((k) => k.valeurs.modele.includes("H 101,5") && k.valeurs.modele.includes("mélaminé")
    && k.valeurs.largeur === "80 cm" && k.valeurs.portes === AVEC_PORTES && k.valeurs.poignees === CLASSIQUES);
  console.log(`   ${Object.values(demo.valeurs).join(" · ")}\n   ${demo.prixTarifHT} € HT (éco ${demo.ecoContribution} €)`);
  for (const e of demo.elements) console.log(`      ${e.referenceBase.padEnd(6)} ${String(e.prixTarifHT).padStart(4)} €  ${e.designation}`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  // ── L'écriture ──────────────────────────────────────────────────────
  const vitrine = existante
    ? await prisma.produitVitrine.update({ where: { id: existante.id }, data: { nom: NOM, publie: true } })
    : await prisma.produitVitrine.create({
      data: {
        nom: NOM, slug: SLUG, gammeId: gamme.id, publie: true, venteSurDevis: false,
        descriptif: "La structure, le top, les portes et les poignées se choisissent ici un par un. Sous 201 cm le top de finition fait partie du meuble ; à 201 cm il reste facultatif. La commande part en une à quatre références Buronomic, réunies sur une seule ligne.",
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
        pageCatalogue: 238,
      },
    });
  }

  for (const f of FINITION_POIGNEE.filter((v) => v.designSeulement)) {
    await prisma.exclusionFinition.create({
      data: {
        vitrineId: vitrine.id,
        valeurs: [valeurIds.get(`poignees::${CLASSIQUES}`), valeurIds.get(`finition-poignee::${f.libelle}`)],
      },
    });
  }

  // Les visuels du rangement nu, si la fiche n'en a pas encore. Les valeurs
  // rattachées ne suivent pas : elles désignent des ValeurChoix d'une autre
  // fiche. Les visuels arrivent libres, visibles quelle que soit la config.
  const dejaVus = await prisma.visuel.count({ where: { vitrineId: vitrine.id } });
  if (dejaVus === 0) {
    for (const v of modele.visuels) {
      await prisma.visuel.create({ data: { vitrineId: vitrine.id, url: v.url, role: v.role, ordre: v.ordre, recadre: v.recadre, urlOrigine: v.urlOrigine } });
    }
  }

  titre("LE COMPTE");
  console.log(`   fiche ${existante ? "mise à jour" : "créée"} · ${CHOIX.length} questions · ${combis.length} combinaisons · 4 exclusions`);
  console.log(`\n   /${SLUG}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
