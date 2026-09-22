// Les tables Sokoa cachent DEUX axes dans « Modèle », pas un.
//
//   node prisma/nommer-axes-tables-sokoa.mjs
//   node prisma/nommer-axes-tables-sokoa.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI UN SCRIPT À PART
//   prisma/nommer-axes-sokoa.mjs pose UN axe par fiche. Les tables Kanpoa et
//   Punta en portent deux dans la même référence : la forme ou la taille du
//   plateau, et son coloris.
//
//     KPDC/10   D mange-debout · C carré · 10 noir
//     KPDR/90   D mange-debout · R rond  · 90 blanc
//
// CE QU'ON A FAILLI SE TROMPER
//   Chez Kanpoa, la lettre n'a PAS le même sens d'une table à l'autre :
//
//     Table cafétéria    plateau carré → KPF R    plateau rond → KPF C
//     Table mange-debout plateau carré → KPD C    plateau rond → KPD R
//
//   C pour carré et R pour rond semblait évident ; c'est vrai de la
//   mange-debout et faux de la cafétéria. Le tarif, page 155, est formel.
//   D'où la table ci-dessous, écrite référence par référence plutôt que par
//   une règle sur la lettre.
//
// CE QUI N'EST PAS UN DÉCOUPAGE
//   Les deux formes de plateau vivent sous un MÊME en-tête de bloc, avec une
//   seule colonne REF — contrairement aux méridiennes Rhune, dont chaque
//   composition avait son en-tête et ses colonnes de prix. Ce sont donc deux
//   variantes d'un produit, pas deux produits.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PDF = "catalogue-2026/SOKOA_TARIF 2026_FR.pdf";
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);

const COLORIS_KANPOA = {
  10: { mot: "Noir", couleur: "#23262a", preuve: "Noir" },
  30: { mot: "Gris", couleur: "#8b8d8f", preuve: "Gris" },
  60: { mot: "Jaune Moutarde", couleur: "#d4a017", preuve: "Jaune Moutarde" },
  80: { mot: "Bordeaux", couleur: "#6b2131", preuve: "Bordeaux" },
  90: { mot: "Blanc", couleur: "#f2f0ec", preuve: "Blanc" },
};
const ORDRE_KANPOA = ["Noir", "Gris", "Jaune Moutarde", "Bordeaux", "Blanc"];

const TABLES = [
  {
    fiche: "KANPOA - Table cafétéria métal - Kanpoa by Colos", page: 155,
    axes: [
      { cle: "plateau", nom: "Forme du plateau",
        lire: (r) => r.slice(0, 4),
        codes: { KPFR: { mot: "Carré 70 × 70 cm", preuve: "Plateau carré 70x70cm" },
                 KPFC: { mot: "Rond ø 70 cm", preuve: "Plateau rond ø 70cm" } },
        ordre: ["Carré 70 × 70 cm", "Rond ø 70 cm"] },
      { cle: "coloris", nom: "Coloris",
        lire: (r) => r.slice(-2), codes: COLORIS_KANPOA, ordre: ORDRE_KANPOA },
    ],
  },
  {
    fiche: "KANPOA - Table mange-debout métal - Kanpoa by Colos", page: 155,
    axes: [
      { cle: "plateau", nom: "Forme du plateau",
        lire: (r) => r.slice(0, 4),
        codes: { KPDC: { mot: "Carré 60 × 60 cm", preuve: "Plateau carré 60x60cm" },
                 KPDR: { mot: "Rond ø 60 cm", preuve: "Plateau rond ø 60cm" } },
        ordre: ["Carré 60 × 60 cm", "Rond ø 60 cm"] },
      { cle: "coloris", nom: "Coloris",
        lire: (r) => r.slice(-2), codes: COLORIS_KANPOA, ordre: ORDRE_KANPOA },
    ],
  },
  {
    fiche: "Table basse, piètement époxy aluminium - Punta", page: 133,
    axes: [
      { cle: "plateau", nom: "Dimensions du plateau",
        lire: (r) => r.slice(0, 4),
        codes: { PNTC: { mot: "60 × 60 cm", preuve: "Plateau 60 x 60 cm" },
                 PNTR: { mot: "100 × 60 cm", preuve: "Plateau 100 x 60 cm" } },
        ordre: ["60 × 60 cm", "100 × 60 cm"] },
      { cle: "coloris", nom: "Coloris du plateau",
        lire: (r) => r.slice(-1),
        codes: { G: { mot: "Anthracite", couleur: "#3a3d40", preuve: "Anthracite" },
                 B: { mot: "Blanc", couleur: "#f2f0ec", preuve: "Blanc" } },
        ordre: ["Anthracite", "Blanc"] },
    ],
  },
  {
    fiche: "Table basse, piètement bois - Punta", page: 133,
    axes: [
      { cle: "plateau", nom: "Dimensions du plateau",
        lire: (r) => r.slice(0, 4),
        codes: { PBTC: { mot: "60 × 60 cm", preuve: "Plateau 60 x 60 cm" },
                 PBTR: { mot: "100 × 60 cm", preuve: "Plateau 100 x 60 cm" } },
        ordre: ["60 × 60 cm", "100 × 60 cm"] },
      { cle: "coloris", nom: "Coloris du plateau",
        lire: (r) => r.slice(-1),
        codes: { G: { mot: "Anthracite", couleur: "#3a3d40", preuve: "Anthracite" },
                 B: { mot: "Blanc", couleur: "#f2f0ec", preuve: "Blanc" } },
        ordre: ["Anthracite", "Blanc"] },
    ],
  },
];

