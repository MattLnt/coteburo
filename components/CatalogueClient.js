"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import CatalogueFilters from "@/components/CatalogueFilters";
import FavoriButton from "@/components/FavoriButton";
import { urlProduit } from "@/lib/catalogue";

const fmt = (n) => (n == null ? null : `${Math.round(n).toLocaleString("fr-FR")} €`);

export default function CatalogueClient({ cartes, filtres, favorisVitrines, connecte, valeursInitiales, basePath = "/catalogue" }) {
  const [categorieSlug, setCategorieSlug] = useState(valeursInitiales.categorieSlug || null);
  const [sousCategorieSlug, setSousCategorieSlug] = useState(valeursInitiales.sousCategorieSlug || null);
  const [marqueSlug, setMarqueSlug] = useState(valeursInitiales.marqueSlug || null);
  const [prixMin, setPrixMin] = useState(valeursInitiales.prixMin || null);
  const [prixMax, setPrixMax] = useState(valeursInitiales.prixMax || null);

  const favSet = useMemo(() => new Set(favorisVitrines), [favorisVitrines]);

  // Met à jour l'adresse dans le navigateur SANS passer par le routeur Next.js —
  // ça garde l'URL partageable, sans jamais redemander la page au serveur.
  useEffect(() => {
    const params = new URLSearchParams();
    if (categorieSlug) params.set("categorie", categorieSlug);
    if (sousCategorieSlug) params.set("sousCategorie", sousCategorieSlug);
    if (marqueSlug) params.set("marque", marqueSlug);
    if (prixMin) params.set("prixMin", prixMin);
    if (prixMax) params.set("prixMax", prixMax);
    const qs = params.toString();
    window.history.replaceState(null, "", `${basePath}${qs ? `?${qs}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorieSlug, sousCategorieSlug, marqueSlug, prixMin, prixMax]);

  const handleFiltresChange = (updates) => {
    if ("categorieSlug" in updates) setCategorieSlug(updates.categorieSlug);
    if ("sousCategorieSlug" in updates) setSousCategorieSlug(updates.sousCategorieSlug);
    if ("marqueSlug" in updates) setMarqueSlug(updates.marqueSlug);
    if ("prixMin" in updates) setPrixMin(updates.prixMin);
    if ("prixMax" in updates) setPrixMax(updates.prixMax);
  };

  const filtered = useMemo(() => {
    let list = cartes;
    if (categorieSlug) list = list.filter((c) => c.categorieSlug === categorieSlug);
    if (sousCategorieSlug) list = list.filter((c) => c.sousCategorieSlug === sousCategorieSlug);
    if (marqueSlug) list = list.filter((c) => c.marqueSlug === marqueSlug);
    const min = prixMin ? Number(prixMin) : null;
    const max = prixMax ? Number(prixMax) : null;
    if (min != null) list = list.filter((c) => c.prixMini == null || c.prixMini >= min);
    if (max != null) list = list.filter((c) => c.prixMini == null || c.prixMini <= max);
    return list;
  }, [cartes, categorieSlug, sousCategorieSlug, marqueSlug, prixMin, prixMax]);

  const categorieActive = filtres.categories.find((c) => c.slug === categorieSlug);
  const sousCategorieActive = categorieActive?.sousCategories.find((s) => s.slug === sousCategorieSlug);
  const titre = sousCategorieActive?.nom || categorieActive?.nom || "Tout le catalogue";
  const aDesFiltres = !!(categorieSlug || sousCategorieSlug || marqueSlug || prixMin || prixMax);

  const reinitialiserTout = () => handleFiltresChange({ categorieSlug: null, sousCategorieSlug: null, marqueSlug: null, prixMin: null, prixMax: null });

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-2 pb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Catalogue</p>
            <h1 className="font-display font-bold text-4xl sm:text-5xl mt-3">{titre}</h1>
            <p className="text-ink-soft mt-3">{filtered.length} produit{filtered.length > 1 ? "s" : ""}</p>
          </div>
          {aDesFiltres && (
            <button onClick={reinitialiserTout}
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-orange hover:text-orange transition whitespace-nowrap">
              Voir tout le catalogue →
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-20 grid lg:grid-cols-[280px_1fr] gap-8 items-start">
        <CatalogueFilters
          filtres={filtres}
          valeurs={{ categorieSlug, sousCategorieSlug, marqueSlug, prixMin, prixMax }}
          onFiltresChange={handleFiltresChange}
        />

        <div>
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-line bg-surface p-16 text-center text-ink-soft">
              Aucun produit ne correspond à ces filtres.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((c) => (
                <div key={c.id} className="group relative rounded-2xl border border-line bg-white overflow-hidden hover:border-orange/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition">
                  <div className="absolute top-3 right-3 z-20">
                    <FavoriButton vitrineId={c.id} initial={favSet.has(c.id)} connecte={connecte} variant="float" />
                  </div>
                  <Link href={urlProduit({ categorieSlug: c.categorieSlug, sousCategorieSlug: c.sousCategorieSlug, slug: c.slug })}>
                    <div className="aspect-[4/3] bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f4f1ec)] overflow-hidden">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.nom} className="w-full h-full object-contain p-4 group-hover:scale-[1.03] transition" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-charcoal/15">
                          <svg width="35%" viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="3"><rect x="12" y="30" width="96" height="10" rx="2" /><path d="M22 40v34M98 40v34" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-orange">{c.gammeNom}</p>
                      <p className="font-semibold text-ink text-[15px] leading-snug mt-1 group-hover:text-orange-dark transition line-clamp-2">{c.nom}</p>
                      {c.prixMini != null ? (
                        <p className="text-[13px] text-ink-soft mt-1.5">à partir de <span className="font-display font-bold text-ink">{fmt(c.prixMini)}</span> HT</p>
                      ) : (
                        <p className="text-[13px] text-ink-soft mt-1.5">Sur devis</p>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}