"use client";
import { useRef, useMemo } from "react";
import ProductCard from "@/components/ProductCard";

export default function BestSellersCarousel({ produits, favorisCodes = [], favorisVitrines = [], connecte = false }) {
  const track = useRef(null);
  const favSetCodes = useMemo(() => new Set(favorisCodes), [favorisCodes]);
  const favSetVitrines = useMemo(() => new Set(favorisVitrines), [favorisVitrines]);
  const scroll = (dir) => track.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  return (
    <section className="w-full">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 flex items-end justify-between gap-4 mb-4 sm:mb-7">
        <div>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Les préférés de nos clients</p>
          <h2 className="font-display font-bold text-ink text-[21px] sm:text-3xl mt-1 sm:mt-1.5">Meilleures ventes</h2>
        </div>
        {/* Flèches masquées sur mobile : on fait glisser au doigt */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button onClick={() => scroll(-1)} aria-label="Précédent" className="w-[42px] h-[42px] rounded-full grid place-items-center bg-surface border border-line text-ink hover:border-orange hover:text-orange transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button onClick={() => scroll(1)} aria-label="Suivant" className="w-[42px] h-[42px] rounded-full grid place-items-center bg-surface border border-line text-ink hover:border-orange hover:text-orange transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {/* Le défilement s'étend jusqu'aux bords de l'écran sur mobile : la carte
          suivante reste visible en amorce, ce qui signale qu'on peut glisser.
          Cartes de 300px → 220px, sinon une seule tient sur un téléphone. */}
      <div ref={track} className="flex gap-3 sm:gap-5 overflow-x-auto pb-1.5 px-5 sm:px-7 mx-auto max-w-[1400px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory]">
        {produits.map((p) => (
          <div key={p.id} className="shrink-0 w-[220px] sm:w-[300px] [scroll-snap-align:start]">
            <ProductCard
              href={p.href}
              codeRacine={p.estNouveau ? undefined : p.codeRacine}
              vitrineId={p.estNouveau ? p.codeRacine : undefined}
              favori={p.estNouveau ? favSetVitrines.has(p.codeRacine) : favSetCodes.has(p.codeRacine)}
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