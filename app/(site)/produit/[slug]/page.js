import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductGallery from "@/components/ProductGallery";
import ProductBuy from "@/components/ProductBuy";
import ProductCard from "@/components/ProductCard";
import CtaBand from "@/components/CtaBand";

export const dynamic = "force-dynamic";

const CATS = {
  sieges: "Sièges & fauteuils", bureaux: "Bureaux", tables: "Tables de réunion",
  rangements: "Rangements", acoustique: "Acoustique", accueil: "Mobilier d'accueil",
};

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

async function getProduit(slug) {
  return prisma.produit.findFirst({
    where: { publie: true, OR: [{ slug }, { codeRacine: slug }] },
    include: {
      marque: { select: { nom: true } },
      variantes: { select: { codeArticle: true, finition: true, ecoContribution: true } },
    },
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduit(decodeURIComponent(slug));
  if (!p) return { title: "Produit introuvable" };
  return { title: p.designation, alternates: { canonical: `/produit/${p.slug || p.codeRacine}` } };
}

export default async function ProduitPage({ params }) {
  const { slug } = await params;
  const p = await getProduit(decodeURIComponent(slug));
  if (!p) notFound();

  const prix = p.prixVenteHT ?? p.prixPublicHT;
  const enPromo = p.prixVenteHT != null && p.prixVenteHT < p.prixPublicHT;
  const promoPct = enPromo ? Math.round((1 - p.prixVenteHT / p.prixPublicHT) * 100) : null;
  const ttc = prix * 1.2;
  const eco = p.variantes.find((v) => v.ecoContribution > 0)?.ecoContribution || 0;
  const finitions = [...new Set(p.variantes.map((v) => v.finition).filter(Boolean))];

  const catLabel = (p.categorie && CATS[p.categorie]) || "Catalogue";
  const catHref = p.categorie && CATS[p.categorie] ? `/catalogue/${p.categorie}` : "/catalogue";
  const images = p.images?.length ? p.images : [];

  const related = await prisma.produit.findMany({
    where: { publie: true, categorie: p.categorie, NOT: { codeRacine: p.codeRacine } },
    include: { marque: { select: { nom: true } } },
    take: 3,
    orderBy: { designation: "asc" },
  });

  const SPECS = [
    ["Marque", p.marque?.nom],
    ["Gamme", p.gamme],
    ["Catégorie", catLabel],
    ["Référence", p.codeRacine],
    finitions.length ? ["Finitions disponibles", `${finitions.length}`] : null,
    ["Garantie", "7 ans"],
  ].filter(Boolean);

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-6 pb-4 text-sm text-ink-soft">
        <Link href="/" className="hover:text-orange">Accueil</Link> / <Link href="/catalogue" className="hover:text-orange">Catalogue</Link> / <Link href={catHref} className="hover:text-orange">{catLabel}</Link> / <span className="text-ink">{p.designation}</span>
      </div>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-16">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {images.length > 0 ? (
            <ProductGallery images={images} alt={p.designation} />
          ) : (
            <div className="aspect-square rounded-3xl border border-line grid place-items-center bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f0ece4)]">
              <svg width="40%" viewBox="0 0 120 140" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-charcoal opacity-70">
                <path d="M38 22c0-5 4-9 9-9h26c5 0 9 4 9 9v40H38z" /><path d="M32 62h56l-4 20H36z" /><path d="M60 82v28" /><path d="M40 130l20-16 20 16" />
              </svg>
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange">{p.marque?.nom}</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2">{p.designation}</h1>
            <p className="text-sm text-ink-soft mt-2">{p.gamme}</p>

            <div className="flex items-end gap-3 mt-5 flex-wrap">
              <span className="font-display font-bold text-3xl">{fmt(prix)}</span>
              <span className="text-ink-soft">HT</span>
              {enPromo && <><span className="text-ink-soft line-through">{fmt(p.prixPublicHT)}</span><span className="rounded-full bg-orange text-white text-xs font-bold px-2.5 py-1">-{promoPct}%</span></>}
            </div>
            <p className="text-[13px] text-ink-soft mt-1">{fmt(ttc)} TTC{eco > 0 ? ` · éco-participation ${fmt(eco)}` : ""}</p>

            {p.descriptionWeb && <p className="text-ink-soft mt-5 leading-relaxed">{p.descriptionWeb}</p>}

            <ProductBuy />

            <div className="grid grid-cols-3 gap-3 mt-7 text-center text-[12px]">
              <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">Livraison</span><span className="text-ink-soft">& montage</span></div>
              <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">Garantie 7 ans</span><span className="text-ink-soft">offerte</span></div>
              <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">Conseil 3D</span><span className="text-ink-soft">sur devis</span></div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1400px] px-5 sm:px-7 py-14 border-t border-line">
          <h2 className="font-display font-bold text-2xl mb-5">Caractéristiques</h2>
          <div className="rounded-[24px] border border-line bg-surface overflow-hidden">
            {SPECS.map(([k, v], i) => (
              <div key={k} className={`flex justify-between px-6 py-3.5 text-sm ${i % 2 ? "bg-surface-2/40" : ""}`}>
                <span className="text-ink-soft">{k}</span><span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-7 py-14 border-t border-line">
            <h2 className="font-display font-bold text-2xl mb-6">Vous aimerez aussi</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((r) => {
                const rPromo = r.prixVenteHT != null && r.prixVenteHT < r.prixPublicHT;
                return (
                  <ProductCard
                    key={r.codeRacine}
                    href={`/produit/${r.slug || r.codeRacine}`}
                    brand={r.marque?.nom}
                    name={r.designation}
                    attr={r.gamme}
                    images={r.images}
                    price={fmt(r.prixVenteHT ?? r.prixPublicHT)}
                    oldPrice={rPromo ? fmt(r.prixPublicHT) : undefined}
                    promo={rPromo ? `-${Math.round((1 - r.prixVenteHT / r.prixPublicHT) * 100)}%` : undefined}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      <CtaBand />
    </main>
  );
}