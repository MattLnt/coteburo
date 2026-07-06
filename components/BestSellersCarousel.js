"use client";
import { useRef, useMemo } from "react";
import ProductCard from "@/components/ProductCard";

export default function BestSellersCarousel({ produits, favorisCodes = [], connecte = false }) {
  const track = useRef(null);
  const favSet = useMemo(() => new Set(favorisCodes), [favorisCodes]);
  const scroll = (dir) => track.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Les préférés de nos clients</p>
          <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl mt-1.5">Meilleures ventes</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => scroll(-1)} aria-label="Précédent" className="w-[42px] h-[42px] rounded-full grid place-items-center bg-surface border border-line text-ink hover:border-orange hover:text-orange transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button onClick={() => scroll(1)} aria-label="Suivant" className="w-[42px] h-[42px] rounded-full grid place-items-center bg-surface border border-line text-ink hover:border-orange hover:text-orange transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      <div ref={track} className="flex gap-5 overflow-x-auto pb-1.5 [scrollbar-width:none] [scroll-snap-type:x_mandatory]">
        {produits.map((p) => (
          <div key={p.codeRacine} className="shrink-0 w-[300px] [scroll-snap-align:start]">
            <ProductCard
              href={`/produit/${p.slug || p.codeRacine}`}
              codeRacine={p.codeRacine}
              favori={favSet.has(p.codeRacine)}
              connecte={connecte}
              brand={p.brand}
              name={p.name}
              attr={p.attr}
              images={p.images}
              price={p.price}
              oldPrice={p.oldPrice}
              promo={p.promo}
            />
          </div>
        ))}
      </div>
    </section>
  );
}