"use client";
import { useState, useMemo } from "react";
import ProductCard from "@/components/ProductCard";

const FILTERS = [
  { key: "tous", label: "Tout" },
  { key: "sieges", label: "Sièges" },
  { key: "bureaux", label: "Bureaux" },
  { key: "tables", label: "Tables" },
  { key: "rangements", label: "Rangements" },
  { key: "acoustique", label: "Acoustique" },
  { key: "accueil", label: "Accueil" },
];

export default function ProductSelectionFilters({ produits, favorisCodes = [], connecte = false }) {
  const [active, setActive] = useState("tous");
  const favSet = useMemo(() => new Set(favorisCodes), [favorisCodes]);
  const shown = active === "tous" ? produits : produits.filter((p) => p.cat === active);

  const filtresVisibles = FILTERS.filter((f) => f.key === "tous" || produits.some((p) => p.cat === f.key));

  return (
    <section className="bg-surface-2 border-y border-line/60">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 py-20">
        <div className="text-center mb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Notre sélection</p>
          <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl mt-1.5">Le meilleur de chaque rayon</h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 mt-6 mb-8">
          {filtresVisibles.map((f) => {
            const on = active === f.key;
            return (
              <button key={f.key} onClick={() => setActive(f.key)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition ${on ? "bg-charcoal text-white" : "bg-surface text-ink border border-line hover:border-orange hover:text-orange"}`}>
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(270px,1fr))]">
          {shown.map((p) => (
            <ProductCard
              key={p.codeRacine}
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
          ))}
        </div>
      </div>
    </section>
  );
}