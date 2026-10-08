import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculerPrixMini, urlProduit, getMargeGlobale, resoudreVitrinePourPrix, appliquerPromoVitrine, attacherCampagnes, inclureCombinaisonsPrix , imagePrincipaleOuGalerie } from "@/lib/catalogue";
import { getCampagnesActives } from "@/lib/promotions";

export const runtime = "nodejs";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = parseInt(searchParams.get("limit") || "8", 10);

  if (q.length < 2) return NextResponse.json({ produits: [], total: 0 });

  // Catégories/sous-catégories dont le nom correspond à la recherche (ex : "bur" -> "Bureaux")
  // — sert à ramener TOUS les produits de cette catégorie, pas juste ceux dont le nom contient "bur".
  const [categoriesMatch, sousCategoriesMatch] = await Promise.all([
    prisma.categorie.findMany({ where: { nom: { contains: q, mode: "insensitive" } }, select: { id: true } }),
    prisma.sousCategorie.findMany({ where: { nom: { contains: q, mode: "insensitive" } }, select: { id: true } }),
  ]);
  const categorieIds = categoriesMatch.map((c) => c.id);
  const sousCategorieIds = sousCategoriesMatch.map((s) => s.id);

  const whereNouveau = {
    publie: true,
    // Même règle que le catalogue : un accessoire vendu seulement avec un
    // produit ne se cherche pas, il se coche sur la fiche qu'il complète.
    accessoireSeul: false,
    gamme: { publie: true },
    OR: [
      { nom: { contains: q, mode: "insensitive" } },
      ...(categorieIds.length ? [{ categories: { some: { id: { in: categorieIds } } } }] : []),
      ...(sousCategorieIds.length ? [{ sousCategories: { some: { id: { in: sousCategorieIds } } } }] : []),
    ],
  };

  const [vitrines, total, marge] = await Promise.all([
    prisma.produitVitrine.findMany({
      where: whereNouveau,
      include: {
        combinaisons: inclureCombinaisonsPrix,
        gamme: { select: { nom: true, venteSurDevis: true, marque: { select: { nom: true, slug: true } } } },
        // Toutes les catégories, pas la première : une campagne peut viser
        // n'importe laquelle.
        categories: { select: { slug: true } },
        sousCategories: { select: { slug: true }, take: 1 },
      },
      orderBy: { nom: "asc" },
      take: limit,
    }),
    prisma.produitVitrine.count({ where: whereNouveau }),
    getMargeGlobale(),
  ]);
  // Le prix de la recherche ignorait les promotions : une fiche remisée y
  // gardait son ancien tarif, contredit dès la carte du catalogue.
  attacherCampagnes(vitrines, await getCampagnesActives());

  const produits = vitrines
    .map((v) => {
      const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
      // Sans la marge, le prix affiché dans la recherche ne suit pas les Réglages.
      const prixMini = calculerPrixMini(resoudreVitrinePourPrix(v, marge), surDevis, marge);
      const promo = surDevis || prixMini == null
        ? { prixFinal: prixMini, prixBase: null, enPromo: false, promoPct: null }
        : appliquerPromoVitrine(v, prixMini);
      return {
        id: `vitrine:${v.id}`,
        href: urlProduit({ categorieSlug: v.categories[0]?.slug || null, sousCategorieSlug: v.sousCategories[0]?.slug || null, slug: v.slug }),
        designation: v.nom,
        gamme: v.gamme.nom,
        brand: v.gamme.marque?.nom || null,
        image: imagePrincipaleOuGalerie(v),
        price: promo.prixFinal != null ? fmt(promo.prixFinal) : "Sur devis",
        oldPrice: promo.enPromo ? fmt(promo.prixBase) : null,
        promo: promo.enPromo ? `-${promo.promoPct}%` : null,
      };
    })
    .sort((a, b) => (a.designation || "").localeCompare(b.designation || ""))
    .slice(0, limit);

  // La même recherche revient sans cesse : « bureau », « siège », « armoire »,
  // tapées par des visiteurs différents, et la barre interroge à chaque
  // frappe passé le délai d'attente. Une minute de cache partagé absorbe ces
  // rafales sans que personne ne voie un prix périmé plus d'une minute, et la
  // réponse reste servie pendant qu'une version fraîche se prépare.
  return NextResponse.json({ produits, total }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