async function textePage(doc, n) {
  const t = await (await doc.getPage(n)).getTextContent();
  return t.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const plans = [];
  const refuses = [];
  const preuves = new Map();

  for (const t of TABLES) {
    const v = await prisma.produitVitrine.findFirst({
      where: { nom: t.fiche },
      select: { id: true, nom: true,
        choix: { select: { id: true, cle: true, nom: true, ordre: true } },
        combinaisons: { select: { id: true, valeurs: true, referenceBase: true } } },
    });
    if (!v) { refuses.push(`${t.fiche} — introuvable`); continue; }
    const modele = v.choix.find((c) => /^(mod[èe]le|r[ée]f[ée]rence)$/i.test(c.nom));
    if (!modele) { refuses.push(`${t.fiche} — pas de question « Modèle »`); continue; }
    const prises = new Set(v.choix.filter((c) => c.id !== modele.id).map((c) => c.cle));
    const collision = t.axes.find((a) => prises.has(a.cle));
    if (collision) { refuses.push(`${t.fiche} — la clé « ${collision.cle} » est déjà prise`); continue; }

    const combos = [];
    let manque = null;
    for (const k of v.combinaisons) {
      const ref = String(k.referenceBase || "").trim();
      const { [modele.cle]: _vieux, ...reste } = k.valeurs || {};
      const valeurs = { ...reste };
      for (const a of t.axes) {
        const code = a.codes[a.lire(ref)];
        if (!code) { manque = `${ref} (axe ${a.cle})`; break; }
        valeurs[a.cle] = code.mot;
        if (!preuves.has(t.page)) preuves.set(t.page, new Set());
        preuves.get(t.page).add(code.preuve);
      }
      if (manque) break;
      combos.push({ id: k.id, valeurs, empreinte: empreinteDe(valeurs), ref });
    }
    if (manque) { refuses.push(`${t.fiche} — code illisible : ${manque}`); continue; }
    if (new Set(combos.map((c) => c.empreinte)).size !== combos.length) {
      refuses.push(`${t.fiche} — deux combinaisons se confondraient`); continue;
    }
    plans.push({ v, modele, t, combos });
  }

  titre("VÉRIFICATION CONTRE LE TARIF");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync(PDF)), useSystemFonts: true }).promise;
  let absentes = 0;
  for (const [page, mots] of [...preuves].sort((a, b) => a[0] - b[0])) {
    const texte = (await textePage(doc, page)).toLowerCase();
    const perdues = [...mots].filter((m) => !texte.includes(m.toLowerCase()));
    console.log(`   page ${page} — ${mots.size - perdues.length}/${mots.size} légendes retrouvées`);
    for (const m of perdues) { console.log(`      ABSENTE : « ${m} »`); absentes++; }
  }
  if (absentes) { titre(`${absentes} LÉGENDES INTROUVABLES — RIEN NE SERA ÉCRIT`); process.exitCode = 1; return; }

  titre(`${plans.length} FICHES À CORRIGER`);
  for (const p of plans) {
    console.log(`\n   ${p.v.nom}`);
    for (const a of p.t.axes) {
      const mots = a.ordre.filter((m) => p.combos.some((c) => c.valeurs[a.cle] === m));
      console.log(`      « ${a.nom} » : ${mots.join(" · ")}`);
    }
    console.log(`      ${p.combos.length} combinaisons`);
  }
  if (refuses.length) {
    titre(`${refuses.length} FICHES LAISSÉES TELLES QUELLES`);
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }

  for (const p of plans) {
    // Le premier axe reprend le choix « Modèle » ; le second est créé.
    for (const [i, a] of p.t.axes.entries()) {
      const mots = a.ordre.filter((m) => p.combos.some((c) => c.valeurs[a.cle] === m));
      let choixId;
      if (i === 0) {
        // TARIFAIRE : la référence de base change avec lui.
        await prisma.choix.update({ where: { id: p.modele.id },
          data: { cle: a.cle, nom: a.nom, nature: "tarifaire", rendu: "boutons" } });
        await prisma.valeurChoix.deleteMany({ where: { choixId: p.modele.id } });
        choixId = p.modele.id;
      } else {
        const neuf = await prisma.choix.create({
          data: { vitrineId: p.v.id, cle: a.cle, nom: a.nom, nature: "tarifaire",
            rendu: "pastilles", ordre: p.modele.ordre + i },
        });
        choixId = neuf.id;
      }
      for (const [j, mot] of mots.entries()) {
        const code = Object.values(a.codes).find((c) => c.mot === mot);
        await prisma.valeurChoix.create({
          data: { choixId, libelle: mot, ordre: j, couleur: code?.couleur ?? null },
        });
      }
    }
    for (const c of p.combos) {
      await prisma.combinaison.update({ where: { id: c.id }, data: { valeurs: c.valeurs, empreinte: c.empreinte } });
    }
  }
  console.log("\nÉcrit.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
