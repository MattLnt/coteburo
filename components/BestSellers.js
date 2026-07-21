import { prisma } from "@/lib/prisma";
import BestSellersCarousel from "@/components/BestSellersCarousel";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";
import { getFavorisContext } from "@/lib/favoris";
import { calculerPrixMini, urlProduit } from "@/lib/catalogue";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function BestSellers() {
  const [produitsAnciens, promosActives, favCtx, vitrines] = await Promise.all([
    prisma.produit.findMany({
      where: { publie: true, bestSeller: true },
      include: { marque: { select: { nom: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    getPromotionsActives(),
    getFavorisContext(),
    prisma.produitVitrine.findMany({
      where: { publie: true, bestSeller: true, gamme: { publie: true } },
      include: {
        produits: { select: { prixVenteHT: true, prixPublicHT: true } },
        gamme: { select: { venteSurDevis: true } },
        categories: { select: { slug: true }, take: 1 },
        sousCategories: { select: { slug: true }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const formattedAnciens = produitsAnciens.map((p) => {
    const { prixFinal, prixBase, enPromo, promoPct } = appliquerPromotions(p, promosActives);
    return {
      id: `ancien:${p.codeRacine}`,
      href: `/produit/${p.slug || p.codeRacine}`,
      codeRacine: p.codeRacine,
      estNouveau: false,
      brand: p.marque?.nom,
      name: p.designation,
      attr: p.gamme,
      images: p.images,
      price: fmt(prixFinal),
      oldPrice: enPromo ? fmt(prixBase) : undefined,
      promo: enPromo ? `-${promoPct}%` : undefined,
    };
  });

  const formattedNouveaux = vitrines.map((v) => {
    const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
    const prixMini = calculerPrixMini(v, surDevis);
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

  const formatted = [...formattedNouveaux, ...formattedAnciens];
  if (formatted.length === 0) return null;

  return <BestSellersCarousel produits={formatted} favorisCodes={favCtx.favorisCodes} favorisVitrines={favCtx.favorisVitrines} connecte={favCtx.connecte} />;
}