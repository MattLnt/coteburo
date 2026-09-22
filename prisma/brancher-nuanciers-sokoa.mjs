// Branche les nuanciers Sokoa : après la catégorie, le tissu.
//
//   node prisma/brancher-nuanciers-sokoa.mjs
//   node prisma/brancher-nuanciers-sokoa.mjs --gamme=Wi-Max
//   node prisma/brancher-nuanciers-sokoa.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Cent quatre-vingt-onze fiches Sokoa demandent une CATÉGORIE de tissu —
//   B, B+, C, D, E, H — et s'arrêtent là. Le client choisit ce qu'il paie,
//   jamais ce qu'il reçoit. « Tissu C » n'est pas une couleur : c'est une
//   colonne de prix, 50 € le mètre, qui recouvre quatre-vingt-cinq tissus.
//
//   Les nuanciers sont pourtant en base, complets, avec le code fournisseur
//   et la photo de chaque échantillon — cent cinquante-sept revêtements. Ils
//   n'ont jamais été rattachés à une seule fiche Sokoa, quand Buronomic et
//   OfficePro le sont depuis toujours.
//
// CE QUE LE TARIF DIT, PAGE 199
//   Chaque gamme de revêtement appartient à une catégorie, et une seule :
//
//     B    38 €   X-Trevira · Napel
//     B+   44 €   Cura · Eden Free
//     C    50 €   Step Mélange · Noma · Atlantic · Blend · Natural Linen
//                 Ginkgo · Spazio · Boucle F.R. · Runner
//     D    86 €   Select · Silvertex B1 · Grain · 24N
//     E   116 €   Cuir noir
//     H   176 €   Cuir couleur
//
//   Et les pages 202 à 204 impriment chaque échantillon préfixé de sa
//   catégorie et de son code : « C SPJ », « D SLB », « B 066 ». Ce sont ces
//   codes qui distinguent les gammes à l'intérieur d'une catégorie, et c'est
//   par eux que les restrictions du tarif se lisent :
//
//     8xx Ginkgo    SMx Step Mélange   BLx Blend    NLx Natural Linen
//     NMx Noma      Axx Atlantic       SPx Spazio   BCx Boucle F.R.
//     R4x Runner    SLx Select         VTx Silvertex B1   GRx Grain
//
//   « Tissu C — Spazio exclu » veut donc dire : la catégorie C, moins les SPx.
//
// UNE ERREUR QUE LA PAGE 204 A ÉVITÉE
//   SL ressemble à Silvertex et VT à rien du tout. C'est l'inverse : page 204,
//   « SELECT | Laine » donne SLB SLC SLR SLF SLV SLP SLG SLN, et « SILVERTEX
//   B1 | PVC » donne VTC VTP VTR VTB VTG VTL VTT VTF VTV VTN. Les quatre
//   fiches étiquetées « Select » auraient reçu les dix mauvais tissus.
//
// CE QUE ÇA CHANGE POUR LE CLIENT
//   Une question de plus, « Revêtement », posée APRÈS la catégorie et garnie
//   des seuls tissus que cette catégorie autorise — avec leur photo. Le
//   filtrage n'est pas dans les données mais dans le modèle : une finition
//   tirée d'un nuancier n'est proposée que si la catégorie retenue désigne le
//   même nuancier (lib/modeleProduit.js, palettePermise).
//
// CE QU'IL N'AJOUTE PAS À LA RÉFÉRENCE
//   Rien. Le code du tissu figure dans le libellé — « SPJ — Jaune » — et le
//   tarif demande de le préciser à la commande. Tant que Sokoa n'a pas dit où
//   il s'insère dans la référence, le choix n'y participe pas : rangReference
//   reste vide, et aucune référence plausible et fausse ne part à l'usine.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const GAMME = (process.argv.find((a) => a.startsWith("--gamme=")) || "").slice(8) || null;
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

const CLE = "revetement";
const NOM = "Revêtement";

