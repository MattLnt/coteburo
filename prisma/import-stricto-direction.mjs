import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();

const NOM_GAMME = "STRICTO DIRECTION";

// Structure toujours noire (aucun choix métal)
const METAL_NOIR = [{ nom: "Noir métal", couleur: "#23262a", ordre: 0 }];

// Plateau 7 teintes (produits sans meuble)
const PLATEAU = [
  { nom: "Argile",    couleur: "#a08d7c", ordre: 0 },
  { nom: "Blanc",     couleur: "#f2f0ec", ordre: 1 },
  { nom: "Chêne fil", couleur: "#c9a876", ordre: 2 },
  { nom: "Nebraska",  couleur: "#b89b73", ordre: 3 },
  { nom: "Noir",      couleur: "#23262a", ordre: 4 },
  { nom: "Timber",    couleur: "#8a6a4a", ordre: 5 },
  { nom: "Yukon",     couleur: "#6e5b4a", ordre: 6 },
];

// Coloris plateau bureau / meuble : les 37 paires réelles (meuble = Argile/Blanc/Noir ou assorti ; bureau Argile/Blanc/Noir acceptent tout)
const COLORIS_MEUBLE = [
  { nom: "Argile / Argile", couleur: "#a08d7c", ordre: 0 },
  { nom: "Argile / Blanc", couleur: "#a08d7c", ordre: 1 },
  { nom: "Argile / Chêne fil", couleur: "#a08d7c", ordre: 2 },
  { nom: "Argile / Nebraska", couleur: "#a08d7c", ordre: 3 },
  { nom: "Argile / Noir", couleur: "#a08d7c", ordre: 4 },
  { nom: "Argile / Timber", couleur: "#a08d7c", ordre: 5 },
  { nom: "Argile / Yukon", couleur: "#a08d7c", ordre: 6 },
  { nom: "Blanc / Argile", couleur: "#f2f0ec", ordre: 7 },
  { nom: "Blanc / Blanc", couleur: "#f2f0ec", ordre: 8 },
  { nom: "Blanc / Chêne fil", couleur: "#f2f0ec", ordre: 9 },
  { nom: "Blanc / Nebraska", couleur: "#f2f0ec", ordre: 10 },
  { nom: "Blanc / Noir", couleur: "#f2f0ec", ordre: 11 },
  { nom: "Blanc / Timber", couleur: "#f2f0ec", ordre: 12 },
  { nom: "Blanc / Yukon", couleur: "#f2f0ec", ordre: 13 },
  { nom: "Chêne fil / Argile", couleur: "#c9a876", ordre: 14 },
  { nom: "Chêne fil / Blanc", couleur: "#c9a876", ordre: 15 },
  { nom: "Chêne fil / Chêne fil", couleur: "#c9a876", ordre: 16 },
  { nom: "Chêne fil / Noir", couleur: "#c9a876", ordre: 17 },
  { nom: "Nebraska / Argile", couleur: "#b89b73", ordre: 18 },
  { nom: "Nebraska / Blanc", couleur: "#b89b73", ordre: 19 },
  { nom: "Nebraska / Nebraska", couleur: "#b89b73", ordre: 20 },
  { nom: "Nebraska / Noir", couleur: "#b89b73", ordre: 21 },
  { nom: "Noir / Argile", couleur: "#23262a", ordre: 22 },
  { nom: "Noir / Blanc", couleur: "#23262a", ordre: 23 },
  { nom: "Noir / Chêne fil", couleur: "#23262a", ordre: 24 },
  { nom: "Noir / Nebraska", couleur: "#23262a", ordre: 25 },
  { nom: "Noir / Noir", couleur: "#23262a", ordre: 26 },
  { nom: "Noir / Timber", couleur: "#23262a", ordre: 27 },
  { nom: "Noir / Yukon", couleur: "#23262a", ordre: 28 },
  { nom: "Timber / Argile", couleur: "#8a6a4a", ordre: 29 },
  { nom: "Timber / Blanc", couleur: "#8a6a4a", ordre: 30 },
  { nom: "Timber / Timber", couleur: "#8a6a4a", ordre: 31 },
  { nom: "Timber / Noir", couleur: "#8a6a4a", ordre: 32 },
  { nom: "Yukon / Argile", couleur: "#6e5b4a", ordre: 33 },
  { nom: "Yukon / Blanc", couleur: "#6e5b4a", ordre: 34 },
  { nom: "Yukon / Yukon", couleur: "#6e5b4a", ordre: 35 },
  { nom: "Yukon / Noir", couleur: "#6e5b4a", ordre: 36 },
];

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

  // ─── Produit 1 : Bloc rangement 1 porte à encastrer (accessoire, réf unique) ───
  const bloc = findVitrine(gamme, produits, "Bloc rangement 1 porte à encastrer");
  if (bloc) {
    await prisma.produitVitrine.update({
      where: { id: bloc.id },
      data: {
        axesDeclinaisons: [],
        declinaisons: [
          { id: uid(), valeurs: {}, prixTarifHT: "155", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BS84" },
        ],
      },
    });
    await ecrireFinitions(bloc.id, [{ nom: "Coloris", finitions: [{ nom: "Noir", couleur: "#23262a", ordre: 0 }] }]);
    console.log(`  ✓ Bloc rangement 1 porte à encastrer — 1 combinaison`);
  }

  // ─── Produit 2 : Extension / retour (axe Longueur) ───
  const ext = findVitrine(gamme, produits, "Extension / retour");
  if (ext) {
    const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["80 cm", "100 cm"] };
    const rows = [
      ["80 cm",  "310", "DW64"],
      ["100 cm", "390", "DW83"],
    ];
    const declinaisons = rows.map(([longueur, prix, ref]) => ({
      id: uid(), valeurs: { longueur }, prixTarifHT: prix, prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref,
    }));
    await prisma.produitVitrine.update({
      where: { id: ext.id },
      data: { axesDeclinaisons: [axeLongueur], declinaisons },
    });
    await ecrireFinitions(ext.id, [
      { nom: "Structure métal", finitions: METAL_NOIR },
      { nom: "Plateau", finitions: PLATEAU },
    ]);
    console.log(`  ✓ Extension / retour — ${declinaisons.length} combinaisons`);
  }

  // ─── Produit 3 : Bureau plan droit (sans meuble, axe Longueur) ───
  const planDroit = findVitrine(gamme, produits, "Bureau plan droit");
  if (planDroit) {
    const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["180 cm", "200 cm"] };
    const rows = [
      ["180 cm", "820", "DW81"],
      ["200 cm", "850", "DW82"],
    ];
    const declinaisons = rows.map(([longueur, prix, ref]) => ({
      id: uid(), valeurs: { longueur }, prixTarifHT: prix, prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref,
    }));
    await prisma.produitVitrine.update({
      where: { id: planDroit.id },
      data: { axesDeclinaisons: [axeLongueur], declinaisons },
    });
    await ecrireFinitions(planDroit.id, [
      { nom: "Structure métal", finitions: METAL_NOIR },
      { nom: "Plateau", finitions: PLATEAU },
    ]);
    console.log(`  ✓ Bureau plan droit — ${declinaisons.length} combinaisons`);
  }

  // ─── Produit 4 : Bureau plan droit + Meuble retour (axes Longueur × Retour) ───
  const avecMeuble = findVitrine(gamme, produits, "Bureau plan droit + Meuble retour");
  if (avecMeuble) {
    const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["180 cm", "200 cm"] };
    const axeRetour   = { id: "retour",   nom: "Retour",   valeurs: ["Droit", "Gauche"] };
    const rows = [
      ["180 cm", "Droit",  "1560", "DW84"],
      ["180 cm", "Gauche", "1560", "DW85"],
      ["200 cm", "Droit",  "1590", "DW86"],
      ["200 cm", "Gauche", "1590", "DW87"],
    ];
    const declinaisons = rows.map(([longueur, retour, prix, ref]) => ({
      id: uid(), valeurs: { longueur, retour }, prixTarifHT: prix, prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref,
    }));
    await prisma.produitVitrine.update({
      where: { id: avecMeuble.id },
      data: { axesDeclinaisons: [axeLongueur, axeRetour], declinaisons },
    });
    await ecrireFinitions(avecMeuble.id, [
      { nom: "Structure métal", finitions: METAL_NOIR },
      { nom: "Coloris plateau", finitions: COLORIS_MEUBLE },  // 37 paires bureau / meuble réelles
    ]);
    console.log(`  ✓ Bureau plan droit + Meuble retour — ${declinaisons.length} combinaisons + 37 coloris plateau`);
  }

  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
