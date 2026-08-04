import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Plan droit Console B-Box", gamme: { nom: "Partage" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Plan droit Console B-Box" dans la gamme "Partage".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  // Seule la Poignée (Classique/Design) change le prix (+5€) → axe de Déclinaison.
  // Structure métal / Plateau bureau / Plateau console sont des Finitions pures (aucun impact prix).
  // Référence = racine du code (EB54..EB66) + lettre poignée (C=Classique / D=Design).
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["140", "160", "180"] };
  const axeType = { id: "type", nom: "Type", valeurs: ["Obturateurs", "Échancrure", "TAC"] };
  const axePoignee = { id: "poignee", nom: "Poignée", valeurs: ["Classique", "Design"] };

  const declinaisons = [
    // OBTURATEURS (EB54-56)
    { id: uid(), valeurs: { longueur: "140", type: "Obturateurs", poignee: "Classique" }, prixTarifHT: "895", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB54C" },
    { id: uid(), valeurs: { longueur: "140", type: "Obturateurs", poignee: "Design" }, prixTarifHT: "900", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB54D" },
    { id: uid(), valeurs: { longueur: "160", type: "Obturateurs", poignee: "Classique" }, prixTarifHT: "905", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB55C" },
    { id: uid(), valeurs: { longueur: "160", type: "Obturateurs", poignee: "Design" }, prixTarifHT: "910", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB55D" },
    { id: uid(), valeurs: { longueur: "180", type: "Obturateurs", poignee: "Classique" }, prixTarifHT: "915", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB56C" },
    { id: uid(), valeurs: { longueur: "180", type: "Obturateurs", poignee: "Design" }, prixTarifHT: "920", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB56D" },

    // ÉCHANCRURE (EB61-63)
    { id: uid(), valeurs: { longueur: "140", type: "Échancrure", poignee: "Classique" }, prixTarifHT: "900", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB61C" },
    { id: uid(), valeurs: { longueur: "140", type: "Échancrure", poignee: "Design" }, prixTarifHT: "905", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB61D" },
    { id: uid(), valeurs: { longueur: "160", type: "Échancrure", poignee: "Classique" }, prixTarifHT: "910", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB62C" },
    { id: uid(), valeurs: { longueur: "160", type: "Échancrure", poignee: "Design" }, prixTarifHT: "915", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB62D" },
    { id: uid(), valeurs: { longueur: "180", type: "Échancrure", poignee: "Classique" }, prixTarifHT: "920", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB63C" },
    { id: uid(), valeurs: { longueur: "180", type: "Échancrure", poignee: "Design" }, prixTarifHT: "925", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB63D" },

    // TAC (EB64-66)
    { id: uid(), valeurs: { longueur: "140", type: "TAC", poignee: "Classique" }, prixTarifHT: "975", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB64C" },
    { id: uid(), valeurs: { longueur: "140", type: "TAC", poignee: "Design" }, prixTarifHT: "980", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB64D" },
    { id: uid(), valeurs: { longueur: "160", type: "TAC", poignee: "Classique" }, prixTarifHT: "985", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB65C" },
    { id: uid(), valeurs: { longueur: "160", type: "TAC", poignee: "Design" }, prixTarifHT: "990", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB65D" },
    { id: uid(), valeurs: { longueur: "180", type: "TAC", poignee: "Classique" }, prixTarifHT: "995", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB66C" },
    { id: uid(), valeurs: { longueur: "180", type: "TAC", poignee: "Design" }, prixTarifHT: "1000", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB66D" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeLongueur, axeType, axePoignee],
      declinaisons,
    },
  });

  // ─── 2. Finitions (Structure métal + Plateau bureau + Plateau console — sans impact prix) ───
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });

  await prisma.groupeFinition.create({
    data: {
      nom: "Structure métal",
      vitrineId: vitrine.id,
      ordre: 0,
      finitions: {
        create: [
          { nom: "Aluminium", couleur: "#9a9a94", ordre: 0 },
          { nom: "Noir métal", couleur: "#23262a", ordre: 1 },
          { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 2 },
        ],
      },
    },
  });

  await prisma.groupeFinition.create({
    data: {
      nom: "Plateau bureau",
      vitrineId: vitrine.id,
      ordre: 1,
      finitions: {
        create: [
          { nom: "Hêtre", couleur: "#d8b384", ordre: 0 },
          { nom: "Nebraska", couleur: "#b89b73", ordre: 1 },
          { nom: "Timber", couleur: "#8a6a4a", ordre: 2 },
          { nom: "Chêne fil", couleur: "#c9a876", ordre: 3 },
          { nom: "Blanc", couleur: "#f2f0ec", ordre: 4 },
          { nom: "Argile", couleur: "#a08d7c", ordre: 5 },
          { nom: "Yukon", couleur: "#6e5b4a", ordre: 6 },
        ],
      },
    },
  });

  await prisma.groupeFinition.create({
    data: {
      nom: "Plateau console",
      vitrineId: vitrine.id,
      ordre: 2,
      finitions: {
        create: [
          { nom: "Hêtre", couleur: "#d8b384", ordre: 0 },
          { nom: "Nebraska", couleur: "#b89b73", ordre: 1 },
          { nom: "Noir", couleur: "#23262a", ordre: 2 },
          { nom: "Timber", couleur: "#8a6a4a", ordre: 3 },
          { nom: "Chêne fil", couleur: "#c9a876", ordre: 4 },
          { nom: "Blanc", couleur: "#f2f0ec", ordre: 5 },
          { nom: "Argile", couleur: "#a08d7c", ordre: 6 },
          { nom: "Yukon", couleur: "#6e5b4a", ordre: 7 },
        ],
      },
    },
  });

  console.log(`✓ ${declinaisons.length} combinaisons + 3 groupes de finitions enregistrés sur "${vitrine.nom}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
