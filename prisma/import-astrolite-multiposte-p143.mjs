import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Multiposte P143", gamme: { nom: "Astrolite" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Multiposte P143" dans la gamme "Astrolite".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  // "Départ" = premier poste (piètement plein) / "Suivant" = poste en retrait (moins cher).
  // P143 ne va pas au-delà de L160 (contrairement à P163 qui monte à L180).
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["120", "140", "160"] };
  const axeType = { id: "type", nom: "Type", valeurs: ["Obturateurs", "Échancrures", "Coulissant + goulotte"] };
  const axePosition = { id: "position", nom: "Position", valeurs: ["Départ", "Suivant"] };

  const declinaisons = [
    // OBTURATEURS — DÉPART (BT53-55)
    { id: uid(), valeurs: { longueur: "120", type: "Obturateurs", position: "Départ" }, prixTarifHT: "615", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT53" },
    { id: uid(), valeurs: { longueur: "140", type: "Obturateurs", position: "Départ" }, prixTarifHT: "635", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT54" },
    { id: uid(), valeurs: { longueur: "160", type: "Obturateurs", position: "Départ" }, prixTarifHT: "655", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT55" },
    // OBTURATEURS — SUIVANT (BT56-58)
    { id: uid(), valeurs: { longueur: "120", type: "Obturateurs", position: "Suivant" }, prixTarifHT: "525", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT56" },
    { id: uid(), valeurs: { longueur: "140", type: "Obturateurs", position: "Suivant" }, prixTarifHT: "545", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT57" },
    { id: uid(), valeurs: { longueur: "160", type: "Obturateurs", position: "Suivant" }, prixTarifHT: "565", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT58" },

    // ÉCHANCRURES — DÉPART (BT59-61)
    { id: uid(), valeurs: { longueur: "120", type: "Échancrures", position: "Départ" }, prixTarifHT: "625", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT59" },
    { id: uid(), valeurs: { longueur: "140", type: "Échancrures", position: "Départ" }, prixTarifHT: "645", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT60" },
    { id: uid(), valeurs: { longueur: "160", type: "Échancrures", position: "Départ" }, prixTarifHT: "665", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT61" },
    // ÉCHANCRURES — SUIVANT (BT62-64)
    { id: uid(), valeurs: { longueur: "120", type: "Échancrures", position: "Suivant" }, prixTarifHT: "535", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT62" },
    { id: uid(), valeurs: { longueur: "140", type: "Échancrures", position: "Suivant" }, prixTarifHT: "555", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT63" },
    { id: uid(), valeurs: { longueur: "160", type: "Échancrures", position: "Suivant" }, prixTarifHT: "575", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT64" },

    // COULISSANT + GOULOTTE — SUIVANT (DW09-11)
    { id: uid(), valeurs: { longueur: "120", type: "Coulissant + goulotte", position: "Suivant" }, prixTarifHT: "930", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW09" },
    { id: uid(), valeurs: { longueur: "140", type: "Coulissant + goulotte", position: "Suivant" }, prixTarifHT: "955", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW10" },
    { id: uid(), valeurs: { longueur: "160", type: "Coulissant + goulotte", position: "Suivant" }, prixTarifHT: "980", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW11" },
    // COULISSANT + GOULOTTE — DÉPART (DW22-24)
    { id: uid(), valeurs: { longueur: "120", type: "Coulissant + goulotte", position: "Départ" }, prixTarifHT: "1020", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW22" },
    { id: uid(), valeurs: { longueur: "140", type: "Coulissant + goulotte", position: "Départ" }, prixTarifHT: "1045", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW23" },
    { id: uid(), valeurs: { longueur: "160", type: "Coulissant + goulotte", position: "Départ" }, prixTarifHT: "1070", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW24" },
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
