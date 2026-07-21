import { prisma } from "@/lib/prisma";

// Frais de livraison : gratuit à partir du seuil configuré (Réglages), sinon le tarif configuré.
// Retourne { fraisLivraison, seuilLivraisonGratuite } — le seuil est renvoyé pour l'affichage ("plus que X€ pour la livraison gratuite").
export async function calculerFraisLivraison(totalTTCProduits) {
  const reglages = await prisma.reglages.findUnique({ where: { id: 1 } });
  const seuil = reglages?.seuilLivraisonGratuite ?? 500;
  const tarif = reglages?.fraisLivraison ?? 59;
  return {
    fraisLivraison: totalTTCProduits >= seuil ? 0 : tarif,
    seuilLivraisonGratuite: seuil,
  };
}

// Frais d'installation selon le montant TTC des produits, d'après les paliers configurés en admin.
// Retourne null si le montant dépasse tous les paliers (hors barème → sur devis).
export async function calculerFraisInstallation(totalTTCProduits) {
  const paliers = await prisma.palierInstallation.findMany({ orderBy: { seuilMax: "asc" } });
  for (const palier of paliers) {
    if (totalTTCProduits <= palier.seuilMax) return palier.prix;
  }
  return null;
}

// L'option installation est-elle proposable automatiquement pour ce montant ?
export async function installationDisponible(totalTTCProduits) {
  const frais = await calculerFraisInstallation(totalTTCProduits);
  return frais !== null;
}

// Récupère les deux calculs en une seule fois (pratique pour le panier/commande).
export async function calculerTousLesFrais(totalTTCProduits) {
  const [{ fraisLivraison, seuilLivraisonGratuite }, fraisInstallation] = await Promise.all([
    calculerFraisLivraison(totalTTCProduits),
    calculerFraisInstallation(totalTTCProduits),
  ]);
  return { fraisLivraison, seuilLivraisonGratuite, fraisInstallation, installationDisponible: fraisInstallation !== null };
}