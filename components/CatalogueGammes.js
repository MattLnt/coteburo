"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

export default function CatalogueGammes({ gammes, categories, categorieInitiale = "" }) {
  const [categorie, setCategorie] = useState(categorieInitiale);

  const filtered = useMemo(() => {
    if (!categorie) return gammes;
    return gammes.filter((g) => g.categorieSlug === categorie);
  }, [gammes, categorie]);

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-8 items-start">
      {/* Filtres catégories */}
      <aside>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">Catégories</h2>
            {categorie && <button onClick={() => setCategorie("")} className="text-xs font-semibold text-orange-dark hover:text-orange">Tout voir</button>}
          </div>
          <div className="flex flex-col gap-1">
            <button onClick={() => setCategorie("")}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition ${!categorie ? "bg-orange-tint text-orange-dark" : "text-ink hover:bg-surface-2"}`}>
              Toutes les gammes
            </button>
            {categories.map((c) => {
              const on = categorie === c.slug;
              return (
                <button key={c.slug} onClick={() => setCategorie(on ? "" : c.slug)}
                  className={`flex items-center justify-between text-left px-3 py-2 rounded-lg text-sm font-medium transition ${on ? "bg-orange-tint text-orange-dark" : "text-ink hover:bg-surface-2"}`}>
                  {c.nom}
                  <span className={`text-[11px] ${on ? "text-orange-dark" : "text-ink-soft"}`}>{c.nbGammes}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Grille de gammes */}
      <div>
        <p className="text-sm text-ink-soft mb-6"><b className="text-ink">{filtered.length}</b> gamme{filtered.length > 1 ? "s" : ""}</p>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-12 text-center">
            <p className="text-ink-soft">Aucune gamme dans cette catégorie pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((g) => (
              <Link key={g.id} href={`/gamme/${g.slug}`} className="group h-full flex flex-col bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(33,36,40,0.05)] hover:border-transparent hover:shadow-[0_20px_50px_-30px_rgba(33,36,40,0.35)] transition">
                <div className="relative aspect-[4/3] bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f0ece4)] overflow-hidden">
                  {g.imageUrl ? (
                    <img src={g.imageUrl} alt={g.nom} className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-charcoal/20">
                      <svg width="46%" viewBox="0 0 120 140" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M38 22c0-5 4-9 9-9h26c5 0 9 4 9 9v40H38z" /><path d="M32 62h56l-4 20H36z" /><path d="M60 82v28" /><path d="M40 130l20-16 20 16" /></svg>
                    </div>
                  )}
                </div>
                <div className="p-4 pb-[18px] flex flex-col flex-1">
                  <span className="text-orange text-[11px] font-bold tracking-[0.14em] uppercase">{g.categorieNom}</span>
                  <span className="font-display font-bold text-ink text-[16.5px] leading-tight mt-1.5 mb-1">{g.nom}</span>
                  <span className="text-ink-soft text-[12.5px] mt-auto">{g.nbProduits} référence{g.nbProduits > 1 ? "s" : ""}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}