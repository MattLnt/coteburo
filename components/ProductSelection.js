import { prisma } from "@/lib/prisma";
import ProductSelectionFilters from "@/components/ProductSelectionFilters";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function ProductSelection() {
  const [produits, promosActives] = await Promise.all([
    prisma.produit.findMany({
      where: { publie: true, enAvant: true },
      include: { marque: { select: { nom: true } } },
      orderBy: { updatedAt: "desc" },
      take: 16,
    }),
    getPromotionsActives(),
  ]);

  if (produits.length === 0) return null;

  const formatted = produits.map((p) => {
    const { prixFinal, prixBase, enPromo, promoPct } = appliquerPromotions(p, promosActives);
    return {
      codeRacine: p.codeRacine,
      slug: p.slug,
      cat: p.categorie,
      brand: p.marque?.nom,
      name: p.designation,
      attr: p.gamme,
      images: p.images,
      price: fmt(prixFinal),
      oldPrice: enPromo ? fmt(prixBase) : undefined,
      promo: enPromo ? `-${promoPct}%` : undefined,
    };
  });

  return <ProductSelectionFilters produits={formatted} />;
}