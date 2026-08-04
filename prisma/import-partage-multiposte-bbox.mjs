import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Multiposte Console B-Box", gamme: { nom: "Partage" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Multiposte Console B-Box" dans la gamme "Partage".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  // Pas d'axe Position (Départ/Suivant) ici — le tarif B-Box ne propose qu'une config par longueur/type.
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["140", "160", "180"] };
  const axeType = { id: "type", nom: "Type", valeurs: ["Obturateurs", "Échancrures", "TAC"] };
  const axePoignee = { id: "poignee", nom: "Poignée", valeurs: ["Classique", "Design"] };

  const declinaisons = [
    // OBTURATEURS (EB67-69)
    { id: uid(), valeurs: { longueur: "140", type: "Obturateurs", poignee: "Classique" }, prixTarifHT: "1720", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB67C" },
    { id: uid(), valeurs: { longueur: "140", type: "Obturateurs", poignee: "Design" }, prixTarifHT: "1725", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB67D" },
    { id: uid(), valeurs: { longueur: "160", type: "Obturateurs", poignee: "Classique" }, prixTarifHT: "1740", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB68C" },
    { id: uid(), valeurs: { longueur: "160", type: "Obturateurs", poignee: "Design" }, prixTarifHT: "1745", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB68D" },
    { id: uid(), valeurs: { longueur: "180", type: "Obturateurs", poignee: "Classique" }, prixTarifHT: "1760", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB69C" },
    { id: uid(), valeurs: { longueur: "180", type: "Obturateurs", poignee: "Design" }, prixTarifHT: "1765", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB69D" },

    // ÉCHANCRURES (EB70-72)
    { id: uid(), valeurs: { longueur: "140", type: "Échancrures", poignee: "Classique" }, prixTarifHT: "1730", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB70C" },
    { id: uid(), valeurs: { longueur: "140", type: "Échancrures", poignee: "Design" }, prixTarifHT: "1735", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB70D" },
    { id: uid(), valeurs: { longueur: "160", type: "Échancrures", poignee: "Classique" }, prixTarifHT: "1750", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB71C" },
    { id: uid(), valeurs: { longueur: "160", type: "Échancrures", poignee: "Design" }, prixTarifHT: "1755", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB71D" },
    { id: uid(), valeurs: { longueur: "180", type: "Échancrures", poignee: "Classique" }, prixTarifHT: "1770", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB72C" },
    { id: uid(), valeurs: { longueur: "180", type: "Échancrures", poignee: "Design" }, prixTarifHT: "1775", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB72D" },

    // TAC (EB73-75)
    { id: uid(), valeurs: { longueur: "140", type: "TAC", poignee: "Classique" }, prixTarifHT: "1880", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB73C" },
    { id: uid(), valeurs: { longueur: "140", type: "TAC", poignee: "Design" }, prixTarifHT: "1885", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB73D" },
    { id: uid(), valeurs: { longueur: "160", type: "TAC", poignee: "Classique" }, prixTarifHT: "1900", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB74C" },
    { id: uid(), valeurs: { longueur: "160", type: "TAC", poignee: "Design" }, prixTarifHT: "1905", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB74D" },
    { id: uid(), valeurs: { longueur: "180", type: "TAC", poignee: "Classique" }, prixTarifHT: "1920", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB75C" },
    { id: uid(), valeurs: { longueur: "180", type: "TAC", poignee: "Design" }, prixTarifHT: "1925", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EB75D" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeLongueur, axeType, axePoignee],
      declinaisons,
    },
  });

  // ─── 2. Finitions (Structure métal + Plateau bureau + Plateau console — sans impact prix) ───
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
      nom: "Plateau bureau",
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

  await prisma.groupeFinition.create({
    data: {
      nom: "Plateau console",
      vitrineId: vitrine.id,
      ordre: 2,
      finitions: {
        create: [
          { nom: "Hêtre", couleur: "#d8b384", ordre: 0 },
          { nom: "Nebraska", couleur: "#b89b73", ordre: 1 },
          { nom: "Noir", couleur: "#23262a", ordre: 2 },
          { nom: "Timber", couleur: "#8a6a4a", ordre: 3 },
          { nom: "Chêne fil", couleur: "#c9a876", ordre: 4 },
          { nom: "Blanc", couleur: "#f2f0ec", ordre: 5 },
          { nom: "Argile", couleur: "#a08d7c", ordre: 6 },
          { nom: "Yukon", couleur: "#6e5b4a", ordre: 7 },
        ],
      },
    },
  });

  console.log(`✓ ${declinaisons.length} combinaisons + 3 groupes de finitions enregistrés sur "${vitrine.nom}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
