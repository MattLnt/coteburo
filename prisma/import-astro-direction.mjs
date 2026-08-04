import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();

const NOM_GAMME = "ASTRO DIRECTION";

// Finitions
const METAL = [
  { nom: "Aluminium",   couleur: "#9a9a94", ordre: 0 },
  { nom: "Noir métal",  couleur: "#23262a", ordre: 1 },
  { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 2 },
];
const PLATEAU = [
  { nom: "Blanc",     couleur: "#f2f0ec", ordre: 0 },
  { nom: "Chêne fil", couleur: "#c9a876", ordre: 1 },
  { nom: "Nebraska",  couleur: "#b89b73", ordre: 2 },
  { nom: "Timber",    couleur: "#8a6a4a", ordre: 3 },
  { nom: "Yukon",     couleur: "#6e5b4a", ordre: 4 },
];

// Hex par teinte (pour construire les paires bureau/console)
const HEX = { "Blanc": "#f2f0ec", "Chêne fil": "#c9a876", "Nebraska": "#b89b73", "Timber": "#8a6a4a", "Yukon": "#6e5b4a", "Noir": "#23262a" };

// Les 18 paires réelles (plateau bureau / plateau console) : console = assortie, ou Blanc, ou Noir ; le bureau Blanc accepte tout
const PAIRES = [
  ["Blanc", "Blanc"], ["Blanc", "Chêne fil"], ["Blanc", "Nebraska"], ["Blanc", "Timber"], ["Blanc", "Yukon"], ["Blanc", "Noir"],
  ["Chêne fil", "Chêne fil"], ["Chêne fil", "Blanc"], ["Chêne fil", "Noir"],
  ["Nebraska", "Nebraska"], ["Nebraska", "Blanc"], ["Nebraska", "Noir"],
  ["Timber", "Timber"], ["Timber", "Blanc"], ["Timber", "Noir"],
  ["Yukon", "Yukon"], ["Yukon", "Blanc"], ["Yukon", "Noir"],
];
const COLORIS_CONSOLE = PAIRES.map(([bureau, console], i) => ({
  nom: `${bureau} / ${console}`,   // plateau bureau / plateau console
  couleur: HEX[bureau],
  ordre: i,
}));

function findVitrine(gamme, produits, nom) {
  const v = produits.find((p) => norm(p.nom) === norm(nom));
  if (!v) {
    console.error(`⚠ Produit "${nom}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => ` - ${p.nom}`).join("\n")}`);
  }
  return v;
}

async function ecrireFinitions(vitrineId, groupes) {
  await prisma.groupeFinition.deleteMany({ where: { vitrineId } });
  let ordre = 0;
  for (const g of groupes) {
    await prisma.groupeFinition.create({
      data: { nom: g.nom, vitrineId, ordre: ordre++, finitions: { create: g.finitions } },
    });
  }
}

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) {
    console.error(`Gamme "${NOM_GAMME}" introuvable. Gammes existantes :`);
    console.error(gammes.map((g) => ` - ${g.nom}`).join("\n"));
    process.exit(1);
  }
  const produits = await prisma.produitVitrine.findMany({
    where: { gammeId: gamme.id },
    select: { id: true, nom: true },
  });

  // ─── Produit 1 : VDF suspendu L170 (accessoire, réf unique) ───
  const vdf = findVitrine(gamme, produits, "VDF suspendu L170");
  if (vdf) {
    await prisma.produitVitrine.update({
      where: { id: vdf.id },
      data: {
        axesDeclinaisons: [],
        declinaisons: [
          { id: uid(), valeurs: {}, prixTarifHT: "124", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "AQ99" },
        ],
      },
    });
    await ecrireFinitions(vdf.id, [
      { nom: "Structure métal", finitions: METAL },
      { nom: "Plateau", finitions: PLATEAU },
    ]);
    console.log(`  ✓ VDF suspendu L170 — 1 combinaison + 2 groupes de finitions`);
  }

  // ─── Produit 2 : Bureau direction droit (sans console, réf unique) ───
  const bureau = findVitrine(gamme, produits, "Bureau direction droit");
  if (bureau) {
    await prisma.produitVitrine.update({
      where: { id: bureau.id },
      data: {
        axesDeclinaisons: [],
        declinaisons: [
          { id: uid(), valeurs: {}, prixTarifHT: "810", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DH50" },
        ],
      },
    });
    await ecrireFinitions(bureau.id, [
      { nom: "Structure métal", finitions: METAL },
      { nom: "Plateau", finitions: PLATEAU },
    ]);
    console.log(`  ✓ Bureau direction droit — 1 combinaison + 2 groupes de finitions`);
  }

  // ─── Produit 3 : Bureau direction + Console B-Box (axes Console × Poignée) ───
  const console_ = findVitrine(gamme, produits, "Bureau direction + Console B-Box");
  if (console_) {
    const axeConsole = { id: "console", nom: "Console", valeurs: ["1 porte coulissante", "2 portes coulissantes + 2 tiroirs"] };
    const axePoignee = { id: "poignee", nom: "Poignée", valeurs: ["Classique", "Design"] };
    // valeurs: { console, poignee } · réf = code racine + C/D
    const rows = [
      ["1 porte coulissante",                "Classique", "1195", "ED70C"],
      ["1 porte coulissante",                "Design",    "1200", "ED70D"],
      ["2 portes coulissantes + 2 tiroirs",  "Classique", "1355", "ED71C"],
      ["2 portes coulissantes + 2 tiroirs",  "Design",    "1360", "ED71D"],
    ];
    const declinaisons = rows.map(([console, poignee, prix, ref]) => ({
      id: uid(), valeurs: { console, poignee }, prixTarifHT: prix, prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref,
    }));
    await prisma.produitVitrine.update({
      where: { id: console_.id },
      data: { axesDeclinaisons: [axeConsole, axePoignee], declinaisons },
    });
    await ecrireFinitions(console_.id, [
      { nom: "Structure métal", finitions: METAL },
      { nom: "Coloris plateau", finitions: COLORIS_CONSOLE },  // 18 paires réelles bureau / console
    ]);
    console.log(`  ✓ Bureau direction + Console B-Box — ${declinaisons.length} combinaisons + Structure métal + 18 coloris plateau`);
  }

  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
