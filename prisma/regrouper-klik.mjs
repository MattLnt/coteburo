// Regroupe les vingt-neuf fiches Klik en onze.
//
//   node prisma/regrouper-klik.mjs
//   node prisma/regrouper-klik.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Klik est une collection : une coque, trois garnissages, plusieurs
//   piétements. Le tarif l'étale pages 84 à 86 et 161 ; l'import a fait une
//   fiche par ligne. Six d'entre elles sont la même table, à la forme et à la
//   hauteur près.
//
// LA RÉFÉRENCE, TELLE QUE LE TARIF L'ÉCRIT
//   Chaque famille a sa lettre de garnissage, et elles se suivent :
//
//     4 pieds métal      KLA0 · KLB0 · KLC0      A/B/C
//     4 pieds bois       KBAO · KBBO · KBCO      A/B/C
//     giratoire          KLJ0 · KLK0 · KLL0      J/K/L
//     giratoire haut     KLJH · KLKH · KLLH      J/K/L
//     étudiant Basique   KLJT · KLKT · KLLT      J/K/L
//     étudiant Compact   KLRT · KLST · KLTT      R/S/T
//     tabourets          KLH· / KLM· , KBH· / KBM·   H = assise 76, M = 63
//     tables             KLF· / KLU· / KLD·      F = 74, U = 92, D = 110
//
//   Et le suffixe nomme la finition, mot pour mot dans le tarif :
//   « Base et roulettes noires » (/3) ou « blanches » (/7) page 86 ;
//   « Lift assis-debout » (/2) ou « Lift haut » (/0) ; « Plateau + pieds
//   Anthracite » (/AA), « Blanc » (/BB), « Corail » (/CC) page 161 ;
//   « Pied chêne + dossier PP » (/C) ou « + dossier chêne » (/CE) page 85.
//
//   Rien n'est déduit d'un ordre d'apparition : les pages ont été relues par
//   coordonnées (prisma/lire-tableau-catalogue.mjs), ligne par ligne.
//
// CE QU'ON NE TOUCHE PAS
//   Les deux fiches « polypropylène 100 % recyclé » — KLA0/AL, KLA0/AP et
//   leurs tabourets. Page 84 les annonce « gris roche et lave », page 205
//   nomme « Gris perle » et « Gris lave ». Deux noms pour un même coloris, ou
//   deux coloris ? On ne tranche pas : elles restent telles quelles, et la
//   question part au fournisseur.
//
// LES NEUF COLORIS DE POLYPROPYLÈNE
//   Page 86 : « 9 coloris de PP au choix pour l'assise et le dossier ».
//   Page 205 les nomme. Ils ne figurent dans aucune référence — le tarif dit
//   « à confirmer précisément sur votre commande ». Ils deviennent donc deux
//   questions de finition sans jeton, une pour l'assise, une pour le dossier,
//   là où le tarif le demande (*A et *D dans la référence).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const GAMME = "Klik";

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const tissuNu = (t) => String(t || "").split(/\s+[—–-]\s+/)[0].trim();

// ── Le vocabulaire du tarif ───────────────────────────────────────────
const PP = "Assise et dossier polypropylène";
const AVANT = "Assise tapissée à l'avant";
const AVANT_ARRIERE = "Assise tapissée avant et arrière";
const ORDRE_GARNISSAGE = [PP, AVANT, AVANT_ARRIERE];

// Page 205, bloc KLIK : neuf coloris, relevés par coordonnées.
const COLORIS_PP = ["Anthracite", "Taupe", "Blanc", "Gris perle", "Corail",
  "Vert pastel", "Jaune", "Bleu", "Gris lave"];

/**
 * Les groupes, dans l'ordre où ils apparaîtront au catalogue.
 *
 * `ref` reconnaît la référence et rend les réponses. Une référence qu'aucun
 * groupe ne reconnaît fait échouer sa fiche plutôt que d'être rangée au
 * hasard : mieux vaut vingt-neuf fiches qu'une fiche fausse.
 */
