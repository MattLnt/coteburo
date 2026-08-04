import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Kit de liaison", gamme: { nom: "Bewall" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Kit de liaison" dans la gamme "Bewall".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  // Même prix (70€) pour les deux, mais code fournisseur différent selon le type —
  // gardé en axe de Déclinaison (pas en Finition) pour que la bonne référence suive.
  const axeType = { id: "type", nom: "Type de liaison", valeurs: ["180° — cloisons côte à côte", "90° — cloisons en angle"] };

  const declinaisons = [
    { id: uid(), valeurs: { type: "180° — cloisons côte à côte" }, prixTarifHT: "70", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EG29" },
    { id: uid(), valeurs: { type: "90° — cloisons en angle" }, prixTarifHT: "70", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EG30" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeType],
      declinaisons,
    },
  });

  // ─── 2. Finitions (couleur métal — sans impact prix) ───
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

  console.log(`✓ ${declinaisons.length} combinaisons + groupe "Structure métal" enregistrés sur "${vitrine.nom}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());