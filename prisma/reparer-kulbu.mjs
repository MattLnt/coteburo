// Rend à Kulbu ses deux versions et ses coloris.
//
//   node prisma/reparer-kulbu.mjs
//   node prisma/reparer-kulbu.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Le pouf Kulbu existe en deux versions, et le tarif le dit en deux mots,
//   page 88 : « assise d'appoint dynamique dans sa version culbuto ou fixe sur
//   patins ». Elles ne coûtent pas le même prix — 239 € contre 243 € pour le
//   pouf nu, quatre euros d'écart sur chacun des trois poufs, à chaque
//   catégorie de tissu. La base n'en connaissait qu'une, la culbuto, et le
//   client ne pouvait pas commander l'autre.
//
//   Et le tarif nomme quatre codes à côté de chaque référence :
//
//     *A  coloris PP assise        *TA  tissu assise
//     *C  coloris PP corps         *TC  tissu corps
//
//   « À confirmer précisément sur votre commande pour éviter toute erreur de
//   configuration », dit la page. Aucun des quatre n'était demandé.
//
// CE QUE CHAQUE FICHE DEMANDE, ET POURQUOI
//   La référence dit ce qui est tapissé et ce qui reste en polyéthylène :
//
//     KUA0/*A*C     rien de tapissé   → deux coloris PE : assise et corps
//     KUB0/*TA*C    assise tapissée   → un coloris PE : le corps seul
//     KUC0/*TA*TC   tout tapissé      → aucun coloris PE
//
//   Les quatre teintes viennent du nuancier, page 205 : Anthracite, Blanc,
//   Corail, Vert pastel. Le nuancier ne leur donne pas de code — il en donne
//   à Adela, « Noir (1) », « Gris (3) » ; pas à Kulbu. Le coloris se nomme
//   donc sur la commande, comme la page 88 le demande.
//
// CE QU'ON NE TOUCHE PAS
//   La référence. « KUA0/*A*C » est exactement ce que Sokoa imprime, et ses
//   deux astérisques désignent maintenant deux questions de la fiche : la
//   laisser telle quelle est plus juste que de la tronquer en « KUA0/ ».
//
//   Le tarif imprime la MÊME référence pour la culbuto et pour les patins.
//   La version se précise donc en mots sur la commande, elle aussi ; c'est le
//   tarif qui en décide ainsi, et non ce script.
//
// UN TITRE RÉÉCRIT, ET NON RACCOURCI
//   Le meuble portait « … verso tableau blanc magnétique i - Kulbu » : le « i »
//   est le pictogramme d'information du tarif, que la lecture du PDF a pris
//   pour un mot. Cent trois caractères, sans une virgule où couper — le script
//   des titres longs n'avait pas de prise. Celui-ci est donc réécrit à la main
//   vers « Meuble de rangement 6 poufs, verso tableau blanc magnétique », qui
//   garde les deux faits qui distinguent le meuble et laisse tomber sa couleur
//   et ses roulettes. Il n'y a qu'un meuble dans la gamme : aucun risque de le
//   confondre avec un autre.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PDF = "catalogue-2026/SOKOA_TARIF 2026_FR.pdf";
const PAGE = 88;
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const CULBUTO = "Culbuto";
const PATINS = "Patins";

// ── Les quatre teintes de polyéthylène, nuancier page 205 ─────────────
const PE = [
  { libelle: "Anthracite", couleur: "#333537" },   // NCS 8000-N
  { libelle: "Blanc", couleur: "#f2f2ee" },        // NCS 0500-N
  { libelle: "Corail", couleur: "#e2705a" },       // NCS 2050-Y70R
  { libelle: "Vert pastel", couleur: "#b9cf9e" },  // NCS 2020-G20Y
];

