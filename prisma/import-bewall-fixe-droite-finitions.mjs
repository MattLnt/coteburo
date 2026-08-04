import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Cloison fixe droite", gamme: { nom: "Bewall" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Cloison fixe droite" dans la gamme "Bewall".');
    process.exit(1);
  }

  // Supprime les groupes déjà existants pour ce produit, pour que le script soit
  // relançable sans jamais créer de doublons.
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

  console.log(`✓ Groupe "Structure métal" (2 finitions) enregistré sur "${vitrine.nom}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());