const GROUPES = [
  {
    nom: "Chaise 4 pieds métal - Klik",
    lire: (r) => {
      const m = /^KL([ABC])0\/\*P/.exec(r);
      return m && { garnissage: { A: PP, B: AVANT, C: AVANT_ARRIERE }[m[1]] };
    },
    questions: [{ cle: "garnissage", nom: "Assise et dossier", ordonne: ORDRE_GARNISSAGE }],
    coloris: ["assise", "dossier"],
    piétement: "Quatre pieds métal. Sept coloris assortis métal et polypropylène.",
    descriptif: "<p>La chaise Klik sur quatre pieds métal, empilable. Coque polypropylène, assise nue ou garnie d'un placet tapissé à l'avant, ou d'un double placet avant et arrière.</p>",
  },
  {
    nom: "Tabouret 4 pieds métal - Klik",
    lire: (r) => {
      const m = /^KL([HM])(0|B)\/\*P/.exec(r);
      return m && {
        hauteur: m[1] === "H" ? "Assise à 76 cm" : "Assise à 63 cm",
        garnissage: m[2] === "0" ? PP : AVANT,
      };
    },
    questions: [
      { cle: "hauteur", nom: "Hauteur d'assise", ordonne: ["Assise à 63 cm", "Assise à 76 cm"] },
      { cle: "garnissage", nom: "Assise et dossier", ordonne: ORDRE_GARNISSAGE },
    ],
    coloris: ["assise", "dossier"],
    piétement: "Quatre pieds métal, hauteur tabouret. Sept coloris assortis métal et polypropylène.",
    descriptif: "<p>Le tabouret Klik sur quatre pieds métal, en deux hauteurs d'assise. Même coque que la chaise, avec ou sans placet tapissé.</p>",
  },
  {
    nom: "Chaise 4 pieds bois - Klik",
    lire: (r) => {
      const m = /^KB([ABC])O\/C(E?)\s*\+/.exec(r);
      return m && {
        garnissage: { A: PP, B: AVANT, C: AVANT_ARRIERE }[m[1]],
        dossier: m[2] === "E" ? "Dossier chêne" : "Dossier polypropylène",
      };
    },
    questions: [
      { cle: "garnissage", nom: "Assise et dossier", ordonne: ORDRE_GARNISSAGE },
      { cle: "dossier", nom: "Dossier", ordonne: ["Dossier polypropylène", "Dossier chêne"] },
    ],
    coloris: ["assise"],
    piétement: "Quatre pieds en chêne massif, vernis chêne blanchi.",
    descriptif: "<p>La chaise Klik sur pieds de chêne massif vernis chêne blanchi. La version à double placet accepte un dossier en chêne assorti au piétement.</p>",
  },
  {
    nom: "Tabouret 4 pieds bois - Klik",
    lire: (r) => {
      const m = /^KB([HM])(O|B)\/C\s*\+/.exec(r);
      return m && {
        hauteur: m[1] === "H" ? "Assise à 76 cm" : "Assise à 63 cm",
        garnissage: m[2] === "O" ? PP : AVANT,
      };
    },
    questions: [
      { cle: "hauteur", nom: "Hauteur d'assise", ordonne: ["Assise à 63 cm", "Assise à 76 cm"] },
      { cle: "garnissage", nom: "Assise et dossier", ordonne: ORDRE_GARNISSAGE },
    ],
    coloris: ["assise", "dossier"],
    piétement: "Quatre pieds en chêne massif, vernis chêne blanchi, hauteur tabouret.",
    descriptif: "<p>Le tabouret Klik sur pieds de chêne massif, en deux hauteurs d'assise.</p>",
  },
  {
    nom: "Chaise giratoire - Klik",
    lire: (r) => {
      const m = /^KL([JKL])0\/([37])/.exec(r);
      return m && {
        garnissage: { J: PP, K: AVANT, L: AVANT_ARRIERE }[m[1]],
        base: m[2] === "3" ? "Base et roulettes noires" : "Base et roulettes blanches",
      };
    },
    questions: [
      { cle: "garnissage", nom: "Assise et dossier", ordonne: ORDRE_GARNISSAGE },
      { cle: "base", nom: "Base et roulettes", ordonne: ["Base et roulettes noires", "Base et roulettes blanches"] },
    ],
    coloris: ["assise", "dossier"],
    piétement: "Lift sur base cinq branches, roulettes ø 65 mm sol dur, finition noire ou blanche.",
    descriptif: "<p>La version giratoire de la Klik, sur base cinq branches et roulettes sol dur. Même coque et mêmes garnissages que la chaise quatre pieds.</p>",
  },
  {
    nom: "Chaise giratoire haute - Klik",
    lire: (r) => {
      const m = /^KL([JKL])H\/([02])/.exec(r);
      return m && {
        garnissage: { J: PP, K: AVANT, L: AVANT_ARRIERE }[m[1]],
        lift: m[2] === "2" ? "Lift assis-debout" : "Lift haut",
      };
    },
    questions: [
      { cle: "garnissage", nom: "Assise et dossier", ordonne: ORDRE_GARNISSAGE },
      { cle: "lift", nom: "Hauteur", ordonne: ["Lift assis-debout", "Lift haut"] },
    ],
    coloris: ["assise", "dossier"],
    piétement: "Lift avec repose-pieds réglable en hauteur, base noire cinq branches sur patins.",
    descriptif: "<p>La Klik giratoire en version haute, avec repose-pieds réglable et base sur patins. Deux hauteurs de lift : assis-debout ou haut.</p>",
  },
  {
    nom: "Chaise giratoire étudiant Basique - Klik",
    lire: (r) => {
      const m = /^KL([JKL])T\/1/.exec(r);
      return m && { garnissage: { J: PP, K: AVANT, L: AVANT_ARRIERE }[m[1]] };
    },
    questions: [{ cle: "garnissage", nom: "Assise et dossier", ordonne: ORDRE_GARNISSAGE }],
    coloris: ["assise", "dossier"],
    piétement: "Base giratoire, tablette écritoire.",
    descriptif: "<p>La Klik giratoire équipée d'une tablette écritoire, pour les salles de cours et les amphithéâtres.</p>",
  },
  {
    nom: "Chaise giratoire étudiant Compact - Klik",
    lire: (r) => {
      const m = /^KL([RST])T\/G/.exec(r);
      return m && { garnissage: { R: PP, S: AVANT, T: AVANT_ARRIERE }[m[1]] };
    },
    questions: [{ cle: "garnissage", nom: "Assise et dossier", ordonne: ORDRE_GARNISSAGE }],
    coloris: ["assise", "dossier"],
    piétement: "Base giratoire, tablette écritoire et panier polypropylène.",
    descriptif: "<p>La version Compact de la Klik étudiant : tablette écritoire et panier à cartable en polypropylène sous l'assise.</p>",
  },
  {
    nom: "Table Klik",
    lire: (r) => {
      const m = /^KL([FUD])([RV])\/(AA|BB|CC)/.exec(r);
      return m && {
        hauteur: { F: "Cafétéria — 74 cm", U: "Haute — 92 cm", D: "Mange-debout — 110 cm" }[m[1]],
        forme: m[2] === "R" ? "Ronde — ø 80 cm" : "Ovale — 80 × 150 cm",
        coloris: { AA: "Anthracite", BB: "Blanc", CC: "Corail" }[m[3]],
      };
    },
    questions: [
      { cle: "hauteur", nom: "Hauteur", ordonne: ["Cafétéria — 74 cm", "Haute — 92 cm", "Mange-debout — 110 cm"] },
      { cle: "forme", nom: "Forme du plateau", ordonne: ["Ronde — ø 80 cm", "Ovale — 80 × 150 cm"] },
      { cle: "coloris", nom: "Plateau et pieds", ordonne: ["Anthracite", "Blanc", "Corail"] },
    ],
    coloris: [],
    piétement: "Pieds métal assortis au plateau.",
    descriptif: "<p>Les tables Klik, assorties aux chaises et tabourets de la gamme. Plateau stratifié 21 mm, chant finition chêne, en trois hauteurs et deux formes.</p>",
  },
];

