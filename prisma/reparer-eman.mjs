// Remet Eman d'aplomb : republie ses trente produits et nomme ses questions.
//
//   node prisma/reparer-eman.mjs
//   node prisma/reparer-eman.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI UNE RÉPARATION ET PAS UN RÉIMPORT
//   Contrairement à Loria, l'import d'Eman avait bien travaillé : une fiche
//   par bloc du tarif, les bonnes références, et même l'axe du mécanisme.
//   Vérification faite ligne à ligne, les prix stockés sont exacts —
//   NT87/B0 y vaut 662, 667, 672, 687, 762 et 817 €, comme page 38.
//
//   Ce sont mes propres regroupements qui l'ont cassé : vingt-cinq fiches
//   dépubliées au profit de deux. On les remet, sans toucher à leurs prix.
//
// CE QUI RESTE À CORRIGER
//   1. La question du mécanisme s'appelle « Modèle » et ses deux valeurs sont
//      le nom de la fiche suivi d'une référence. Le tarif les nomme :
//      « Synchro automatique + TA » et « Synchro Plus + TA ».
//   2. La question du tissu s'appelle « Finition ».
//   3. Cinq blocs du tarif n'ont jamais été importés — trois sur la page 31
//      (résille Direction), un page 39, un page 41.
//   4. Les versions résille portent « +coloris* » dans leur référence : sept
//      coloris de résille que le tarif nomme page 40, et qu'aucune fiche ne
//      propose aujourd'hui.
//
// LE MÉCANISME SE LIT DANS LA RÉFÉRENCE
//   N + dossier + mécanisme + têtière + / + accotoirs
//   Le troisième caractère vaut 8 pour la synchro automatique, 1 pour la
//   synchro Plus : NT87/B0 et NT17/B0 sont le même siège, deux mécanismes.
//   On ne décode pas le reste — il est déjà porté par la fiche.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const GAMME = "Eman";

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AUTO = "Synchro automatique + translation d'assise";
const PLUS = "Synchro Plus + translation d'assise";
const MECANISMES = [AUTO, PLUS];

// Page 40 : « 7 coloris au choix : Noir (N), Gris foncé (G), Gris moyen (Q),
// Beige (E), Terre (T), Vert (V) et Bleu (W). Voir nuancier p.202. »
const RESILLE = [
  { libelle: "Noir", couleur: "#1c1c1c" },
  { libelle: "Gris foncé", couleur: "#4a4a4a" },
  { libelle: "Gris moyen", couleur: "#8c8c8c" },
  { libelle: "Beige", couleur: "#c8bba4" },
  { libelle: "Terre", couleur: "#8a5a3b" },
  { libelle: "Vert", couleur: "#4a6b4a" },
  { libelle: "Bleu", couleur: "#3a5a7a" },
];

const TISSU_6 = ["Tissu B", "Tissu B+", "Tissu C", "Tissu D", "Tissu E", "Tissu H"];

/**
 * Le mécanisme, lu au troisième caractère de la référence.
 *
 * NT87/B0 se découpe N-T-8-7 : le 8 est le mécanisme, le 7 la têtière. La
 * première version lisait le quatrième caractère et ne reconnaissait donc
 * rien ; le garde-fou a refusé les vingt-cinq fiches d'un bloc plutôt que
 * d'en écrire une seule de travers.
 */
function mecanismeDe(ref) {
  const c = String(ref || "").trim()[2];
  if (c === "8") return AUTO;
  if (c === "1") return PLUS;
  return null;
}

