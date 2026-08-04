import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Plan compact", gamme: { nom: "Astrolite" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Plan compact" dans la gamme "Astrolite".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  // Même prix entre Droit/Gauche pour une même longueur, mais référence différente
  // → gardé en axe de Déclinaison (comme le sens de liaison Bewall) pour que la bonne réf suive.
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["160", "180"] };
  const axeSens = { id: "sens", nom: "Sens du retour", valeurs: ["Droit", "Gauche"] };

  const declinaisons = [
    { id: uid(), valeurs: { longueur: "160", sens: "Droit" }, prixTarifHT: "495", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT44" },
    { id: uid(), valeurs: { longueur: "160", sens: "Gauche" }, prixTarifHT: "495", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT45" },
    { id: uid(), valeurs: { longueur: "180", sens: "Droit" }, prixTarifHT: "515", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT46" },
    { id: uid(), valeurs: { longueur: "180", sens: "Gauche" }, prixTarifHT: "515", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BT47" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeLongueur, axeSens],
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
