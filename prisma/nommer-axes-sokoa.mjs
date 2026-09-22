// Nomme les axes cachés dans « Modèle » chez Sokoa, d'après le tarif.
//
//   node prisma/nommer-axes-sokoa.mjs
//   node prisma/nommer-axes-sokoa.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Chez Sokoa l'axe caché n'est pas écrit dans le libellé — il est dans la
//   référence. « Lounge dos haut avec têtière (DOB0/3) » et « … (DOB0/7) »
//   sont le même texte à un caractère près, et ce caractère, le tarif le
//   nomme en toutes lettres à côté de la référence :
//
//     page 120   DOA1/3  « Base giratoire pyramidale noire »
//                DOA1/7  « Base giratoire pyramidale blanche »
//
//   Rien n'est déduit d'un ordre d'apparition ni d'une symétrie supposée :
//   chaque libellé qu'on pose est cherché dans la page qui le donne, et le
//   script n'écrit rien s'il en manque un seul.
//
// CE QUE CE SCRIPT NE TRAITE PAS
//   Les fiches qui fondent plusieurs blocs du tarif. Leur donner un nom d'axe
//   reviendrait à baptiser proprement un regroupement inventé — c'est un
//   découpage qu'il leur faut, pas un nom. Elles sont signalées et laissées :
//
//     Sièges Hauts  « AlaiaT lift haut » porte aussi TO32/20 et TO32/00,
//                   qui sont le Torino, un autre siège.
//     Kanpoa        une fiche par forme de plateau dans le tarif, carré et
//                   rond, fondues en une.
//     Punta         idem, deux tailles de plateau et deux prix.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PDF = "catalogue-2026/SOKOA_TARIF 2026_FR.pdf";
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);

// Pour chaque gamme : la page, le nom de l'axe, et ce que le tarif écrit à
// côté de chaque suffixe. `preuve` est le texte à retrouver dans la page —
// celui du tarif, pas le nôtre, quand on reformule pour le client.
const TABLES = [
  {
    gamme: "Eden", page: 29, cle: "finition-metal", nom: "Finition du métal",
    // « 3 finitions de métal pour les accotoirs et la base ».
    codes: {
      33: { mot: "Époxy noir", preuve: "base époxy noir" },
      72: { mot: "Époxy blanc", preuve: "base époxy blanc" },
      51: { mot: "Aluminium poli", preuve: "base alu poli" },
    },
    ordre: ["Époxy noir", "Époxy blanc", "Aluminium poli"],
  },
  {
    gamme: "Azkar", page: 28, cle: "accotoirs", nom: "Accotoirs",
    codes: {
      55: { mot: "Réglables 4D", preuve: "Accotoirs 4D" },
      51: { mot: "Fixes, fût aluminium poli", preuve: "Accotoirs fixes alu poli" },
      50: { mot: "Sans accotoirs", preuve: "Sans accotoirs" },
    },
    ordre: ["Réglables 4D", "Fixes, fût aluminium poli", "Sans accotoirs"],
  },
  {
    gamme: "Luma", page: 66, cle: "finition", nom: "Finition",
    codes: {
      N1: { mot: "PP noir, résille noire", preuve: "Finition PP noir, résille noire" },
      B1: { mot: "PP blanc, résille grise", preuve: "Finition PP blanc, résille grise" },
    },
    ordre: ["PP noir, résille noire", "PP blanc, résille grise"],
  },
  {
    gamme: "Bero", page: 67, cle: "base", nom: "Finition de la base",
    // Le dernier chiffre dit chaise (0) ou fauteuil (1) — il ne varie pas
    // dans une fiche. Le PREMIER caractère dit la base.
    codes: {
      30: { mot: "Noire", preuve: "Base, roulettes et lift : NOIR" },
      70: { mot: "Blanche", preuve: "Base, roulettes et lift : BLANC" },
      31: { mot: "Noire", preuve: "Base, roulettes et lift : NOIR" },
      71: { mot: "Blanche", preuve: "Base, roulettes et lift : BLANC" },
      10: { mot: "Noire", preuve: "Base pyramidale, patins et lift : NOIR" },
      B0: { mot: "Blanche, patins noirs", preuve: "Base pyramidale, lift : BLANC" },
      11: { mot: "Noire", preuve: "Base pyramidale, patins et lift : NOIR" },
      B1: { mot: "Blanche, patins noirs", preuve: "Base pyramidale, lift : BLANC" },
    },
    ordre: ["Noire", "Blanche", "Blanche, patins noirs"],
  },
  {
    gamme: "Ildo", page: 120, cle: "pietement", nom: "Piétement",
    codes: {
      3: { mot: "Giratoire pyramidal noir", preuve: "Base giratoire pyramidale noire" },
      7: { mot: "Giratoire pyramidal blanc", preuve: "Base giratoire pyramidale blanche" },
      N: { mot: "Giratoire plat noir", preuve: "Base giratoire plate noire" },
      // Pas « plate blanche » : le tarif écrit « alu poli ». La symétrie avec
      // /3 et /7 m'avait fait supposer le blanc ; le filet l'a refusé.
      P: { mot: "Giratoire plat aluminium poli", preuve: "Base giratoire plate alu poli" },
    },
    ordre: ["Giratoire pyramidal noir", "Giratoire pyramidal blanc",
      "Giratoire plat noir", "Giratoire plat aluminium poli"],
  },
];

/** Le suffixe d'une référence Sokoa : ce qui suit la barre. */
const suffixeDe = (ref) => /\/([A-Z0-9]{1,2})$/.exec(String(ref || "").trim())?.[1] ?? null;

