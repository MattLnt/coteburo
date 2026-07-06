import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CatalogueContent from "@/components/CatalogueContent";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";
import { getFavorisContext } from "@/lib/favoris";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  const { q } = await searchParams;
  return { title: q ? `Recherche : ${q}` : "Recherche", robots: { index: false } };
}

export default async function RecherchePage({ searchParams }) {
  const { q } = await searchParams;
  const query = (q || "").trim();

  let produits = [];
  let favCtx = { favorisCodes: [], connecte: false };

  if (query.length >= 2) {
    const where = {
      publie: true,
      OR: [
        { designation: { contains: query, mode: "insensitive" } },
        { gamme: { contains: query, mode: "insensitive" } },
        { codeRacine: { contains: query, mode: "insensitive" } },
        { marque: { nom: { contains: query, mode: "insensitive" } } },
      ],
    };

    const [produitsRaw, promosActives, ctx] = await Promise.all([
      prisma.produit.findMany({
        where,
        include: { marque: { select: { nom: true } } },
        orderBy: { designation: "asc" },
      }),
      getPromotionsActives(),
      getFavorisContext(),
    ]);
    favCtx = ctx;

    produits = produitsRaw.map((p) => {
      const { prixFinal, prixBase, enPromo, promoPct } = appliquerPromotions(p, promosActives);
      return {
        codeRacine: p.codeRacine,
        slug: p.slug,
        designation: p.designation,
        gamme: p.gamme,
        brand: p.marque?.nom || null,
        images: p.images,
        categorie: p.categorie,
        sousCategorie: p.sousCategorie,
        prixPublicHT: p.prixPublicHT,
        _prixFinal: prixFinal,
        _prixBase: prixBase,
        _enPromo: enPromo,
        _promoPct: promoPct,
      };
    });
  }

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7">
        <div className="pt-6 pb-2 text-sm text-ink-soft">
          <Link href="/" className="hover:text-orange">Accueil</Link> / <span className="text-ink">Recherche</span>
        </div>
        <div className="pt-2 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Recherche</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mt-3">
            {query ? <>Résultats pour «&nbsp;{query}&nbsp;»</> : "Rechercher un produit"}
          </h1>
          {query && <p className="text-ink-soft mt-3">{produits.length} produit{produits.length > 1 ? "s" : ""} trouvé{produits.length > 1 ? "s" : ""}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-20">
        {query.length < 2 ? (
          <div className="rounded-2xl border border-line bg-surface p-12 text-center">
            <p className="text-ink-soft">Saisissez au moins 2 caractères pour lancer une recherche.</p>
            <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Parcourir le catalogue →</Link>
          </div>
        ) : produits.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-12 text-center">
            <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-surface-2 text-ink-soft/40">
              <svg width="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
            <p className="text-ink">Aucun produit ne correspond à «&nbsp;{query}&nbsp;».</p>
            <p className="text-[13px] text-ink-soft mt-1">Essayez un autre mot-clé, une gamme ou une marque.</p>
            <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Parcourir le catalogue →</Link>
          </div>
        ) : (
          <CatalogueContent
            produits={produits}
            favorisCodes={favCtx.favorisCodes}
            connecte={favCtx.connecte}
          />
        )}
      </div>
    </main>
  );
}