// ── Ce que la page 88 imprime, pouf par pouf ──────────────────────────
//
// « prix » donne le tarif de chaque version. Quand la fiche a un axe tissu,
// les prix sont dans l'ordre des catégories ; sinon il n'y en a qu'un.
const POUFS = [
  {
    ref: "KUA0/*A*C", nom: "Pouf non tapissé",
    tissu: null,
    prix: { [CULBUTO]: [239], [PATINS]: [243] },
    coloris: [
      { cle: "assise", nom: "Coloris de l'assise" },
      { cle: "corps", nom: "Coloris du corps" },
    ],
  },
  {
    ref: "KUB0/*TA*C", nom: "Pouf avec assise tapissée",
    tissu: ["Tissu B", "Tissu B+", "Tissu C", "Tissu D"],
    prix: { [CULBUTO]: [261, 269, 273, 279], [PATINS]: [265, 273, 277, 283] },
    coloris: [{ cle: "corps", nom: "Coloris du corps" }],
  },
  {
    ref: "KUC0/*TA*TC", nom: "Pouf avec assise et corps tapissés",
    tissu: ["Tissu B", "Tissu B+", "Tissu C", "Tissu D"],
    prix: { [CULBUTO]: [290, 299, 305, 313], [PATINS]: [294, 303, 309, 317] },
    coloris: [],
  },
];

const MEUBLE = {
  ref: "KUM6DT1BLC",
  ancien: /tableau blanc magn[ée]tique\s*i\b/i,
  nom: "Meuble de rangement 6 poufs, verso tableau blanc magnétique - Kulbu",
};

