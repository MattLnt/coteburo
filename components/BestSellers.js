import { prisma } from "@/lib/prisma";
import BestSellersCarousel from "@/components/BestSellersCarousel";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";
import { getFavorisContext } from "@/lib/favoris";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function BestSellers() {
  const [produits, promosActives, favCtx] = await Promise.all([
    prisma.produit.findMany({
      where: { publie: true, bestSeller: true },
      include: { marque: { select: { nom: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    getPromotionsActives(),
    getFavorisContext(),
  ]);

  if (produits.length === 0) return null;

  const formatted = produits.map((p) => {
    const { prixFinal, prixBase, enPromo, promoPct } = appliquerPromotions(p, promosActives);
    return {
      codeRacine: p.codeRacine,
      slug: p.slug,
      brand: p.marque?.nom,
      name: p.designation,
      attr: p.gamme,
      images: p.images,
      price: fmt(prixFinal),
      oldPrice: enPromo ? fmt(prixBase) : undefined,
      promo: enPromo ? `-${promoPct}%` : undefined,
    };
  });

  return <BestSellersCarousel produits={formatted} favorisCodes={favCtx.favorisCodes} connecte={favCtx.connecte} />;
}