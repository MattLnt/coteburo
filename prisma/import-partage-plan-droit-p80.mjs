import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Plan droit P80", gamme: { nom: "Partage" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Plan droit P80" dans la gamme "Partage".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["120", "140", "143", "160", "163", "180"] };
  const axeType = { id: "type", nom: "Type", valeurs: ["Obturateurs", "Échancrure", "Sans obturateurs", "TAC", "Coulissant + goulotte"] };

  const declinaisons = [
    // OBTURATEURS (BX66-69 + EG79-80)
    { id: uid(), valeurs: { longueur: "120", type: "Obturateurs" }, prixTarifHT: "390", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BX66" },
    { id: uid(), valeurs: { longueur: "140", type: "Obturateurs" }, prixTarifHT: "400", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BX67" },
    { id: uid(), valeurs: { longueur: "160", type: "Obturateurs" }, prixTarifHT: "410", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BX68" },
    { id: uid(), valeurs: { longueur: "180", type: "Obturateurs" }, prixTarifHT: "420", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BX69" },
    { id: uid(), valeurs: { longueur: "143", type: "Obturateurs" }, prixTarifHT: "405", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EG79" },
    { id: uid(), valeurs: { longueur: "163", type: "Obturateurs" }, prixTarifHT: "415", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EG80" },

    // ÉCHANCRURE (DP35-38 + EG81-82)
    { id: uid(), valeurs: { longueur: "120", type: "Échancrure" }, prixTarifHT: "395", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DP35" },
    { id: uid(), valeurs: { longueur: "140", type: "Échancrure" }, prixTarifHT: "405", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DP36" },
    { id: uid(), valeurs: { longueur: "160", type: "Échancrure" }, prixTarifHT: "415", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DP37" },
    { id: uid(), valeurs: { longueur: "180", type: "Échancrure" }, prixTarifHT: "425", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DP38" },
    { id: uid(), valeurs: { longueur: "143", type: "Échancrure" }, prixTarifHT: "410", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EG81" },
    { id: uid(), valeurs: { longueur: "163", type: "Échancrure" }, prixTarifHT: "420", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EG82" },

    // SANS OBTURATEURS (DE55-57 + DW03)
    { id: uid(), valeurs: { longueur: "120", type: "Sans obturateurs" }, prixTarifHT: "375", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE55" },
    { id: uid(), valeurs: { longueur: "140", type: "Sans obturateurs" }, prixTarifHT: "385", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE56" },
    { id: uid(), valeurs: { longueur: "160", type: "Sans obturateurs" }, prixTarifHT: "395", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE57" },
    { id: uid(), valeurs: { longueur: "180", type: "Sans obturateurs" }, prixTarifHT: "405", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW03" },

    // TAC (DE64-67)
    { id: uid(), valeurs: { longueur: "120", type: "TAC" }, prixTarifHT: "470", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE64" },
    { id: uid(), valeurs: { longueur: "140", type: "TAC" }, prixTarifHT: "480", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE65" },
    { id: uid(), valeurs: { longueur: "160", type: "TAC" }, prixTarifHT: "490", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE66" },
    { id: uid(), valeurs: { longueur: "180", type: "TAC" }, prixTarifHT: "500", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE67" },

    // COULISSANT + GOULOTTE (DY47-50)
    { id: uid(), valeurs: { longueur: "120", type: "Coulissant + goulotte" }, prixTarifHT: "640", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY47" },
    { id: uid(), valeurs: { longueur: "140", type: "Coulissant + goulotte" }, prixTarifHT: "650", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY48" },
    { id: uid(), valeurs: { longueur: "160", type: "Coulissant + goulotte" }, prixTarifHT: "660", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY49" },
    { id: uid(), valeurs: { longueur: "180", type: "Coulissant + goulotte" }, prixTarifHT: "670", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY50" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeLongueur, axeType],
      declinaisons,
    },
  });

  // ─── 2. Finitions (Structure métal + Plateau — sans impact prix) ───
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
      nom: "Plateau",
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

  console.log(`✓ ${declinaisons.length} combinaisons + 2 groupes de finitions enregistrés sur "${vitrine.nom}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
