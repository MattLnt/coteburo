"use client";
import { useState } from "react";
import ProductCard from "@/components/ProductCard";

const FILTERS = [
  { key: "tous", label: "Tout" },
  { key: "sieges", label: "Sièges" },
  { key: "bureaux", label: "Bureaux" },
  { key: "tables", label: "Tables" },
  { key: "rangements", label: "Rangements" },
];

const PRODUCTS = [
  { cat: "sieges", href: "/catalogue/sieges", brand: "OfficePro", name: "Fauteuil ergonomique Atlas", attr: "Dossier maille · accoudoirs 4D", price: "263,20 €", oldPrice: "329,00 €", promo: "-20%" },
  { cat: "sieges", href: "/catalogue/sieges", brand: "Buronomic", name: "Fauteuil direction Lisbonne", attr: "Cuir pleine fleur · têtière", price: "612,00 €" },
  { cat: "sieges", href: "/catalogue/sieges", brand: "Sokoa", name: "Chaise visiteur Nido", attr: "Piètement luge · tissu recyclé", price: "148,00 €" },
  { cat: "bureaux", href: "/catalogue/bureaux", brand: "Buronomic", name: "Bureau assis-debout Élévation", attr: "Plateau chêne · L120 × P80", price: "498,00 €" },
  { cat: "bureaux", href: "/catalogue/bureaux", brand: "OfficePro", name: "Bureau bench Duo", attr: "2 postes · voile de fond", price: "734,00 €" },
  { cat: "bureaux", href: "/catalogue/bureaux", brand: "Buronomic", name: "Bureau d'angle Atria", attr: "Retour à gauche · chêne nebraska", price: "461,00 €" },
  { cat: "tables", href: "/catalogue/tables", brand: "Sokoa", name: "Table de réunion Ovale", attr: "10 personnes · piètement chromé", price: "690,00 €" },
  { cat: "tables", href: "/catalogue/tables", brand: "OfficePro", name: "Table haute Mange-debout", attr: "Ø80 · plateau compact", price: "245,00 €" },
  { cat: "rangements", href: "/catalogue/rangements", brand: "OfficePro", name: "Caisson mobile Trio", attr: "3 tiroirs · fermeture à clé", price: "189,00 €" },
  { cat: "rangements", href: "/catalogue/rangements", brand: "Buronomic", name: "Armoire haute Confidence", attr: "Portes battantes · serrure", price: "419,00 €", oldPrice: "490,00 €", promo: "-14%" },
  { cat: "tables", href: "/catalogue/tables", brand: "Buronomic", name: "Table basse Lounge", attr: "Plateau verre · piètement noir", price: "178,00 €" },
  { cat: "rangements", href: "/catalogue/rangements", brand: "Sokoa", name: "Casier vestiaire 4 cases", attr: "Acier · serrure individuelle", price: "312,00 €" },
];

export default function ProductSelection() {
  const [active, setActive] = useState("tous");
  const shown = active === "tous" ? PRODUCTS : PRODUCTS.filter((p) => p.cat === active);

  return (
    <section className="bg-surface-2 border-y border-line/60">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-7 py-20">
        <div className="text-center mb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Notre sélection</p>
          <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl mt-1.5">Le meilleur de chaque rayon</h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 mt-6 mb-8">
          {FILTERS.map((f) => {
            const on = active === f.key;
            return (
              <button key={f.key} onClick={() => setActive(f.key)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition ${on ? "bg-charcoal text-white" : "bg-surface text-ink border border-line hover:border-orange hover:text-orange"}`}>
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {shown.map((p, i) => (
            <ProductCard key={`${active}-${i}`} {...p} />
          ))}
        </div>
      </div>
    </section>
  );
}