import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();

const NOM_GAMME = "Essentiel";

// Finitions (sans impact prix)
const METAL = [
  { nom: "Aluminium",   couleur: "#9a9a94", ordre: 0 },
  { nom: "Noir métal",  couleur: "#23262a", ordre: 1 },
  { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 2 },
];
const PLATEAU = [
  { nom: "Blanc",     couleur: "#f2f0ec", ordre: 0 },
  { nom: "Chêne fil", couleur: "#c9a876", ordre: 1 },
  { nom: "Hêtre",     couleur: "#d8b384", ordre: 2 },
  { nom: "Nebraska",  couleur: "#b89b73", ordre: 3 },
  { nom: "Timber",    couleur: "#8a6a4a", ordre: 4 },
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

  // ─── Produit 1 : Bureau plan droit (Longueur × Type) ───
  const planDroit = findVitrine(gamme, produits, "Bureau plan droit");
  if (planDroit) {
    const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["80 cm", "120 cm", "140 cm", "160 cm", "180 cm"] };
    const axeType     = { id: "type",     nom: "Type",     valeurs: ["VDF Mélamine", "Poutre"] };
    const rows = [
      // VDF Mélamine
      ["80 cm",  "VDF Mélamine", "330", "AR95"],
      ["120 cm", "VDF Mélamine", "360", "AR96"],
      ["140 cm", "VDF Mélamine", "370", "AR97"],
      ["160 cm", "VDF Mélamine", "380", "AR98"],
      ["180 cm", "VDF Mélamine", "390", "AR99"],
      // Poutre
      ["80 cm",  "Poutre", "340", "AT07"],
      ["120 cm", "Poutre", "370", "AT08"],
      ["140 cm", "Poutre", "380", "AT09"],
      ["160 cm", "Poutre", "390", "AT10"],
      ["180 cm", "Poutre", "400", "AT11"],
    ];
    const declinaisons = rows.map(([longueur, type, prix, ref]) => ({
      id: uid(), valeurs: { longueur, type }, prixTarifHT: prix, prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref,
    }));
    await prisma.produitVitrine.update({
      where: { id: planDroit.id },
      data: { axesDeclinaisons: [axeLongueur, axeType], declinaisons },
    });
    await ecrireFinitions(planDroit.id, [
      { nom: "Structure métal", finitions: METAL },
      { nom: "Plateau", finitions: PLATEAU },
    ]);
    console.log(`  ✓ Bureau plan droit — ${declinaisons.length} combinaisons + 2 groupes de finitions`);
  }

  // ─── Produit 2 : Bureau plan compact (Longueur × Retour × Type) ───
  const planCompact = findVitrine(gamme, produits, "Bureau plan compact");
  if (planCompact) {
    const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["160 cm", "180 cm"] };
    const axeRetour   = { id: "retour",   nom: "Retour",   valeurs: ["Droit", "Gauche"] };
    const axeType     = { id: "type",     nom: "Type",     valeurs: ["VDF Mélamine", "Poutre"] };
    const rows = [
      // VDF Mélamine
      ["160 cm", "Droit",  "VDF Mélamine", "490", "AS02"],
      ["160 cm", "Gauche", "VDF Mélamine", "490", "AS03"],
      ["180 cm", "Droit",  "VDF Mélamine", "510", "AS04"],
      ["180 cm", "Gauche", "VDF Mélamine", "510", "AS05"],
      // Poutre
      ["160 cm", "Droit",  "Poutre", "500", "AT14"],
      ["160 cm", "Gauche", "Poutre", "500", "AT15"],
      ["180 cm", "Droit",  "Poutre", "520", "AT16"],
      ["180 cm", "Gauche", "Poutre", "520", "AT17"],
    ];
    const declinaisons = rows.map(([longueur, retour, type, prix, ref]) => ({
      id: uid(), valeurs: { longueur, retour, type }, prixTarifHT: prix, prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref,
    }));
    await prisma.produitVitrine.update({
      where: { id: planCompact.id },
      data: { axesDeclinaisons: [axeLongueur, axeRetour, axeType], declinaisons },
    });
    await ecrireFinitions(planCompact.id, [
      { nom: "Structure métal", finitions: METAL },
      { nom: "Plateau", finitions: PLATEAU },
    ]);
    console.log(`  ✓ Bureau plan compact — ${declinaisons.length} combinaisons + 2 groupes de finitions`);
  }

  // ─── Produit 3 : Kit 2 enjoliveurs métal (accessoire, référence unique) ───
  const kit = findVitrine(gamme, produits, "Kit 2 enjoliveurs métal");
  if (kit) {
    await prisma.produitVitrine.update({
      where: { id: kit.id },
      data: {
        axesDeclinaisons: [],
        declinaisons: [
          { id: uid(), valeurs: {}, prixTarifHT: "52", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH67" },
        ],
      },
    });
    await ecrireFinitions(kit.id, [{ nom: "Structure métal", finitions: METAL }]);
    console.log(`  ✓ Kit 2 enjoliveurs métal — 1 combinaison + 1 groupe de finitions`);
  }

  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
