import { prisma } from "@/lib/prisma";
import PromoBandCarousel from "@/components/PromoBandCarousel";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";
import { getFavorisContext } from "@/lib/favoris";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function PromoBand() {
  const [produits, promosActives, favCtx] = await Promise.all([
    prisma.produit.findMany({
      where: { publie: true },
      include: { marque: { select: { nom: true } } },
    }),
    getPromotionsActives(),
    getFavorisContext(),
  ]);

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

  if (enPromo.length === 0) return null;

  return <PromoBandCarousel promos={enPromo} favorisCodes={favCtx.favorisCodes} connecte={favCtx.connecte} />;
}