// ── Les cinq blocs que l'import n'a jamais pris ───────────────────────
//
// Prix relevés par coordonnées, pages 31, 39 et 41.
const MANQUANTS = [
  {
    nom: "NOIR Fauteuil haut dossier résille + têtière avec base alu poli, roulettes chromées ø65 sol dur - Eman",
    page: 31, resille: true,
    lignes: [
      { ref: "NR87/K", prix: [865, 870, 875, 890, 910, 945] },
      { ref: "NR17/K", prix: [855, 860, 865, 880, 900, 935] },
    ],
  },
  {
    nom: "NOIR Fauteuil haut dossier résille avec base alu poli, roulettes chromées ø65 sol dur - Eman",
    page: 31, resille: true,
    lignes: [
      { ref: "NR86/K", prix: [798, 803, 808, 823, 838, 868] },
      { ref: "NR16/K", prix: [788, 793, 798, 813, 828, 858] },
    ],
  },
  {
    nom: "BLANC Fauteuil haut dossier résille + têtière avec base alu poli, roulettes chromées ø65 sol dur - Eman",
    page: 31, resille: true,
    lignes: [
      { ref: "NL87/J", prix: [899, 904, 909, 924, 944, 979] },
      { ref: "NL17/J", prix: [889, 894, 899, 914, 934, 969] },
    ],
  },
  {
    nom: "Fauteuil haut dossier avec têtière, finition blanc, roulettes ø50 sol moquette — dossier résille - Eman",
    page: 41, resille: true,
    lignes: [
      { ref: "NL87/E", prix: [718, 723, 728, 743, 763, 798] },
      { ref: "NL17/E", prix: [708, 713, 718, 733, 753, 788] },
    ],
  },
  {
    nom: "Chaise haut dossier, finition blanc, roulettes ø50 sol moquette — dossier tapissé - Eman",
    page: 39, resille: false,
    lignes: [
      { ref: "NH86/D0", prix: [576, 581, 586, 601, 671, 721] },
      { ref: "NH16/D0", prix: [566, 571, 576, 591, 661, 711] },
    ],
  },
];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const gamme = await prisma.gamme.findFirst({
    where: { nom: GAMME },
    select: {
      id: true,
      vitrines: {
        orderBy: { nom: "asc" },
        select: {
          id: true, nom: true, publie: true,
          visuels: { select: { id: true } },
          choix: { select: { id: true, cle: true, nom: true, nature: true } },
          combinaisons: { select: { id: true, valeurs: true, referenceBase: true, prixTarifHT: true } },
        },
      },
    },
  });
  if (!gamme) { console.error(`Gamme ${GAMME} introuvable.`); process.exitCode = 1; return; }

  // Les fiches à remettre : celles qui portent un vrai bloc de tarif, donc
  // toutes sauf les deux que mon regroupement avait fabriquées.
  const fabriquees = gamme.vitrines.filter((v) => /^(Chaise|Fauteuil) haut dossier - Eman$/.test(v.nom));
  const aRemettre = gamme.vitrines.filter((v) => !fabriquees.includes(v));

  // ── Ce qu'on va réécrire dans chaque fiche ──────────────────────────
  const plans = [];
  const refuses = [];
  for (const v of aRemettre) {
    const combos = [];
    let illisible = null;
    for (const c of v.combinaisons) {
      const mecanisme = mecanismeDe(c.referenceBase);
      if (!mecanisme) { illisible = c.referenceBase; break; }
      // « modele » portait le nom de la fiche + la référence ; « finition »
      // portait le tissu. On renomme les clés et l'on nettoie les valeurs.
      const tissu = c.valeurs?.finition || c.valeurs?.tissu || null;
      const valeurs = { mecanisme, ...(tissu ? { tissu } : {}) };
      combos.push({ id: c.id, valeurs, empreinte: empreinteDe(valeurs) });
    }
    if (illisible) { refuses.push(`${v.nom} — mécanisme illisible dans « ${illisible} »`); continue; }

    const empreintes = new Set(combos.map((c) => c.empreinte));
    if (empreintes.size !== combos.length) {
      refuses.push(`${v.nom} — deux variantes aboutiraient aux mêmes réponses`);
      continue;
    }
    const resille = v.combinaisons.some((c) => /coloris/i.test(c.referenceBase || ""));
    plans.push({ vitrine: v, combos, resille });
  }

  titre("LES VINGT-CINQ FICHES À REMETTRE");
  console.log("");
  for (const p of plans) {
    const tissus = [...new Set(p.combos.map((c) => c.valeurs.tissu).filter(Boolean))];
    console.log(`   ${p.vitrine.nom.replace(" - Eman", "").slice(0, 62).padEnd(64)} ${String(p.combos.length).padStart(2)} var.${p.resille ? " · résille" : ""}`);
    if (tissus.length && tissus.length !== 6 && tissus.length !== 3) {
      console.log(`      ⚠ ${tissus.length} tissus : ${tissus.join(" · ")}`);
    }
  }

  titre("LES CINQ BLOCS QUE L'IMPORT N'AVAIT JAMAIS PRIS");
  console.log("");
  for (const m of MANQUANTS) {
    const existe = gamme.vitrines.some((v) => v.nom === m.nom);
    console.log(`   page ${m.page}  ${m.nom.replace(" - Eman", "").slice(0, 60).padEnd(62)} ${existe ? "déjà présent" : `${m.lignes.length * 6} variantes`}`);
  }

  if (refuses.length) {
    titre("FICHES LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  const totalCombos = plans.reduce((n, p) => n + p.combos.length, 0)
    + MANQUANTS.filter((m) => !gamme.vitrines.some((v) => v.nom === m.nom)).length * 12;
  titre("LE COMPTE");
  console.log(`   ${plans.length} fiches remises + ${MANQUANTS.filter((m) => !gamme.vitrines.some((v) => v.nom === m.nom)).length} créées = ${plans.length + MANQUANTS.filter((m) => !gamme.vitrines.some((v) => v.nom === m.nom)).length} produits`);
  console.log(`   ${totalCombos} variantes`);
  console.log(`   ${fabriquees.length} fiches de regroupement à dépublier`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");

  // ── 1. Remettre les vingt-cinq ──────────────────────────────────────
  for (const p of plans) {
    const id = p.vitrine.id;
    await prisma.produitVitrine.update({
      where: { id }, data: { publie: true, accessoireSeul: false },
    });

    // Les valeurs des combinaisons changent de clé : on les réécrit une à une
    // pour garder l'identifiant, et donc les devis et paniers qui le citent.
    for (const c of p.combos) {
      await prisma.combinaison.update({
        where: { id: c.id }, data: { valeurs: c.valeurs, empreinte: c.empreinte },
      });
    }

    // Les anciennes questions cèdent la place à deux questions nommées.
    await prisma.choix.deleteMany({ where: { vitrineId: id } });
    let ordre = 0;
    const mecas = [...new Set(p.combos.map((c) => c.valeurs.mecanisme))];
    if (mecas.length > 1) {
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: id, cle: "mecanisme", nom: "Mécanisme", nature: "tarifaire",
          rendu: "boutons", ordre, origine: "tarif",
          valeurs: { create: MECANISMES.filter((m) => mecas.includes(m)).map((libelle, i) => ({ libelle, ordre: i })) },
        },
      });
    }
    const tissus = [...new Set(p.combos.map((c) => c.valeurs.tissu).filter(Boolean))];
    if (tissus.length > 1) {
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: id, cle: "tissu", nom: "Tissu", nature: "tarifaire",
          rendu: "boutons", ordre, origine: "tarif",
          valeurs: { create: TISSU_6.filter((t) => tissus.includes(t)).concat(tissus.filter((t) => !TISSU_6.includes(t))).map((libelle, i) => ({ libelle, ordre: i })) },
        },
      });
    }
    // Le coloris de résille, que le tarif réclame et qu'aucune fiche n'offrait.
    if (p.resille) {
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: id, cle: "resille", nom: "Coloris de la résille",
          nature: "finition", rendu: "pastilles", ordre, origine: "tarif",
          valeurs: { create: RESILLE.map((c, i) => ({ libelle: c.libelle, couleur: c.couleur, ordre: i, suffixeReference: "" })) },
        },
      });
    }
  }
  console.log(`   ${plans.length} fiches remises en ligne.`);

  // ── 2. Créer les cinq manquantes ────────────────────────────────────
  let creees = 0;
  for (const m of MANQUANTS) {
    if (gamme.vitrines.some((v) => v.nom === m.nom)) continue;
    const combinaisons = [];
    for (const l of m.lignes) {
      const mecanisme = mecanismeDe(l.ref);
      l.prix.forEach((prix, i) => {
        const valeurs = { mecanisme, tissu: TISSU_6[i] };
        combinaisons.push({
          valeurs, empreinte: empreinteDe(valeurs),
          prixTarifHT: prix, referenceBase: l.ref, pageCatalogue: m.page,
        });
      });
    }
    const neuve = await prisma.produitVitrine.create({
      data: {
        nom: m.nom, slug: slug(m.nom), publie: true, gammeId: gamme.id,
        descriptif: `<p>${m.nom.replace(" - Eman", "")}. Deux mécanismes au choix, synchro automatique ou synchro Plus, avec translation d'assise.</p>`,
        sectionsDevis: [
          { titre: "Mécanisme", contenu: `<ul><li>${AUTO}</li><li>${PLUS}</li></ul>` },
          { titre: "Bon à savoir", contenu: "<p>Bloc du tarif que l'import d'origine n'avait pas repris — prix relevés page " + m.page + " du catalogue Sokoa.</p>" },
        ],
      },
    });
    await prisma.combinaison.createMany({ data: combinaisons.map((c) => ({ ...c, vitrineId: neuve.id })) });
    await prisma.choix.create({
      data: {
        vitrineId: neuve.id, cle: "mecanisme", nom: "Mécanisme", nature: "tarifaire",
        rendu: "boutons", ordre: 1, origine: "tarif",
        valeurs: { create: MECANISMES.map((libelle, i) => ({ libelle, ordre: i })) },
      },
    });
    await prisma.choix.create({
      data: {
        vitrineId: neuve.id, cle: "tissu", nom: "Tissu", nature: "tarifaire",
        rendu: "boutons", ordre: 2, origine: "tarif",
        valeurs: { create: TISSU_6.map((libelle, i) => ({ libelle, ordre: i })) },
      },
    });
    if (m.resille) {
      await prisma.choix.create({
        data: {
          vitrineId: neuve.id, cle: "resille", nom: "Coloris de la résille",
          nature: "finition", rendu: "pastilles", ordre: 3, origine: "tarif",
          valeurs: { create: RESILLE.map((c, i) => ({ libelle: c.libelle, couleur: c.couleur, ordre: i, suffixeReference: "" })) },
        },
      });
    }
    creees += 1;
  }
  console.log(`   ${creees} fiches créées.`);

  // ── 3. Retirer les deux fiches de regroupement ──────────────────────
  if (fabriquees.length) {
    await prisma.produitVitrine.updateMany({
      where: { id: { in: fabriquees.map((v) => v.id) } },
      data: { publie: false, accessoireSeul: true },
    });
    console.log(`   ${fabriquees.length} fiches de regroupement dépubliées.`);
  }

  titre("CONTRÔLE");
  const pub = await prisma.produitVitrine.count({ where: { gamme: { nom: GAMME }, publie: true } });
  const comb = await prisma.combinaison.count({ where: { vitrine: { gamme: { nom: GAMME }, publie: true } } });
  const sansPrix = await prisma.combinaison.count({ where: { vitrine: { gamme: { nom: GAMME }, publie: true }, prixTarifHT: null } });
  console.log(`   fiches publiées : ${pub} · variantes : ${comb} · sans prix : ${sansPrix}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
