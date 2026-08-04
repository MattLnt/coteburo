import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Multiposte", gamme: { nom: "Partage" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Multiposte" dans la gamme "Partage".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  // Uniquement "Départ" dans le tarif reçu (pas de "Suivant" comme chez Astrolite).
  // P143 ne va pas au-delà de L160 (comme chez Astrolite). Un seul code "Sans obturateurs"
  // isolé (DW04, L180xP163) — gardé en axe Type pour ne pas le perdre.
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["120", "140", "160", "180"] };
  const axeProfondeur = { id: "profondeur", nom: "Profondeur", valeurs: ["143", "163"] };
  const axeType = { id: "type", nom: "Type", valeurs: ["Coulissant + goulotte", "Sans obturateurs"] };

  const declinaisons = [
    // COULISSANT + GOULOTTE — P143 (DW06-08)
    { id: uid(), valeurs: { longueur: "120", profondeur: "143", type: "Coulissant + goulotte" }, prixTarifHT: "1060", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW06" },
    { id: uid(), valeurs: { longueur: "140", profondeur: "143", type: "Coulissant + goulotte" }, prixTarifHT: "1085", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW07" },
    { id: uid(), valeurs: { longueur: "160", profondeur: "143", type: "Coulissant + goulotte" }, prixTarifHT: "1110", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW08" },

    // COULISSANT + GOULOTTE — P163 (DW12-15)
    { id: uid(), valeurs: { longueur: "120", profondeur: "163", type: "Coulissant + goulotte" }, prixTarifHT: "1090", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW12" },
    { id: uid(), valeurs: { longueur: "140", profondeur: "163", type: "Coulissant + goulotte" }, prixTarifHT: "1115", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW13" },
    { id: uid(), valeurs: { longueur: "160", profondeur: "163", type: "Coulissant + goulotte" }, prixTarifHT: "1140", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW14" },
    { id: uid(), valeurs: { longueur: "180", profondeur: "163", type: "Coulissant + goulotte" }, prixTarifHT: "1165", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW15" },

    // SANS OBTURATEURS — P163 (DW04, code isolé dans le tarif)
    { id: uid(), valeurs: { longueur: "180", profondeur: "163", type: "Sans obturateurs" }, prixTarifHT: "695", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DW04" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeLongueur, axeProfondeur, axeType],
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