const COLORIS_NOM = { assise: "Coloris de l'assise", dossier: "Coloris du dossier" };

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const gamme = await prisma.gamme.findFirst({
    where: { nom: GAMME },
    select: {
      id: true,
      vitrines: {
        where: { publie: true },
        orderBy: { nom: "asc" },
        select: {
          id: true, nom: true, sectionsDevis: true,
          visuels: { select: { id: true } },
          choix: { orderBy: { ordre: "asc" }, select: { cle: true, nom: true, nature: true } },
          combinaisons: {
            select: {
              valeurs: true, prixTarifHT: true, ecoContribution: true, poids: true,
              ean: true, referenceBase: true, pageCatalogue: true, ancienId: true,
            },
          },
        },
      },
    },
  });
  if (!gamme) { console.error(`Gamme ${GAMME} introuvable.`); process.exitCode = 1; return; }

  for (const g of GROUPES) { g.fiches = []; g.combinaisons = []; g.collisions = []; g.vues = new Map(); }
  const refuses = [];
  let combinaisonsLues = 0;

  for (const v of gamme.vitrines) {
    const refs = v.combinaisons.map((c) => String(c.referenceBase || "").trim());
    const groupesVus = [...new Set(refs.map((r) => GROUPES.find((g) => g.lire(r))?.nom || null))];
    if (groupesVus.length !== 1 || !groupesVus[0]) {
      refuses.push(`${v.nom.replace(" - Klik", "")} — ${groupesVus.includes(null) ? "référence non reconnue" : "plusieurs produits dans une fiche"} (${refs[0]})`);
      continue;
    }
    const grp = GROUPES.find((g) => g.nom === groupesVus[0]);
    grp.fiches.push(v);

    const cleTissu = v.choix.find((c) => c.nature === "tarifaire" && /tissu/i.test(c.nom))?.cle
      || v.choix.find((c) => c.nature === "tarifaire" && /^finition$/i.test(c.nom))?.cle
      || null;

    for (const c of v.combinaisons) {
      combinaisonsLues += 1;
      const valeurs = grp.lire(String(c.referenceBase || "").trim());
      const t = cleTissu ? tissuNu(c.valeurs?.[cleTissu]) : null;
      if (t) valeurs.tissu = t;

      const empreinte = empreinteDe(valeurs);
      if (grp.vues.has(empreinte)) {
        grp.collisions.push({ a: grp.vues.get(empreinte), b: `${c.referenceBase} (${c.prixTarifHT} €)`, valeurs });
        continue;
      }
      grp.vues.set(empreinte, `${c.referenceBase} (${c.prixTarifHT} €)`);
      grp.combinaisons.push({
        valeurs, empreinte,
        prixTarifHT: c.prixTarifHT, ecoContribution: c.ecoContribution, poids: c.poids,
        ean: c.ean, referenceBase: c.referenceBase, pageCatalogue: c.pageCatalogue,
        ancienId: c.ancienId,
      });
    }
  }

  const actifs = GROUPES.filter((g) => g.fiches.length);
  const questionsDe = (g) => [...g.questions, { cle: "tissu", nom: "Tissu", ordonne: null }];
  const valeursDe = (g, q) => {
    const vues = [...new Set(g.combinaisons.map((c) => c.valeurs[q.cle]).filter(Boolean))];
    if (!q.ordonne) return vues.sort();
    return q.ordonne.filter((x) => vues.includes(x)).concat(vues.filter((x) => !q.ordonne.includes(x)));
  };

  for (const g of actifs) {
    g.cible = [...g.fiches].sort((a, b) => b.visuels.length - a.visuels.length)[0];
    g.visuels = g.fiches.reduce((n, f) => n + f.visuels.length, 0);
  }

  titre("LES FICHES QU'ON OBTIENDRAIT");
  for (const g of actifs) {
    const prix = g.combinaisons.map((c) => c.prixTarifHT).filter((x) => x != null);
    console.log(`\n   ${g.nom}`);
    console.log(`      remplace ${g.fiches.length} fiche${g.fiches.length > 1 ? "s" : ""} · ${g.visuels} visuels`);
    console.log("      ──");
    for (const q of questionsDe(g)) {
      const vals = valeursDe(g, q);
      if (vals.length < 2) continue;
      console.log(`      ${q.nom.padEnd(20)} ${vals.join(" · ")}`);
    }
    for (const c of g.coloris) console.log(`      ${COLORIS_NOM[c].padEnd(20)} 9 coloris   (finition, sans code)`);
    console.log("      ──");
    console.log(`      ${g.combinaisons.length} variantes · ${Math.min(...prix)} à ${Math.max(...prix)} € HT`);
  }

  if (refuses.length) {
    titre("FICHES LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  const collisions = actifs.flatMap((g) => g.collisions);
  if (collisions.length) {
    titre("DEUX PRIX POUR UNE MÊME CONFIGURATION — RIEN NE SERA ÉCRIT");
    console.log("");
    for (const c of collisions.slice(0, 12)) {
      console.log(`   ${c.a}  ≠  ${c.b}`);
      console.log(`      ${JSON.stringify(c.valeurs)}`);
    }
    if (collisions.length > 12) console.log(`   … et ${collisions.length - 12} autres`);
    process.exitCode = 1;
    return;
  }

  // combinaisonsLues ne compte que les fiches retenues : les écartées n'entrent
  // jamais dans la boucle. Les soustraire une seconde fois donnait un compte
  // négatif, et le garde-fou refusait d'écrire — il avait raison de le faire.
  const ecrites = actifs.reduce((n, g) => n + g.combinaisons.length, 0);
  const lues = combinaisonsLues;
  titre("LE COMPTE");
  console.log(`
   variantes des fiches regroupées ...... ${lues}
   variantes conservées ................. ${ecrites}
   variantes perdues .................... ${lues - ecrites}`);
  if (lues !== ecrites) {
    console.log("\n   Une variante perdue est un prix qui disparaît. Rien ne sera écrit.");
    process.exitCode = 1;
    return;
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const g of actifs) {
    const cible = g.cible;
    const autres = g.fiches.filter((v) => v.id !== cible.id);

    const sections = [
      { titre: "Piétement", contenu: `<p>${g.piétement}</p>` },
      ...(g.coloris.length ? [{
        titre: "Finitions",
        contenu: `<p>Neuf coloris de polypropylène au choix : ${COLORIS_PP.join(", ").toLowerCase()}. Nuancier page 205 du catalogue Sokoa.</p><p>Le tarif demande de confirmer ces coloris sur la commande : ils n'ont pas de code de référence.</p>`,
      }] : []),
    ];

    await prisma.produitVitrine.update({
      where: { id: cible.id },
      data: { nom: g.nom, slug: slug(g.nom), publie: true, descriptif: g.descriptif, sectionsDevis: sections },
    });
    await prisma.choix.deleteMany({ where: { vitrineId: cible.id } });
    await prisma.combinaison.deleteMany({ where: { vitrineId: cible.id } });

    let ordre = 0;
    for (const q of questionsDe(g)) {
      const vals = valeursDe(g, q);
      if (vals.length < 2) continue;
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: cible.id, cle: q.cle, nom: q.nom,
          nature: "tarifaire", rendu: "boutons", ordre, origine: "editorial",
          valeurs: { create: vals.map((libelle, i) => ({ libelle, ordre: i })) },
        },
      });
    }
    // Les coloris de polypropylène : nommés par le tarif, sans code, et à
    // confirmer à la commande. Pas de pastille tant qu'on n'a pas relevé
    // leurs teintes dans le nuancier — un bouton nommé ne ment pas.
    for (const cle of g.coloris) {
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: cible.id, cle: `coloris_${cle}`, nom: COLORIS_NOM[cle],
          nature: "finition", rendu: "boutons", ordre, origine: "tarif",
          valeurs: { create: COLORIS_PP.map((libelle, i) => ({ libelle, ordre: i, suffixeReference: "" })) },
        },
      });
    }

    await prisma.combinaison.createMany({
      data: g.combinaisons.map((c) => ({ ...c, vitrineId: cible.id })),
    });

    let rang = cible.visuels.length;
    for (const v of autres) {
      for (const img of v.visuels) {
        rang += 1;
        await prisma.visuel.update({ where: { id: img.id }, data: { vitrineId: cible.id, ordre: rang } });
      }
    }
    await prisma.produitVitrine.updateMany({
      where: { id: { in: autres.map((v) => v.id) } },
      data: { publie: false, accessoireSeul: true },
    });

    console.log(`   ${g.nom}`);
    console.log(`      ${g.combinaisons.length} variantes · ${autres.length} fiches dépubliées · ${g.visuels} visuels`);
  }

  titre("CONTRÔLE");
  const publiees = await prisma.produitVitrine.count({ where: { gamme: { nom: GAMME }, publie: true } });
  const comb = await prisma.combinaison.count({ where: { vitrine: { gamme: { nom: GAMME }, publie: true } } });
  const sansPrix = await prisma.combinaison.count({
    where: { vitrine: { gamme: { nom: GAMME }, publie: true }, prixTarifHT: null },
  });
  const sansVisuel = await prisma.produitVitrine.count({
    where: { gamme: { nom: GAMME }, publie: true, visuels: { none: {} } },
  });
  console.log(`   fiches publiées : ${publiees} · variantes : ${comb} · sans prix : ${sansPrix} · sans visuel : ${sansVisuel}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
