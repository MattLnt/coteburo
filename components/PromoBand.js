import { prisma } from "@/lib/prisma";
import PromoBandCarousel from "@/components/PromoBandCarousel";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";
import { getFavorisContext } from "@/lib/favoris";
import { calculerPrixMini, appliquerPromoVitrine, urlProduit } from "@/lib/catalogue";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function PromoBand() {
  const [produitsAnciens, promosActives, favCtx, vitrines] = await Promise.all([
    prisma.produit.findMany({
      where: { publie: true },
      include: { marque: { select: { nom: true } } },
    }),
    getPromotionsActives(),
    getFavorisContext(),
    prisma.produitVitrine.findMany({
      where: { publie: true, gamme: { publie: true }, promoPct: { not: null } },
      include: {
        produits: { select: { prixVenteHT: true, prixPublicHT: true } },
        gamme: { select: { venteSurDevis: true } },
        categories: { select: { slug: true }, take: 1 },
        sousCategories: { select: { slug: true }, take: 1 },
      },
    }),
  ]);

  const enPromoAnciens = produitsAnciens
    .map((p) => {
      const calc = appliquerPromotions(p, promosActives);
      return { p, calc };
    })
    .filter(({ calc }) => calc.enPromo)
    .map(({ p, calc }) => ({
      id: `ancien:${p.codeRacine}`,
      href: `/produit/${p.slug || p.codeRacine}`,
      codeRacine: p.codeRacine,
      estNouveau: false,
      brand: p.marque?.nom,
      name: p.designation,
      attr: p.gamme,
      images: p.images,
      price: fmt(calc.prixFinal),
      oldPrice: fmt(calc.prixBase),
      promo: `-${calc.promoPct}%`,
    }));

  const enPromoNouveaux = vitrines
    .map((v) => {
      const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
      const prixMini = calculerPrixMini(v, surDevis);
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
    }));

  const enPromo = [...enPromoNouveaux, ...enPromoAnciens].slice(0, 9);
  if (enPromo.length === 0) return null;

  return <PromoBandCarousel promos={enPromo} favorisCodes={favCtx.favorisCodes} favorisVitrines={favCtx.favorisVitrines} connecte={favCtx.connecte} />;
}