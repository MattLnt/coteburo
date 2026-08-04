import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

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

  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["1150", "1350", "1550", "1750"] };
  const axeConfig = { id: "config", nom: "Configuration", valeurs: ["Sans retour", "Avec retour"] };

  // prixTarifHT = prix Buronomic tel quel ; prixVenteHT laissé vide pour que le prix de
  // vente soit recalculé automatiquement (tarif × marge actuelle des Réglages), exactement
  // comme pour les produits Bewall — plus de prix "brut" figé sans marge.
  const declinaisons = [
    { id: uid(), valeurs: { longueur: "1150", config: "Sans retour" }, prixTarifHT: "845", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "ED25" },
    { id: uid(), valeurs: { longueur: "1350", config: "Sans retour" }, prixTarifHT: "855", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "ED26" },
    { id: uid(), valeurs: { longueur: "1550", config: "Sans retour" }, prixTarifHT: "865", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "ED27" },
    { id: uid(), valeurs: { longueur: "1750", config: "Sans retour" }, prixTarifHT: "875", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "ED28" },
    { id: uid(), valeurs: { longueur: "1350", config: "Avec retour" }, prixTarifHT: "1515", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "ED29" },
    { id: uid(), valeurs: { longueur: "1550", config: "Avec retour" }, prixTarifHT: "1525", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "ED30" },
    { id: uid(), valeurs: { longueur: "1750", config: "Avec retour" }, prixTarifHT: "1535", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "ED31" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeLongueur, axeConfig],
      declinaisons,
    },
  });

  console.log(`✓ ${declinaisons.length} combinaisons re-enregistrées avec prix fournisseur + référence sur "${vitrine.nom}" (gamme Alto RH).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());