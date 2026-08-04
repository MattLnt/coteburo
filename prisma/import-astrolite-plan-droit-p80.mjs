import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Plan droit P80", gamme: { nom: "Astrolite" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Plan droit P80" dans la gamme "Astrolite".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["120", "140", "143", "160", "163", "180"] };
  const axeType = { id: "type", nom: "Type", valeurs: ["Obturateurs", "Échancrure", "Sans obturateurs", "TAC", "Coulissant + goulotte"] };

  const declinaisons = [
    // OBTURATEURS (BK42-45 + EG75-76)
    { id: uid(), valeurs: { longueur: "120", type: "Obturateurs" }, prixTarifHT: "365", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK42" },
    { id: uid(), valeurs: { longueur: "140", type: "Obturateurs" }, prixTarifHT: "375", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK43" },
    { id: uid(), valeurs: { longueur: "160", type: "Obturateurs" }, prixTarifHT: "385", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK44" },
    { id: uid(), valeurs: { longueur: "180", type: "Obturateurs" }, prixTarifHT: "395", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK45" },
    { id: uid(), valeurs: { longueur: "143", type: "Obturateurs" }, prixTarifHT: "380", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EG75" },
    { id: uid(), valeurs: { longueur: "163", type: "Obturateurs" }, prixTarifHT: "390", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EG76" },

    // ÉCHANCRURE (DP49-52 + EG77-78)
    { id: uid(), valeurs: { longueur: "120", type: "Échancrure" }, prixTarifHT: "370", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DP49" },
    { id: uid(), valeurs: { longueur: "140", type: "Échancrure" }, prixTarifHT: "380", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DP50" },
    { id: uid(), valeurs: { longueur: "160", type: "Échancrure" }, prixTarifHT: "390", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DP51" },
    { id: uid(), valeurs: { longueur: "180", type: "Échancrure" }, prixTarifHT: "400", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DP52" },
    { id: uid(), valeurs: { longueur: "143", type: "Échancrure" }, prixTarifHT: "385", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EG77" },
    { id: uid(), valeurs: { longueur: "163", type: "Échancrure" }, prixTarifHT: "395", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EG78" },

    // SANS OBTURATEURS (DE76-78 + DW20)
    { id: uid(), valeurs: { longueur: "120", type: "Sans obturateurs" }, prixTarifHT: "350", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE76" },
    { id: uid(), valeurs: { longueur: "140", type: "Sans obturateurs" }, prixTarifHT: "360", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE77" },
    { id: uid(), valeurs: { longueur: "160", type: "Sans obturateurs" }, prixTarifHT: "370", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE78" },
    { id: uid(), valeurs: { longueur: "180", type: "Sans obturateurs" }, prixTarifHT: "380", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW20" },

    // TAC (DE85-88)
    { id: uid(), valeurs: { longueur: "120", type: "TAC" }, prixTarifHT: "445", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE85" },
    { id: uid(), valeurs: { longueur: "140", type: "TAC" }, prixTarifHT: "455", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE86" },
    { id: uid(), valeurs: { longueur: "160", type: "TAC" }, prixTarifHT: "465", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE87" },
    { id: uid(), valeurs: { longueur: "180", type: "TAC" }, prixTarifHT: "475", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE88" },

    // COULISSANT + GOULOTTE (DY40-43)
    { id: uid(), valeurs: { longueur: "120", type: "Coulissant + goulotte" }, prixTarifHT: "615", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY40" },
    { id: uid(), valeurs: { longueur: "140", type: "Coulissant + goulotte" }, prixTarifHT: "625", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY41" },
    { id: uid(), valeurs: { longueur: "160", type: "Coulissant + goulotte" }, prixTarifHT: "635", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY42" },
    { id: uid(), valeurs: { longueur: "180", type: "Coulissant + goulotte" }, prixTarifHT: "645", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY43" },
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
