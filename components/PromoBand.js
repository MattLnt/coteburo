import { prisma } from "@/lib/prisma";
import PromoBandCarousel from "@/components/PromoBandCarousel";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function PromoBand() {
  const [produits, promosActives] = await Promise.all([
    prisma.produit.findMany({
      where: { publie: true },
      include: { marque: { select: { nom: true } } },
    }),
    getPromotionsActives(),
  ]);

  // On ne garde que les produits réellement en promo (campagne active qui les cible)
  const enPromo = produits
    .map((p) => {
      const calc = appliquerPromotions(p, promosActives);
      return { p, calc };
    })
    .filter(({ calc }) => calc.enPromo)
    .slice(0, 9)
    .map(({ p, calc }) => ({
      codeRacine: p.codeRacine,
      slug: p.slug,
      brand: p.marque?.nom,
      name: p.designation,
      attr: p.gamme,
      images: p.images,
      price: fmt(calc.prixFinal),
      oldPrice: fmt(calc.prixBase),
      promo: `-${calc.promoPct}%`,
    }));

  // Si aucun produit en promo, on n'affiche pas la section
  if (enPromo.length === 0) return null;

  return <PromoBandCarousel promos={enPromo} />;
}