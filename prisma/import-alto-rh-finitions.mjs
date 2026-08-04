import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: {
      nom: "Plan droit avec échancrure",
      gamme: { nom: "Alto RH" },
    },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Plan droit avec échancrure" dans la gamme "Alto RH".');
    process.exit(1);
  }

  // Supprime les groupes de finitions déjà existants pour ce produit, pour que le
  // script soit relançable sans jamais créer de doublons.
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });

  await prisma.groupeFinition.create({
    data: {
      nom: "Structure métal",
      vitrineId: vitrine.id,
      ordre: 0,
      finitions: {
        create: [
          { nom: "Noir métal", couleur: "#23262a", ordre: 0 },
          { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 1 },
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
          { nom: "Nebraska", couleur: "#c9a876", ordre: 0 },
          { nom: "Timber", couleur: "#a67c52", ordre: 1 },
          { nom: "Chêne fil", couleur: "#b8926a", ordre: 2 },
          { nom: "Blanc", couleur: "#f5f3ee", ordre: 3 },
          { nom: "Yukon", couleur: "#6b4a35", ordre: 4 },
        ],
      },
    },
  });

  console.log(`✓ 2 groupes de finitions (Structure métal, Plateau) enregistrés sur "${vitrine.nom}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());