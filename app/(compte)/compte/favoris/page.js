import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import FavorisGrille from "./FavorisGrille";
import { urlProduit, calculerPrixMini } from "@/lib/catalogue";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes favoris · Côté BURO" };

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function FavorisPage() {
  const session = await auth();
  const userId = session.user.id;

  // Favoris de l'utilisateur, ordre le plus récent d'abord — les deux systèmes ensemble
  const favoris = await prisma.favori.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const codesAnciens = favoris.map((f) => f.codeRacine).filter(Boolean);
  const vitrineIds = favoris.map((f) => f.vitrineId).filter(Boolean);

  // ── Ancien système ──
  const produitsAnciens = codesAnciens.length
    ? await prisma.produit.findMany({ where: { codeRacine: { in: codesAnciens }, publie: true } })
    : [];
  const itemsAnciens = produitsAnciens.map((p) => ({
    id: `ancien:${p.codeRacine}`,
    codeRacine: p.codeRacine,
    href: `/produit/${p.slug || p.codeRacine}`,
    designation: p.designation,
    gamme: p.gamme,
    imageUrl: p.images?.[0] || null,
    prixPublicHT: p.prixPublicHT,
    prixVenteHT: p.prixVenteHT,
  }));

  // ── Nouveau système ──
  const vitrines = vitrineIds.length
    ? await prisma.produitVitrine.findMany({
        where: { id: { in: vitrineIds }, publie: true, gamme: { publie: true } },
        include: {
          produits: { select: { prixVenteHT: true, prixPublicHT: true } },
          gamme: { select: { nom: true, venteSurDevis: true } },
          categories: { select: { slug: true }, take: 1 },
          sousCategories: { select: { slug: true }, take: 1 },
        },
      })
    : [];
  const itemsNouveaux = vitrines.map((v) => {
    const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
    const prixMini = calculerPrixMini(v, surDevis);
    return {
      id: `vitrine:${v.id}`,
      vitrineId: v.id,
      href: urlProduit({ categorieSlug: v.categories[0]?.slug || null, sousCategorieSlug: v.sousCategories[0]?.slug || null, slug: v.slug }),
      designation: v.nom,
      gamme: v.gamme.nom,
      imageUrl: (v.images && v.images[0]) || v.imageUrl || null,
      prix: prixMini != null ? fmt(prixMini) : "Sur devis",
    };
  });

  // Ré-ordonne selon l'ordre réel des favoris (plus récent d'abord)
  const items = favoris
    .map((f) => {
      if (f.codeRacine) return itemsAnciens.find((it) => it.codeRacine === f.codeRacine);
      return itemsNouveaux.find((it) => it.vitrineId === f.vitrineId);
    })
    .filter(Boolean);

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Espace client</p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2">Mes favoris</h1>
        <p className="text-ink-soft mt-2">Retrouvez ici les produits que vous avez enregistrés.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center">
          <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-surface-2 text-ink-soft/40">
            <svg width="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
          </div>
          <p className="text-ink-soft">Vous n&apos;avez pas encore de favoris.</p>
          <p className="text-[13px] text-ink-soft/80 mt-1">Cliquez sur le cœur d&apos;un produit pour l&apos;enregistrer ici.</p>
          <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Découvrir le catalogue →</Link>
        </div>
      ) : (
        <FavorisGrille items={JSON.parse(JSON.stringify(items))} />
      )}
    </div>
  );
}