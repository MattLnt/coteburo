"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES, CAT_LABEL, SOUSCAT_LABEL, sousCategoriesDe } from "@/lib/categories";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default function CatalogueContent({ produits, categorieInitiale = "", sousCategorieInitiale = "", favorisCodes = [], connecte = false }) {
  const [categorie, setCategorie] = useState(categorieInitiale);
  const [sousCategorie, setSousCategorie] = useState(sousCategorieInitiale);
  const [tri, setTri] = useState("nom");
  const [prixMax, setPrixMax] = useState("");

  const favSet = useMemo(() => new Set(favorisCodes), [favorisCodes]);
  const sousCats = categorie ? sousCategoriesDe(categorie) : [];

  const choisirCategorie = (slug) => {
    setCategorie(slug === categorie ? "" : slug);
    setSousCategorie("");
  };

  const filtered = useMemo(() => {
    let list = [...produits];
    if (categorie) list = list.filter((p) => p.categorie === categorie);
    if (sousCategorie) list = list.filter((p) => p.sousCategorie === sousCategorie);
    const max = parseFloat(prixMax);
    if (!Number.isNaN(max)) list = list.filter((p) => (p._prixFinal ?? p.prixPublicHT) <= max);

    switch (tri) {
      case "nom": list.sort((a, b) => (a.designation || "").localeCompare(b.designation || "")); break;
      case "prix-asc": list.sort((a, b) => (a._prixFinal ?? a.prixPublicHT) - (b._prixFinal ?? b.prixPublicHT)); break;
      case "prix-desc": list.sort((a, b) => (b._prixFinal ?? b.prixPublicHT) - (a._prixFinal ?? a.prixPublicHT)); break;
    }
    return list;
  }, [produits, categorie, sousCategorie, prixMax, tri]);

  const resetFiltres = () => { setCategorie(""); setSousCategorie(""); setPrixMax(""); setTri("nom"); };
  const aFiltres = categorie || sousCategorie || prixMax;

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-8 items-start">
      {/* Panneau de filtres */}
      <aside>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">Filtres</h2>
            {aFiltres && <button onClick={resetFiltres} className="text-xs font-semibold text-orange-dark hover:text-orange">Réinitialiser</button>}
          </div>

          {/* Catégories */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft mb-3">Catégorie</p>
            <div className="flex flex-col gap-1">
              {CATEGORIES.map((c) => {
                const on = categorie === c.slug;
                return (
                  <button key={c.slug} onClick={() => choisirCategorie(c.slug)}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition ${on ? "bg-orange-tint text-orange-dark" : "text-ink hover:bg-surface-2"}`}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sous-catégories */}
          {sousCats.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft mb-3">Sous-catégorie</p>
              <div className="flex flex-col gap-1">
                {sousCats.map((s) => {
                  const on = sousCategorie === s.slug;
                  return (
                    <button key={s.slug} onClick={() => setSousCategorie(on ? "" : s.slug)}
                      className={`text-left px-3 py-2 rounded-lg text-sm transition ${on ? "bg-orange-tint text-orange-dark font-semibold" : "text-ink-soft hover:bg-surface-2"}`}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prix max */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft mb-3">Prix maximum</p>
            <div className="flex items-center gap-2">
              <input value={prixMax} onChange={(e) => setPrixMax(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="ex : 500"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange" />
              <span className="text-sm text-ink-soft">€</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Grille de produits */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <p className="text-sm text-ink-soft"><b className="text-ink">{filtered.length}</b> produit{filtered.length > 1 ? "s" : ""}</p>
          <select value={tri} onChange={(e) => setTri(e.target.value)}
            className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium outline-none focus:border-orange cursor-pointer">
            <option value="nom">Trier : Nom</option>
            <option value="prix-asc">Prix croissant</option>
            <option value="prix-desc">Prix décroissant</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-12 text-center">
            <p className="text-ink-soft">Aucun produit ne correspond à ces filtres.</p>
            {aFiltres && <button onClick={resetFiltres} className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Réinitialiser les filtres</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <ProductCard
                key={p.codeRacine}
                href={`/produit/${p.slug || p.codeRacine}`}
                codeRacine={p.codeRacine}
                favori={favSet.has(p.codeRacine)}
                connecte={connecte}
                brand={p.brand}
                name={p.designation}
                attr={p.gamme}
                images={p.images}
                price={fmt(p._prixFinal)}
                oldPrice={p._enPromo ? fmt(p._prixBase) : undefined}
                promo={p._enPromo ? `-${p._promoPct}%` : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}