import { prisma } from "@/lib/prisma";
import BestSellersCarousel from "@/components/BestSellersCarousel";
import { getFavorisContext } from "@/lib/favoris";
import { calculerPrixMini, urlProduit, getMargeGlobale, resoudreVitrinePourPrix } from "@/lib/catalogue";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function BestSellers() {
  const [favCtx, vitrines] = await Promise.all([
    getFavorisContext(),
    prisma.produitVitrine.findMany({
      where: { publie: true, bestSeller: true, gamme: { publie: true } },
      include: {
        gamme: { select: { venteSurDevis: true } },
        categories: { select: { slug: true }, take: 1 },
        sousCategories: { select: { slug: true }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  // Sans la marge, calculerPrixMini retombe sur les montants stockés : le
  // carrousel affichait un prix figé là où la carte du catalogue suivait les
  // Réglages.
  const marge = await getMargeGlobale();

  const formatted = vitrines.map((v) => {
    const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
    const prixMini = calculerPrixMini(resoudreVitrinePourPrix(v, marge), surDevis, marge);
    return {
      id: `vitrine:${v.id}`,
      href: urlProduit({ categorieSlug: v.categories[0]?.slug || null, sousCategorieSlug: v.sousCategories[0]?.slug || null, slug: v.slug }),
      codeRacine: v.id,
      estNouveau: true,
      brand: null,
      name: v.nom,
      attr: null,
      images: (v.images && v.images.length ? v.images : (v.imageUrl ? [v.imageUrl] : [])),
      price: prixMini != null ? fmt(prixMini) : "Sur devis",
      oldPrice: undefined,
      promo: undefined,
    };
  });

  if (formatted.length === 0) return null;

  return <BestSellersCarousel produits={formatted} favorisCodes={favCtx.favorisCodes} favorisVitrines={favCtx.favorisVitrines} connecte={favCtx.connecte} />;
}
