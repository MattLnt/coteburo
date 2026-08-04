import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Multiposte P163", gamme: { nom: "Astrolite" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Multiposte P163" dans la gamme "Astrolite".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["120", "140", "160", "180"] };
  const axeType = { id: "type", nom: "Type", valeurs: ["Obturateurs", "Échancrures", "Sans obturateurs", "TAC", "Coulissant + goulotte"] };
  const axePosition = { id: "position", nom: "Position", valeurs: ["Départ", "Suivant"] };

  const declinaisons = [
    // OBTURATEURS — DÉPART (BK52-55)
    { id: uid(), valeurs: { longueur: "120", type: "Obturateurs", position: "Départ" }, prixTarifHT: "625", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK52" },
    { id: uid(), valeurs: { longueur: "140", type: "Obturateurs", position: "Départ" }, prixTarifHT: "645", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK53" },
    { id: uid(), valeurs: { longueur: "160", type: "Obturateurs", position: "Départ" }, prixTarifHT: "665", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK54" },
    { id: uid(), valeurs: { longueur: "180", type: "Obturateurs", position: "Départ" }, prixTarifHT: "685", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK55" },
    // OBTURATEURS — SUIVANT (BK56-59)
    { id: uid(), valeurs: { longueur: "120", type: "Obturateurs", position: "Suivant" }, prixTarifHT: "535", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK56" },
    { id: uid(), valeurs: { longueur: "140", type: "Obturateurs", position: "Suivant" }, prixTarifHT: "555", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK57" },
    { id: uid(), valeurs: { longueur: "160", type: "Obturateurs", position: "Suivant" }, prixTarifHT: "575", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK58" },
    { id: uid(), valeurs: { longueur: "180", type: "Obturateurs", position: "Suivant" }, prixTarifHT: "595", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BK59" },

    // ÉCHANCRURES — DÉPART (DH48 + BR52-54)
    { id: uid(), valeurs: { longueur: "120", type: "Échancrures", position: "Départ" }, prixTarifHT: "635", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DH48" },
    { id: uid(), valeurs: { longueur: "140", type: "Échancrures", position: "Départ" }, prixTarifHT: "655", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BR52" },
    { id: uid(), valeurs: { longueur: "160", type: "Échancrures", position: "Départ" }, prixTarifHT: "675", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BR53" },
    { id: uid(), valeurs: { longueur: "180", type: "Échancrures", position: "Départ" }, prixTarifHT: "695", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BR54" },
    // ÉCHANCRURES — SUIVANT (DH47 + BR56-58)
    { id: uid(), valeurs: { longueur: "120", type: "Échancrures", position: "Suivant" }, prixTarifHT: "545", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DH47" },
    { id: uid(), valeurs: { longueur: "140", type: "Échancrures", position: "Suivant" }, prixTarifHT: "565", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BR56" },
    { id: uid(), valeurs: { longueur: "160", type: "Échancrures", position: "Suivant" }, prixTarifHT: "585", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BR57" },
    { id: uid(), valeurs: { longueur: "180", type: "Échancrures", position: "Suivant" }, prixTarifHT: "605", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BR58" },

    // SANS OBTURATEURS — DÉPART (DE79-81 + DW21)
    { id: uid(), valeurs: { longueur: "120", type: "Sans obturateurs", position: "Départ" }, prixTarifHT: "595", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE79" },
    { id: uid(), valeurs: { longueur: "140", type: "Sans obturateurs", position: "Départ" }, prixTarifHT: "615", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE80" },
    { id: uid(), valeurs: { longueur: "160", type: "Sans obturateurs", position: "Départ" }, prixTarifHT: "635", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE81" },
    { id: uid(), valeurs: { longueur: "180", type: "Sans obturateurs", position: "Départ" }, prixTarifHT: "655", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW21" },
    // SANS OBTURATEURS — SUIVANT (DE61-63 + DW05)
    { id: uid(), valeurs: { longueur: "120", type: "Sans obturateurs", position: "Suivant" }, prixTarifHT: "505", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE61" },
    { id: uid(), valeurs: { longueur: "140", type: "Sans obturateurs", position: "Suivant" }, prixTarifHT: "525", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE62" },
    { id: uid(), valeurs: { longueur: "160", type: "Sans obturateurs", position: "Suivant" }, prixTarifHT: "545", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE63" },
    { id: uid(), valeurs: { longueur: "180", type: "Sans obturateurs", position: "Suivant" }, prixTarifHT: "565", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW05" },

    // TAC — DÉPART (DE89-92)
    { id: uid(), valeurs: { longueur: "120", type: "TAC", position: "Départ" }, prixTarifHT: "785", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE89" },
    { id: uid(), valeurs: { longueur: "140", type: "TAC", position: "Départ" }, prixTarifHT: "805", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE90" },
    { id: uid(), valeurs: { longueur: "160", type: "TAC", position: "Départ" }, prixTarifHT: "825", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE91" },
    { id: uid(), valeurs: { longueur: "180", type: "TAC", position: "Départ" }, prixTarifHT: "845", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE92" },
    // TAC — SUIVANT (DE72-75)
    { id: uid(), valeurs: { longueur: "120", type: "TAC", position: "Suivant" }, prixTarifHT: "695", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE72" },
    { id: uid(), valeurs: { longueur: "140", type: "TAC", position: "Suivant" }, prixTarifHT: "715", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE73" },
    { id: uid(), valeurs: { longueur: "160", type: "TAC", position: "Suivant" }, prixTarifHT: "735", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE74" },
    { id: uid(), valeurs: { longueur: "180", type: "TAC", position: "Suivant" }, prixTarifHT: "755", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DE75" },

    // COULISSANT + GOULOTTE — DÉPART (DW25-28)
    { id: uid(), valeurs: { longueur: "120", type: "Coulissant + goulotte", position: "Départ" }, prixTarifHT: "1050", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW25" },
    { id: uid(), valeurs: { longueur: "140", type: "Coulissant + goulotte", position: "Départ" }, prixTarifHT: "1075", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW26" },
    { id: uid(), valeurs: { longueur: "160", type: "Coulissant + goulotte", position: "Départ" }, prixTarifHT: "1100", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW27" },
    { id: uid(), valeurs: { longueur: "180", type: "Coulissant + goulotte", position: "Départ" }, prixTarifHT: "1125", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW28" },
    // COULISSANT + GOULOTTE — SUIVANT (DW16-19)
    { id: uid(), valeurs: { longueur: "120", type: "Coulissant + goulotte", position: "Suivant" }, prixTarifHT: "960", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW16" },
    { id: uid(), valeurs: { longueur: "140", type: "Coulissant + goulotte", position: "Suivant" }, prixTarifHT: "985", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW17" },
    { id: uid(), valeurs: { longueur: "160", type: "Coulissant + goulotte", position: "Suivant" }, prixTarifHT: "1010", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW18" },
    { id: uid(), valeurs: { longueur: "180", type: "Coulissant + goulotte", position: "Suivant" }, prixTarifHT: "1035", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW19" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeLongueur, axeType, axePosition],
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