// ── Ce que chaque libellé de catégorie désigne ────────────────────────
//
// « palette » est le nuancier ; « garde » retient les tissus dont le nom
// commence par l'un de ces codes ; « retire » écarte les autres. Un libellé
// absent de cette table fait refuser la fiche : mieux vaut ne rien poser que
// poser les tissus d'une autre catégorie.
const CATEGORIES = {
  "Tissu B": { palette: "Tissu B" },
  "Tissu B+": { palette: "Tissu B+" },
  "Tissu C": { palette: "Tissu C" },
  "Tissu D": { palette: "Tissu D" },
  "Tissu E": { palette: "Tissu E" },
  "Tissu H": { palette: "Tissu H" },

  "Tissu C — Spazio exclu": { palette: "Tissu C", retire: ["SP"] },
  "Tissu C — Spazio exclu pour Tertio et TO32": { palette: "Tissu C", retire: ["SP"] },
  "Tissu C — Runner, Boucle, Spazio exclus": { palette: "Tissu C", retire: ["R4", "BC", "SP"] },
  "Tissu C — Enduits Ginkgo et Natural Linen exclus": { palette: "Tissu C", retire: ["8", "NL"] },
  "Tissu C — Tissus Blend, Boucle F.R., Spazio et Runner uniquement":
    { palette: "Tissu C", garde: ["BL", "BC", "SP", "R4"] },

  "Tissu B+ — Eden free exclu": { palette: "Tissu B+", retire: ["EF"] },
  "Tissu B — Xtrevira uniquement": { palette: "Tissu B", garde: ["B 0", "B 1", "B 2", "B 3", "B 5", "B 7"] },
  "Tissu B — Xtrevira exclus": { palette: "Tissu B", garde: ["B NN"] },

  // Des libellés qui nomment une gamme au lieu d'une catégorie. La page 199
  // range chacune dans la sienne.
  Select: { palette: "Tissu D", garde: ["SL"], nom: "Tissu D — Select uniquement" },
  "Select/Grain": { palette: "Tissu D", garde: ["SL", "GR"], nom: "Tissu D — Select et Grain uniquement" },
  "Eden Free": { palette: "Tissu B+", garde: ["EF"], nom: "Tissu B+ — Eden Free uniquement" },
  "X-Trevira": { palette: "Tissu B", garde: ["B 0", "B 1", "B 2", "B 3", "B 5", "B 7"], nom: "Tissu B — X-Trevira uniquement" },
  "X-trevira": { palette: "Tissu B", garde: ["B 0", "B 1", "B 2", "B 3", "B 5", "B 7"], nom: "Tissu B — X-Trevira uniquement" },

  // Wi-Max Ergo, avant et après prisma/decouper-wimax.mjs.
  "XF3/B": { palette: "Tissu B" },
  "Tissu B ou X-Trevira XF3": { palette: "Tissu B" },

  // Deux libellés où une note de bas de page a été avalée entière.
  "Tissu C — Runner exclu * B / B+ / C / D = Pas de passe poil pour les Rhune en enduits et en Spazio":
    { palette: "Tissu C", retire: ["R4"], nom: "Tissu C — Runner exclu" },
  "Tissu C — Spazio exclu Visiteurs assortis":
    { palette: "Tissu C", retire: ["SP"], nom: "Tissu C — Spazio exclu" },
};

const commence = (nom, codes) => codes.some((c) => nom.startsWith(c));

