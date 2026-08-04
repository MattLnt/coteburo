import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Plan droit P70", gamme: { nom: "Partage" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Plan droit P70" dans la gamme "Partage".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["120", "140", "143", "160", "163"] };
  const axeType = { id: "type", nom: "Type", valeurs: ["Obturateurs", "Échancrure", "Coulissant + goulotte"] };

  const declinaisons = [
    // OBTURATEURS (BX61-65)
    { id: uid(), valeurs: { longueur: "120", type: "Obturateurs" }, prixTarifHT: "385", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BX61" },
    { id: uid(), valeurs: { longueur: "140", type: "Obturateurs" }, prixTarifHT: "395", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BX62" },
    { id: uid(), valeurs: { longueur: "160", type: "Obturateurs" }, prixTarifHT: "405", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BX63" },
    { id: uid(), valeurs: { longueur: "143", type: "Obturateurs" }, prixTarifHT: "400", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BX64" },
    { id: uid(), valeurs: { longueur: "163", type: "Obturateurs" }, prixTarifHT: "410", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BX65" },

    // ÉCHANCRURE (DP32-34 + EB59-60)
    { id: uid(), valeurs: { longueur: "120", type: "Échancrure" }, prixTarifHT: "390", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DP32" },
    { id: uid(), valeurs: { longueur: "140", type: "Échancrure" }, prixTarifHT: "400", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DP33" },
    { id: uid(), valeurs: { longueur: "160", type: "Échancrure" }, prixTarifHT: "410", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DP34" },
    { id: uid(), valeurs: { longueur: "143", type: "Échancrure" }, prixTarifHT: "405", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB59" },
    { id: uid(), valeurs: { longueur: "163", type: "Échancrure" }, prixTarifHT: "415", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB60" },

    // COULISSANT + GOULOTTE (DY44-46)
    { id: uid(), valeurs: { longueur: "120", type: "Coulissant + goulotte" }, prixTarifHT: "635", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY44" },
    { id: uid(), valeurs: { longueur: "140", type: "Coulissant + goulotte" }, prixTarifHT: "645", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY45" },
    { id: uid(), valeurs: { longueur: "160", type: "Coulissant + goulotte" }, prixTarifHT: "655", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY46" },
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
