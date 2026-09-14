import { prisma } from "@/lib/prisma";
import PromoBandCarousel from "@/components/PromoBandCarousel";
import { getFavorisContext } from "@/lib/favoris";
import { calculerPrixMini, appliquerPromoVitrine, urlProduit, getMargeGlobale, resoudreVitrinePourPrix } from "@/lib/catalogue";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function PromoBand() {
  const [favCtx, vitrines] = await Promise.all([
    getFavorisContext(),
    prisma.produitVitrine.findMany({
      where: { publie: true, gamme: { publie: true }, promoPct: { not: null } },
      include: {
        gamme: { select: { venteSurDevis: true } },
        categories: { select: { slug: true }, take: 1 },
        sousCategories: { select: { slug: true }, take: 1 },
      },
    }),
  ]);

  // Sans la marge, calculerPrixMini retombe sur les montants stockés : le
  // bandeau promo calculait donc sa remise sur un prix de base périmé.
  const marge = await getMargeGlobale();

  const enPromo = vitrines
    .map((v) => {
      const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
      const prixMini = calculerPrixMini(resoudreVitrinePourPrix(v, marge), surDevis, marge);
      const calc = appliquerPromoVitrine(v, prixMini);
      return { v, calc };
    })
    .filter(({ calc }) => calc.enPromo)
    .map(({ v, calc }) => ({
      id: `vitrine:${v.id}`,
      href: urlProduit({ categorieSlug: v.categories[0]?.slug || null, sousCategorieSlug: v.sousCategories[0]?.slug || null, slug: v.slug }),
      codeRacine: v.id,
      estNouveau: true,
      brand: null,
      name: v.nom,
      attr: null,
      images: (v.images && v.images.length ? v.images : (v.imageUrl ? [v.imageUrl] : [])),
      price: fmt(calc.prixFinal),
      oldPrice: fmt(calc.prixBase),
      promo: `-${calc.promoPct}%`,
    }))
    .slice(0, 9);

  if (enPromo.length === 0) return null;

  return <PromoBandCarousel promos={enPromo} favorisCodes={favCtx.favorisCodes} favorisVitrines={favCtx.favorisVitrines} connecte={favCtx.connecte} />;
}
