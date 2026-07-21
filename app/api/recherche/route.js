import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";
import { calculerPrixMini, urlProduit } from "@/lib/catalogue";

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
    prisma.categorie.findMany({ where: { nom: { contains: q, mode: "insensitive" } }, select: { id: true, slug: true } }),
    prisma.sousCategorie.findMany({ where: { nom: { contains: q, mode: "insensitive" } }, select: { id: true, slug: true } }),
  ]);
  const categorieIds = categoriesMatch.map((c) => c.id);
  const sousCategorieIds = sousCategoriesMatch.map((s) => s.id);
  const categorieSlugs = categoriesMatch.map((c) => c.slug);
  const sousCategorieSlugs = sousCategoriesMatch.map((s) => s.slug);

  // ── Ancien système : Produit (import Buronomic) ──
  const whereAncien = {
    publie: true,
    OR: [
      { designation: { contains: q, mode: "insensitive" } },
      { gamme: { contains: q, mode: "insensitive" } },
      { codeRacine: { contains: q, mode: "insensitive" } },
      { marque: { nom: { contains: q, mode: "insensitive" } } },
      ...(categorieSlugs.length ? [{ categorie: { in: categorieSlugs } }] : []),
      ...(sousCategorieSlugs.length ? [{ sousCategorie: { in: sousCategorieSlugs } }] : []),
    ],
  };

  const [produitsAnciens, totalAncien, promosActives] = await Promise.all([
    prisma.produit.findMany({
      where: whereAncien,
      include: { marque: { select: { nom: true } } },
      orderBy: { designation: "asc" },
      take: limit,
    }),
    prisma.produit.count({ where: whereAncien }),
    getPromotionsActives(),
  ]);

  const resultatsAnciens = produitsAnciens.map((p) => {
    const { prixFinal, prixBase, enPromo, promoPct } = appliquerPromotions(p, promosActives);
    return {
      id: `ancien:${p.codeRacine}`,
      href: `/produit/${p.slug || p.codeRacine}`,
      designation: p.designation,
      gamme: p.gamme,
      brand: p.marque?.nom || null,
      image: p.images?.[0] || null,
      price: fmt(prixFinal),
      oldPrice: enPromo ? fmt(prixBase) : null,
      promo: enPromo ? `-${promoPct}%` : null,
    };
  });

  // ── Nouveau système : ProduitVitrine (créés à la main) ──
  const whereNouveau = {
    publie: true,
    gamme: { publie: true },
    OR: [
      { nom: { contains: q, mode: "insensitive" } },
      ...(categorieIds.length ? [{ categories: { some: { id: { in: categorieIds } } } }] : []),
      ...(sousCategorieIds.length ? [{ sousCategories: { some: { id: { in: sousCategorieIds } } } }] : []),
    ],
  };

  const [vitrines, totalNouveau] = await Promise.all([
    prisma.produitVitrine.findMany({
      where: whereNouveau,
      include: {
        produits: { select: { prixVenteHT: true, prixPublicHT: true } },
        gamme: { select: { nom: true, venteSurDevis: true } },
        categories: { select: { slug: true }, take: 1 },
        sousCategories: { select: { slug: true }, take: 1 },
      },
      orderBy: { nom: "asc" },
      take: limit,
    }),
    prisma.produitVitrine.count({ where: whereNouveau }),
  ]);

  const resultatsNouveaux = vitrines.map((v) => {
    const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
    const prixMini = calculerPrixMini(v, surDevis);
    return {
      id: `vitrine:${v.id}`,
      href: urlProduit({ categorieSlug: v.categories[0]?.slug || null, sousCategorieSlug: v.sousCategories[0]?.slug || null, slug: v.slug }),
      designation: v.nom,
      gamme: v.gamme.nom,
      brand: null,
      image: (v.images && v.images[0]) || v.imageUrl || null,
      price: prixMini != null ? fmt(prixMini) : "Sur devis",
      oldPrice: null,
      promo: null,
    };
  });

  // ── Fusion, tri, limite globale ──
  const resultats = [...resultatsNouveaux, ...resultatsAnciens]
    .sort((a, b) => (a.designation || "").localeCompare(b.designation || ""))
    .slice(0, limit);
  const total = totalAncien + totalNouveau;

  return NextResponse.json({ produits: resultats, total });
}