/** Les tissus qu'une catégorie ouvre, dans l'ordre du nuancier. */
function tissusDe(regle, nuanciers) {
  const p = nuanciers.get(regle.palette);
  if (!p) return null;
  return p.finitions.filter((f) => {
    if (regle.garde) return commence(f.nom, regle.garde);
    if (regle.retire) return !commence(f.nom, regle.retire);
    return true;
  });
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const nuanciers = new Map();
  for (const p of await prisma.paletteFinition.findMany({
    where: { marque: "Sokoa" },
    select: { id: true, nom: true, finitions: { select: { id: true, nom: true }, orderBy: { ordre: "asc" } } },
  })) nuanciers.set(p.nom, p);

  // ── Le filet : chaque règle doit retenir quelque chose ───────────────
  titre("VÉRIFICATION DES RÈGLES");
  let vides = 0;
  for (const [libelle, regle] of Object.entries(CATEGORIES)) {
    const t = tissusDe(regle, nuanciers);
    if (!t) { console.log(`   nuancier « ${regle.palette} » INTROUVABLE pour « ${libelle} »`); vides++; continue; }
    if (!t.length) { console.log(`   « ${libelle} » ne retient AUCUN tissu`); vides++; continue; }
    const total = nuanciers.get(regle.palette).finitions.length;
    if (t.length !== total || regle.garde || regle.retire) {
      console.log(`   ${String(t.length).padStart(3)}/${String(total).padEnd(3)} ${libelle.slice(0, 52).padEnd(54)} ${t.slice(0, 3).map((f) => f.nom).join(" · ")}`);
    }
  }
  if (vides) {
    titre(`${vides} RÈGLES SANS EFFET — RIEN NE SERA ÉCRIT`);
    process.exitCode = 1;
    return;
  }
  console.log(`   les ${Object.keys(CATEGORIES).length} règles retiennent toutes au moins un tissu.`);

  // ── Le plan ──────────────────────────────────────────────────────────
  const vitrines = await prisma.produitVitrine.findMany({
    where: {
      publie: true,
      gamme: { marque: { nom: "Sokoa" }, ...(GAMME ? { nom: { contains: GAMME, mode: "insensitive" } } : {}) },
      choix: { some: { nature: "tarifaire", valeurs: { some: { libelle: { startsWith: "Tissu " } } } } },
    },
    orderBy: { nom: "asc" },
    select: {
      id: true, nom: true, gamme: { select: { nom: true } },
      choix: {
        orderBy: { ordre: "asc" },
        select: { id: true, cle: true, nom: true, nature: true, ordre: true,
          valeurs: { orderBy: { ordre: "asc" }, select: { id: true, libelle: true, paletteId: true } } },
      },
    },
  });

  const plans = [];
  const refuses = [];
  const inconnus = new Map();

  for (const v of vitrines) {
    const categorie = v.choix.find((c) => c.nature === "tarifaire"
      && c.valeurs.some((x) => /^Tissu |^XF3\/B$|^Select|^Eden Free$|^X-[Tt]revira$/.test(x.libelle)));
    if (!categorie) { refuses.push(`${v.nom} — aucune question de catégorie`); continue; }
    if (v.choix.some((c) => c.cle === CLE)) continue;         // déjà branchée

    const regles = [];
    let manque = null;
    for (const x of categorie.valeurs) {
      const r = CATEGORIES[x.libelle];
      if (!r) { manque = x.libelle; break; }
      regles.push({ valeur: x, regle: r });
    }
    if (manque) {
      inconnus.set(manque, (inconnus.get(manque) || 0) + 1);
      refuses.push(`${v.nom} — libellé inconnu : « ${manque.slice(0, 48)} »`);
      continue;
    }

    // Deux valeurs sur le même nuancier avec des règles différentes : le
    // client ne pourrait plus savoir laquelle commande la liste.
    const parPalette = new Map();
    for (const r of regles) parPalette.set(r.regle.palette, (parPalette.get(r.regle.palette) || 0) + 1);
    const doublon = [...parPalette].find(([, n]) => n > 1);
    if (doublon) { refuses.push(`${v.nom} — deux catégories sur le nuancier « ${doublon[0]} »`); continue; }

    const tissus = [];
    for (const r of regles) {
      const p = nuanciers.get(r.regle.palette);
      for (const f of tissusDe(r.regle, nuanciers)) tissus.push({ f, paletteId: p.id });
    }

    plans.push({ v, categorie, regles, tissus });
  }

  titre(`${plans.length} FICHES BRANCHÉES`);
  const parGamme = new Map();
  for (const p of plans) {
    const g = p.v.gamme?.nom || "—";
    if (!parGamme.has(g)) parGamme.set(g, []);
    parGamme.get(g).push(p);
  }
  console.log("");
  for (const [g, liste] of [...parGamme].sort((a, b) => b[1].length - a[1].length).slice(0, 18)) {
    const n = Math.round(liste.reduce((s, p) => s + p.tissus.length, 0) / liste.length);
    console.log(`   ${String(liste.length).padStart(3)} fiches · ${String(n).padStart(3)} revêtements en moyenne   ${g}`);
  }
  if (parGamme.size > 18) console.log(`   … et ${parGamme.size - 18} autres gammes`);

  const renommes = plans.flatMap((p) => p.regles.filter((r) => r.regle.nom && r.regle.nom !== r.valeur.libelle));
  if (renommes.length) {
    titre("LIBELLÉS REDRESSÉS");
    const m = new Map();
    for (const r of renommes) m.set(`${r.valeur.libelle} ${r.regle.nom}`, (m.get(`${r.valeur.libelle} ${r.regle.nom}`) || 0) + 1);
    console.log("");
    for (const [k, n] of [...m].sort((a, b) => b[1] - a[1])) {
      const [avant, apres] = k.split(" ");
      console.log(`   ${String(n).padStart(4)}×  « ${avant.slice(0, 60)} »`);
      console.log(`            → « ${apres} »`);
    }
  }

  if (inconnus.size) {
    titre("LIBELLÉS QUE LA TABLE NE CONNAÎT PAS");
    console.log("");
    for (const [l, n] of [...inconnus].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(4)}×  ${l}`);
  }
  if (refuses.length) {
    titre(`${refuses.length} FICHES LAISSÉES TELLES QUELLES`);
    console.log("");
    for (const r of refuses.slice(0, 12)) console.log(`   ${r}`);
    if (refuses.length > 12) console.log(`   … et ${refuses.length - 12} autres`);
  }

  titre("LE COMPTE");
  const valeurs = plans.reduce((n, p) => n + p.tissus.length, 0);
  console.log(`   ${plans.length} fiches · ${valeurs} valeurs de revêtement créées`);
  console.log(`   ${plans.reduce((n, p) => n + p.regles.length, 0)} catégories rattachées à leur nuancier`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  let faites = 0;
  for (const p of plans) {
    // 1. La catégorie désigne son nuancier — c'est ce lien qui fait le filtre.
    for (const r of p.regles) {
      await prisma.valeurChoix.update({
        where: { id: r.valeur.id },
        data: {
          paletteId: nuanciers.get(r.regle.palette).id,
          ...(r.regle.nom && r.regle.nom !== r.valeur.libelle ? { libelle: r.regle.nom } : {}),
        },
      });
    }

    // 2. La question du revêtement, après tout le reste.
    await prisma.choix.create({
      data: {
        vitrineId: p.v.id, cle: CLE, nom: NOM,
        nature: "finition", rendu: "pastilles", origine: "tarif",
        ordre: Math.max(0, ...p.v.choix.map((c) => c.ordre)) + 1,
        // rangReference vide : voir l'en-tête.
        valeurs: {
          create: p.tissus.map((t, i) => ({
            libelle: t.f.nom, ordre: i, suffixeReference: "",
            modeleId: t.f.id, paletteId: t.paletteId,
          })),
        },
      },
    });
    faites++;
    if (faites % 25 === 0) console.log(`   ${faites}/${plans.length}…`);
  }
  console.log(`   ${faites} fiches branchées.`);

  titre("CONTRÔLE");
  const avec = await prisma.choix.count({ where: { cle: CLE, vitrine: { publie: true } } });
  const liees = await prisma.valeurChoix.count({
    where: { paletteId: { not: null }, choix: { vitrine: { publie: true, gamme: { marque: { nom: "Sokoa" } } } } },
  });
  console.log(`   fiches portant « ${NOM} » : ${avec}`);
  console.log(`   valeurs Sokoa rattachées à un nuancier : ${liees}`);
  console.log(`\n   Lancer ensuite : node prisma/verifier-configurateur.mjs`);
}

main()
  .catch((e) => { console.error(e.stack || e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