/** Le texte d'une page du tarif, espaces normalisés. */
async function textePage(doc, n) {
  const t = await (await doc.getPage(n)).getTextContent();
  return t.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  // ── Le filet : chaque prix, sur la page citée ────────────────────────
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({
    data: new Uint8Array(readFileSync(PDF)), useSystemFonts: true,
  }).promise;
  const texte = await textePage(doc, PAGE);

  titre(`VÉRIFICATION CONTRE LA PAGE ${PAGE}`);
  let absents = 0;
  for (const p of POUFS) {
    const tous = Object.values(p.prix).flat();
    const manque = tous.filter((x) => !new RegExp(`\\b${x}\\b`).test(texte));
    console.log(`   ${p.ref.padEnd(13)} ${tous.length - manque.length}/${tous.length} prix retrouvés`);
    for (const m of manque) console.log(`      ABSENT : ${m} €`);
    absents += manque.length;
  }
  for (const mot of [CULBUTO, PATINS, "coloris PP assise", "coloris PP corps"]) {
    const la = texte.toLowerCase().includes(mot.toLowerCase());
    console.log(`   « ${mot} »${la ? "" : "  ABSENT"}`);
    if (!la) absents++;
  }
  const n205 = await textePage(doc, 205);
  const peAbsents = PE.filter((c) => !n205.includes(c.libelle));
  console.log(`   nuancier 205 : ${PE.length - peAbsents.length}/${PE.length} teintes retrouvées`);
  for (const c of peAbsents) console.log(`      ABSENTE : « ${c.libelle} »`);
  absents += peAbsents.length;

  if (absents) {
    titre(`${absents} MENTIONS INTROUVABLES — RIEN NE SERA ÉCRIT`);
    process.exitCode = 1;
    return;
  }

  // ── L'état des fiches ────────────────────────────────────────────────
  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { nom: "Kulbu" } },
    select: {
      id: true, nom: true, slug: true, publie: true,
      choix: { select: { id: true, cle: true, nom: true, nature: true, ordre: true,
        valeurs: { select: { libelle: true }, orderBy: { ordre: "asc" } } }, orderBy: { ordre: "asc" } },
      combinaisons: { select: { id: true, valeurs: true, referenceBase: true, prixTarifHT: true,
        ecoContribution: true, poids: true, ean: true, pageCatalogue: true } },
    },
  });

  const plans = [];
  const refuses = [];

  for (const p of POUFS) {
    const v = vitrines.find((x) => x.combinaisons.some((k) => k.referenceBase === p.ref));
    if (!v) { refuses.push(`${p.ref} — aucune fiche ne porte cette référence`); continue; }

    // L'axe tissu attendu, tel qu'il est en base.
    const axeTissu = p.tissu
      ? v.choix.find((c) => c.nature === "tarifaire" && c.valeurs.length === p.tissu.length
          && c.valeurs.every((x, i) => x.libelle === p.tissu[i]))
      : null;
    if (p.tissu && !axeTissu) {
      refuses.push(`${v.nom} — l'axe tissu attendu (${p.tissu.join(", ")}) n'est pas celui de la base`);
      continue;
    }

    // Les axes à valeur unique qui ne sont que du bruit d'import : « Référence »
    // recopiant la référence, « Finitions » ne disant que la matière. Leurs
    // clés polluent les valeurs des combinaisons qu'on réécrit.
    const aSupprimer = v.choix.filter((c) => c !== axeTissu && c.valeurs.length <= 1
      && /r[ée]f[ée]rence|finitions?$/i.test(c.nom));

    // La grille attendue : version × tissu.
    const attendues = [];
    for (const version of [CULBUTO, PATINS]) {
      const prix = p.prix[version];
      (p.tissu || [null]).forEach((t, i) => {
        const valeurs = { version, ...(t ? { [axeTissu.cle]: t } : {}) };
        attendues.push({ valeurs, empreinte: empreinteDe(valeurs), prix: prix[i] });
      });
    }
    if (new Set(attendues.map((a) => a.empreinte)).size !== attendues.length) {
      refuses.push(`${v.nom} — deux variantes attendues portent la même empreinte`);
      continue;
    }

    // Ce qui existe déjà, rattaché par sa valeur de tissu.
    const modele = v.combinaisons[0];
    const garde = [];
    const cree = [];
    const restantes = [...v.combinaisons];
    for (const a of attendues) {
      const t = p.tissu ? a.valeurs[axeTissu.cle] : null;
      const i = restantes.findIndex((k) => {
        const val = k.valeurs || {};
        if (a.valeurs.version === PATINS) return false;   // aucune n'existe
        return p.tissu ? val[axeTissu.cle] === t : true;
      });
      if (i === -1) cree.push(a);
      else garde.push({ ...a, id: restantes.splice(i, 1)[0].id });
    }
    if (restantes.length) {
      refuses.push(`${v.nom} — ${restantes.length} variantes en base ne trouvent pas leur place : ${restantes.map((k) => JSON.stringify(k.valeurs)).join(" ")}`);
      continue;
    }

    const colorisAPoser = p.coloris.filter((c) => !v.choix.some((x) => x.cle === c.cle));
    plans.push({ v, p, axeTissu, aSupprimer, garde, cree, modele, colorisAPoser });
  }

  // Le meuble : un pictogramme pris pour un mot.
  const meuble = vitrines.find((x) => x.combinaisons.some((k) => k.referenceBase === MEUBLE.ref));
  const renommer = meuble && MEUBLE.ancien.test(meuble.nom)
    ? { v: meuble, nom: MEUBLE.nom, slug: slug(MEUBLE.nom) } : null;

  titre(`${plans.length} POUFS REPRIS`);
  for (const pl of plans) {
    console.log(`\n   ── ${pl.v.nom}   ${pl.p.ref}`);
    console.log(`      version : ${CULBUTO} / ${PATINS}   (${pl.p.prix[CULBUTO].join("/")} € contre ${pl.p.prix[PATINS].join("/")} €)`);
    console.log(`      ${pl.garde.length} variantes complétées · ${pl.cree.length} créées → ${pl.garde.length + pl.cree.length} au total`);
    if (pl.colorisAPoser.length) {
      console.log(`      coloris posés : ${pl.colorisAPoser.map((c) => c.nom).join(" · ")}`);
      console.log(`         ${PE.map((c) => c.libelle).join(" · ")}`);
    }
    if (pl.aSupprimer.length) {
      console.log(`      questions parasites retirées : ${pl.aSupprimer.map((c) => `« ${c.nom} »`).join(" ")}`);
    }
  }

  if (renommer) {
    titre("UN TITRE RÉÉCRIT");
    console.log(`\n   ${renommer.v.nom.length} car.  ${renommer.v.nom}`);
    console.log(`   ${String(renommer.nom.length).padEnd(7)} → ${renommer.nom}`);
    console.log(`           /${renommer.slug}`);
  }

  if (refuses.length) {
    titre("FICHES LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  titre("LE COMPTE");
  const total = plans.reduce((n, pl) => n + pl.garde.length + pl.cree.length, 0);
  console.log(`   ${plans.length} poufs · ${total} variantes (${plans.reduce((n, pl) => n + pl.cree.length, 0)} nouvelles)`);
  console.log(`   ${plans.reduce((n, pl) => n + pl.colorisAPoser.length, 0)} axes coloris posés`);
  console.log(`   ${plans.reduce((n, pl) => n + pl.aSupprimer.length, 0)} questions parasites retirées`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const pl of plans) {
    // 1. L'axe version, avant toute réécriture de valeurs : c'est lui qui
    //    donne un sens à la clé « version » qu'on va poser partout.
    if (!pl.v.choix.some((c) => c.cle === "version")) {
      await prisma.choix.create({
        data: {
          vitrineId: pl.v.id, cle: "version", nom: "Version",
          nature: "tarifaire", rendu: "boutons", ordre: 0, origine: "tarif",
          valeurs: {
            create: [CULBUTO, PATINS].map((libelle, i) => ({
              libelle, ordre: i, suffixeReference: "",
            })),
          },
        },
      });
    }

    // 2. Les variantes existantes reçoivent leur version ; les manquantes
    //    naissent d'une copie, pour garder éco-contribution et poids.
    for (const g of pl.garde) {
      await prisma.combinaison.update({
        where: { id: g.id },
        data: { valeurs: g.valeurs, empreinte: g.empreinte, prixTarifHT: g.prix, pageCatalogue: PAGE },
      });
    }
    for (const c of pl.cree) {
      await prisma.combinaison.create({
        data: {
          vitrineId: pl.v.id, valeurs: c.valeurs, empreinte: c.empreinte,
          prixTarifHT: c.prix, referenceBase: pl.p.ref, pageCatalogue: PAGE,
          ecoContribution: pl.modele.ecoContribution, poids: pl.modele.poids,
        },
      });
    }

    // 3. Les coloris de polyéthylène.
    // Le rang s'incrémente : sans cela les deux coloris du pouf nu porteraient
    // le même, et s'afficheraient dans un ordre laissé au hasard.
    let rang = Math.max(1, ...pl.v.choix.map((x) => x.ordre));
    for (const col of pl.colorisAPoser) {
      rang += 1;
      await prisma.choix.create({
        data: {
          vitrineId: pl.v.id, cle: col.cle, nom: col.nom,
          nature: "finition", rendu: "pastilles", ordre: rang, origine: "tarif",
          valeurs: {
            create: PE.map((c, i) => ({
              libelle: c.libelle, couleur: c.couleur, ordre: i, suffixeReference: "",
            })),
          },
        },
      });
    }

    // 4. Le bruit, en dernier : ses clés ne servent plus à rien.
    for (const c of pl.aSupprimer) await prisma.choix.delete({ where: { id: c.id } });
  }
  console.log(`   ${plans.length} poufs repris.`);

  if (renommer) {
    await prisma.produitVitrine.update({
      where: { id: renommer.v.id }, data: { nom: renommer.nom, slug: renommer.slug },
    });
    console.log(`   1 titre réécrit.`);
  }

  titre("CONTRÔLE");
  const apres = await prisma.produitVitrine.findMany({
    where: { gamme: { nom: "Kulbu" } },
    orderBy: { nom: "asc" },
    select: {
      nom: true, publie: true,
      choix: { select: { nom: true, nature: true, _count: { select: { valeurs: true } } }, orderBy: { ordre: "asc" } },
      combinaisons: { select: { prixTarifHT: true } },
    },
  });
  for (const v of apres) {
    const prix = v.combinaisons.map((k) => k.prixTarifHT).filter((x) => x != null);
    const p = prix.length ? `${Math.min(...prix)}-${Math.max(...prix)} €` : "—";
    console.log(`   ${v.nom.slice(0, 50).padEnd(52)} ${String(v.combinaisons.length).padStart(2)} var · ${p.padStart(12)}`);
    console.log(`      ${v.choix.map((c) => `${c.nom}[${c.nature}](${c._count.valeurs})`).join(" ")}`);
  }
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
