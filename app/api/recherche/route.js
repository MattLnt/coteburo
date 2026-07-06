import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";

export const runtime = "nodejs";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = parseInt(searchParams.get("limit") || "8", 10);

  if (q.length < 2) return NextResponse.json({ produits: [], total: 0 });

  const where = {
    publie: true,
    OR: [
      { designation: { contains: q, mode: "insensitive" } },
      { gamme: { contains: q, mode: "insensitive" } },
      { codeRacine: { contains: q, mode: "insensitive" } },
      { marque: { nom: { contains: q, mode: "insensitive" } } },
    ],
  };

  const [produits, total, promosActives] = await Promise.all([
    prisma.produit.findMany({
      where,
      include: { marque: { select: { nom: true } } },
      orderBy: { designation: "asc" },
      take: limit,
    }),
    prisma.produit.count({ where }),
    getPromotionsActives(),
  ]);

  const resultats = produits.map((p) => {
    const { prixFinal, prixBase, enPromo, promoPct } = appliquerPromotions(p, promosActives);
    return {
      codeRacine: p.codeRacine,
      slug: p.slug || p.codeRacine,
      designation: p.designation,
      gamme: p.gamme,
      brand: p.marque?.nom || null,
      image: p.images?.[0] || null,
      price: fmt(prixFinal),
      oldPrice: enPromo ? fmt(prixBase) : null,
      promo: enPromo ? `-${promoPct}%` : null,
    };
  });

  return NextResponse.json({ produits: resultats, total });
}