async function textePage(doc, n) {
  const t = await (await doc.getPage(n)).getTextContent();
  return t.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  // ── Le plan ─────────────────────────────────────────────────────────
  const plans = [];
  const refuses = [];
  const preuvesVoulues = new Map();     // page → mots à retrouver

  for (const table of TABLES) {
    const vitrines = await prisma.produitVitrine.findMany({
      where: { publie: true, accessoireSeul: false, gamme: { nom: table.gamme } },
      select: { id: true, nom: true,
        choix: { select: { id: true, cle: true, nom: true, ordre: true } },
        combinaisons: { select: { id: true, valeurs: true, referenceBase: true } } },
    });
    if (!vitrines.length) { refuses.push(`gamme « ${table.gamme} » — aucune fiche publiée`); continue; }

    for (const v of vitrines) {
      const modele = v.choix.find((c) => /^(mod[èe]le|r[ée]f[ée]rence)$/i.test(c.nom));
      if (!modele) continue;

      // Une fiche qui fond plusieurs blocs se reconnaît à sa RACINE : si la
      // partie avant la barre varie autrement que par le suffixe décodé,
      // c'est un autre produit.
      const racines = new Set(v.combinaisons.map((k) => String(k.referenceBase).split("/")[0].slice(0, 2)));
      if (racines.size > 1) {
        refuses.push(`${v.nom} — ${racines.size} produits : ${[...racines].join(", ")} — à découper, pas à nommer`);
        continue;
      }

      const combos = [];
      let manque = null;
      for (const k of v.combinaisons) {
        const s = suffixeDe(k.referenceBase);
        const code = s && table.codes[s];
        if (!code) { manque = k.referenceBase; break; }
        const { [modele.cle]: _vieux, ...reste } = k.valeurs || {};
        const valeurs = { ...reste, [table.cle]: code.mot };
        combos.push({ id: k.id, valeurs, empreinte: empreinteDe(valeurs), mot: code.mot, preuve: code.preuve });
      }
      if (manque) { refuses.push(`${v.nom} — suffixe de « ${manque} » absent de la table ${table.gamme}`); continue; }
      if (new Set(combos.map((c) => c.empreinte)).size !== combos.length) {
        refuses.push(`${v.nom} — deux combinaisons se confondraient`); continue;
      }
      if (v.choix.some((c) => c.id !== modele.id && c.cle === table.cle)) {
        refuses.push(`${v.nom} — la clé « ${table.cle} » est déjà prise`); continue;
      }

      if (!preuvesVoulues.has(table.page)) preuvesVoulues.set(table.page, new Set());
      for (const c of combos) preuvesVoulues.get(table.page).add(c.preuve);

      plans.push({ v, modele, table, combos });
    }
  }

  // ── Le filet : chaque légende posée est sur sa page ──────────────────
  titre("VÉRIFICATION CONTRE LE TARIF");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync(PDF)), useSystemFonts: true }).promise;
  let absentes = 0;
  for (const [page, mots] of [...preuvesVoulues].sort((a, b) => a[0] - b[0])) {
    const texte = (await textePage(doc, page)).toLowerCase();
    const perdues = [...mots].filter((m) => !texte.includes(m.toLowerCase()));
    console.log(`   page ${String(page).padStart(3)} — ${mots.size - perdues.length}/${mots.size} légendes retrouvées`);
    for (const m of perdues) { console.log(`      ABSENTE : « ${m} »`); absentes++; }
  }
  if (absentes) {
    titre(`${absentes} LÉGENDES INTROUVABLES — RIEN NE SERA ÉCRIT`);
    console.log("\n   Le tarif ne dit pas ce que j'allais écrire. On ne devine pas.");
    process.exitCode = 1;
    return;
  }

  // ── Le rapport ──────────────────────────────────────────────────────
  titre(`${plans.length} FICHES À CORRIGER`);
  const parGamme = new Map();
  for (const p of plans) {
    if (!parGamme.has(p.table.gamme)) parGamme.set(p.table.gamme, []);
    parGamme.get(p.table.gamme).push(p);
  }
  for (const [g, liste] of parGamme) {
    console.log(`\n   ── ${g} · page ${liste[0].table.page} → question « ${liste[0].table.nom} »`);
    for (const p of liste) {
      const mots = [...new Set(p.combos.map((c) => c.mot))];
      console.log(`      ${p.v.nom.replace(/ - [^-]+$/, "").slice(0, 52).padEnd(54)} ${mots.join(" · ")}`);
    }
  }

  if (refuses.length) {
    titre(`${refuses.length} FICHES LAISSÉES TELLES QUELLES`);
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  titre("LE COMPTE");
  console.log(`   ${plans.length} fiches · ${plans.reduce((n, p) => n + p.combos.length, 0)} combinaisons réécrites`);

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }

  for (const p of plans) {
    const mots = [...new Set(p.combos.map((c) => c.mot))];
    const ordonnes = p.table.ordre.filter((m) => mots.includes(m));
    // Le choix d'abord : c'est lui qui peut buter sur une clé déjà prise.
    await prisma.choix.update({
      where: { id: p.modele.id },
      // L'axe SÉLECTIONNE la combinaison — la référence de base change avec
      // lui — donc il est tarifaire, pas finition.
      data: { cle: p.table.cle, nom: p.table.nom, nature: "tarifaire" },
    });
    await prisma.valeurChoix.deleteMany({ where: { choixId: p.modele.id } });
    for (const [i, mot] of ordonnes.entries()) {
      await prisma.valeurChoix.create({ data: { choixId: p.modele.id, libelle: mot, ordre: i } });
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
