import { prisma } from "@/lib/prisma";
import BestSellersCarousel from "@/components/BestSellersCarousel";
import { getFavorisContext } from "@/lib/favoris";
import { calculerPrixMini, urlProduit, getMargeGlobale, resoudreVitrinePourPrix, appliquerPromoVitrine, attacherCampagnes, inclureCombinaisonsPrix } from "@/lib/catalogue";
import { getCampagnesActives } from "@/lib/promotions";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function BestSellers() {
  const [favCtx, vitrines] = await Promise.all([
    getFavorisContext(),
    prisma.produitVitrine.findMany({
      where: { publie: true, bestSeller: true, gamme: { publie: true } },
      include: {
        combinaisons: inclureCombinaisonsPrix,
        gamme: { select: { venteSurDevis: true, marque: { select: { nom: true, slug: true } } } },
        categories: { select: { slug: true } },
        sousCategories: { select: { slug: true }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);
  // Les meilleures ventes affichaient un prix sans promotion, ni celle de
  // la fiche ni les campagnes.
  attacherCampagnes(vitrines, await getCampagnesActives());

  // Sans la marge, calculerPrixMini retombe sur les montants stockés : le
  // carrousel affichait un prix figé là où la carte du catalogue suivait les
  // Réglages.
  const marge = await getMargeGlobale();

  const formatted = vitrines.map((v) => {
    const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
    const prixMini = calculerPrixMini(resoudreVitrinePourPrix(v, marge), surDevis, marge);
    const promo = surDevis || prixMini == null
      ? { prixFinal: prixMini, prixBase: null, enPromo: false, promoPct: null }
      : appliquerPromoVitrine(v, prixMini);
    return {
      id: `vitrine:${v.id}`,
      href: urlProduit({ categorieSlug: v.categories[0]?.slug || null, sousCategorieSlug: v.sousCategories[0]?.slug || null, slug: v.slug }),
      codeRacine: v.id,
      estNouveau: true,
      brand: v.gamme.marque?.nom || null,
      name: v.nom,
      attr: null,
      images: (v.images && v.images.length ? v.images : (v.imageUrl ? [v.imageUrl] : [])),
      price: promo.prixFinal != null ? fmt(promo.prixFinal) : "Sur devis",
      oldPrice: promo.enPromo ? fmt(promo.prixBase) : undefined,
      promo: promo.enPromo ? `-${promo.promoPct}%` : undefined,
    };
  });

  if (formatted.length === 0) return null;

  return <BestSellersCarousel produits={formatted} favorisCodes={favCtx.favorisCodes} favorisVitrines={favCtx.favorisVitrines} connecte={favCtx.connecte} />;
}
