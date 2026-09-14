import { prisma } from "@/lib/prisma";
import ProductSelectionFilters from "@/components/ProductSelectionFilters";
import { getFavorisContext } from "@/lib/favoris";
import { calculerPrixMini, appliquerPromoVitrine, urlProduit, getMargeGlobale, resoudreVitrinePourPrix } from "@/lib/catalogue";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function ProductSelection() {
  const [vitrines, favCtx, marge] = await Promise.all([
    prisma.produitVitrine.findMany({
      where: { publie: true, enAvant: true, gamme: { publie: true } },
      include: {
        gamme: { select: { nom: true, venteSurDevis: true, marque: { select: { nom: true } } } },
        categories: { select: { slug: true }, take: 1 },
        sousCategories: { select: { slug: true }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 16,
    }),
    getFavorisContext(),
    getMargeGlobale(),
  ]);

  if (vitrines.length === 0) return null;

  const produits = vitrines.map((v) => {
    const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
    const prixMini = calculerPrixMini(resoudreVitrinePourPrix(v, marge), surDevis, marge);
    const promo = appliquerPromoVitrine(v, prixMini);
    const categorieSlug = v.categories[0]?.slug || null;
    return {
      vitrineId: v.id,
      href: urlProduit({ categorieSlug, sousCategorieSlug: v.sousCategories[0]?.slug || null, slug: v.slug }),
      // Sert au filtre par rayon : les clés des pastilles sont des slugs de catégorie.
      cat: categorieSlug,
      brand: v.gamme.marque?.nom || null,
      name: v.nom,
      attr: v.gamme.nom,
      images: (v.images && v.images.length ? v.images : (v.imageUrl ? [v.imageUrl] : [])),
      price: surDevis && prixMini == null ? "Sur devis" : fmt(promo.prixFinal),
      oldPrice: promo.enPromo ? fmt(promo.prixBase) : undefined,
      promo: promo.enPromo ? `-${promo.promoPct}%` : undefined,
    };
  });

  return <ProductSelectionFilters produits={produits} favorisVitrines={favCtx.favorisVitrines} connecte={favCtx.connecte} />;
}
