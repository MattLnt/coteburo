"use client";
import { useRef } from "react";
import ProductCard from "@/components/ProductCard";

const PRODUCTS = [
  { href: "/catalogue/sieges", brand: "OfficePro", name: "Fauteuil ergonomique Atlas", attr: "Dossier maille · accoudoirs 4D", price: "263,20 €", oldPrice: "329,00 €", promo: "-20%" },
  { href: "/catalogue/bureaux", brand: "Buronomic", name: "Bureau assis-debout Élévation", attr: "Plateau chêne · L120 × P80", price: "498,00 €" },
  { href: "/catalogue/rangements", brand: "OfficePro", name: "Caisson mobile Trio", attr: "3 tiroirs · fermeture à clé", price: "189,00 €" },
  { href: "/catalogue/sieges", brand: "Buronomic", name: "Fauteuil direction Lisbonne", attr: "Cuir pleine fleur · têtière", price: "612,00 €" },
  { href: "/catalogue/tables", brand: "Sokoa", name: "Table de réunion Ovale", attr: "10 personnes · piètement chromé", price: "690,00 €" },
  { href: "/catalogue/sieges", brand: "Buronomic", name: "Chaise réunion Taurus", attr: "Empilable · 4 pieds chromés", price: "52,70 €", oldPrice: "62,00 €", promo: "-15%" },
];

export default function BestSellers() {
  const track = useRef(null);
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
        {PRODUCTS.map((p, i) => (
          <div key={i} className="shrink-0 w-[270px] [scroll-snap-align:start]">
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
