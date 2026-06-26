import { prisma } from "@/lib/prisma";

// Récupère toutes les campagnes actuellement actives (statut + période)
export async function getPromotionsActives() {
  const now = new Date();
  const promos = await prisma.promotion.findMany({
    where: {
      actif: true,
      AND: [
        { OR: [{ dateDebut: null }, { dateDebut: { lte: now } }] },
        { OR: [{ dateFin: null }, { dateFin: { gte: now } }] },
      ],
    },
    include: { produits: { select: { codeRacine: true } } },
  });
  return promos;
}

// Calcule le meilleur prix promo pour un produit donné, selon les campagnes actives.
// Retourne { prixFinal, prixBase, enPromo, promoPct }
export function appliquerPromotions(produit, promosActives) {
  const prixBase = produit.prixVenteHT ?? produit.prixPublicHT;
  if (prixBase == null) return { prixFinal: null, prixBase: null, enPromo: false, promoPct: null };

  let meilleurPrix = prixBase;

  for (const promo of promosActives) {
    const cibleCategorie = promo.categories?.includes(produit.categorie);
    const cibleProduit = promo.produits?.some((p) => p.codeRacine === produit.codeRacine);
    if (!cibleCategorie && !cibleProduit) continue;

    let prixRemise;
    if (promo.typeRemise === "montant") {
      prixRemise = prixBase - promo.valeur;
    } else {
      prixRemise = prixBase * (1 - promo.valeur / 100);
    }
    if (prixRemise < meilleurPrix) meilleurPrix = prixRemise;
  }

  meilleurPrix = Math.max(0, Math.round(meilleurPrix * 100) / 100);
  const enPromo = meilleurPrix < prixBase;
  const promoPct = enPromo ? Math.round((1 - meilleurPrix / prixBase) * 100) : null;

  return { prixFinal: meilleurPrix, prixBase, enPromo, promoPct };
}