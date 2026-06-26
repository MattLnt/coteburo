import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import CatalogueFilters from "@/components/CatalogueFilters";

export const dynamic = "force-dynamic";

const CATS = {
  sieges: "Sièges & fauteuils",
  bureaux: "Bureaux",
  tables: "Tables de réunion",
  rangements: "Rangements",
  acoustique: "Acoustique",
  accueil: "Mobilier d'accueil",
};

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const key = slug?.[0];
  const titre = (key && CATS[key]) || "Catalogue";
  return { title: titre, alternates: { canonical: key ? `/catalogue/${key}` : "/catalogue" } };
}

export default async function CataloguePage({ params }) {
  const { slug } = await params;
  const key = slug?.[0];
  const titre = (key && CATS[key]) || "Tout le catalogue";

  const produits = await prisma.produit.findMany({
    where: {
      publie: true,
      ...(key && CATS[key] ? { categorie: key } : {}),
    },
    include: { marque: { select: { nom: true } } },
    orderBy: { designation: "asc" },
  });

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7">
        <div className="pt-6 pb-2 text-sm text-ink-soft">
          <Link href="/" className="hover:text-orange">Accueil</Link> / <Link href="/catalogue" className="hover:text-orange">Catalogue</Link>
          {key && <> / <span className="text-ink">{titre}</span></>}
        </div>
        <div className="pt-2 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Catalogue</p>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl mt-3">{titre}</h1>
          <p className="text-ink-soft text-lg mt-4 max-w-[560px]">
            Du fauteuil de direction à la chaise visiteur : des assises confortables, ergonomiques et design.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-16">
        <div className="grid lg:grid-cols-[268px_1fr] gap-8 items-start">
          <CatalogueFilters />

          <div>
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <p className="text-sm text-ink-soft"><b className="text-ink">{produits.length}</b> produit{produits.length > 1 ? "s" : ""}</p>
              <div className="flex items-center gap-2 bg-surface border border-line rounded-full px-4 py-2.5 text-sm font-medium">
                Trier : Pertinence
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>

            {produits.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-12 text-center">
                <p className="text-ink-soft">Aucun produit disponible dans cette catégorie pour le moment.</p>
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Demander un devis →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {produits.map((p) => {
                  const enPromo = p.prixVenteHT != null && p.prixVenteHT < p.prixPublicHT;
                  return (
                    <ProductCard
                      key={p.codeRacine}
                      href={`/produit/${p.slug || p.codeRacine}`}
                      brand={p.marque?.nom}
                      name={p.designation}
                      attr={p.gamme}
                      images={p.images}
                      price={fmt(p.prixVenteHT ?? p.prixPublicHT)}
                      oldPrice={enPromo ? fmt(p.prixPublicHT) : undefined}
                      promo={enPromo ? `-${Math.round((1 - p.prixVenteHT / p.prixPublicHT) * 100)}%` : undefined}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-20">
        <div className="rounded-[24px] bg-charcoal text-white p-9 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
          <div>
            <h3 className="font-display font-bold text-2xl">Un projet d&apos;aménagement complet ?</h3>
            <p className="text-[#bfc4cb] mt-1.5">Au-delà de la boutique, nos experts vous accompagnent sur devis avec plan 3D, livraison et montage.</p>
          </div>
          <Link href="/contact" className="shrink-0 inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3.5 hover:bg-orange-dark transition">Demander un devis →</Link>
        </div>
      </section>
    </main>
  );
}