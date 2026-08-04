import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "VDF Mela", gamme: { nom: "Astrolite" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "VDF Mela" dans la gamme "Astrolite".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  // Axe = longueur du plan associé (120/140/160/180) — la largeur réelle du VDF (109/129/149/169)
  // est déduite automatiquement, pas besoin d'un axe séparé.
  const axeLongueurPlan = { id: "longueurPlan", nom: "Longueur du plan", valeurs: ["120", "140", "160", "180"] };

  const declinaisons = [
    { id: uid(), valeurs: { longueurPlan: "120" }, prixTarifHT: "110", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY67" },
    { id: uid(), valeurs: { longueurPlan: "140" }, prixTarifHT: "115", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY68" },
    { id: uid(), valeurs: { longueurPlan: "160" }, prixTarifHT: "120", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY69" },
    { id: uid(), valeurs: { longueurPlan: "180" }, prixTarifHT: "125", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DY70" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeLongueurPlan],
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
