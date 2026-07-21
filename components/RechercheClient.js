"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import CatalogueFilters from "@/components/CatalogueFilters";

export default function RechercheClient({ resultats, filtres, query, valeursInitiales }) {
  const [categorieSlug, setCategorieSlug] = useState(valeursInitiales.categorieSlug || null);
  const [sousCategorieSlug, setSousCategorieSlug] = useState(valeursInitiales.sousCategorieSlug || null);
  const [marqueSlug, setMarqueSlug] = useState(valeursInitiales.marqueSlug || null);
  const [prixMin, setPrixMin] = useState(valeursInitiales.prixMin || null);
  const [prixMax, setPrixMax] = useState(valeursInitiales.prixMax || null);

  // Met à jour l'adresse dans le navigateur SANS passer par le routeur Next.js —
  // ça garde l'URL partageable, sans jamais redemander la page au serveur.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (categorieSlug) params.set("categorie", categorieSlug);
    if (sousCategorieSlug) params.set("sousCategorie", sousCategorieSlug);
    if (marqueSlug) params.set("marque", marqueSlug);
    if (prixMin) params.set("prixMin", prixMin);
    if (prixMax) params.set("prixMax", prixMax);
    const qs = params.toString();
    window.history.replaceState(null, "", `/recherche${qs ? `?${qs}` : ""}`);
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
    let list = resultats;
    if (categorieSlug) list = list.filter((r) => r.categorieSlug === categorieSlug);
    if (sousCategorieSlug) list = list.filter((r) => r.sousCategorieSlug === sousCategorieSlug);
    if (marqueSlug) list = list.filter((r) => r.marqueSlug === marqueSlug);
    const min = prixMin ? Number(prixMin) : null;
    const max = prixMax ? Number(prixMax) : null;
    if (min != null) list = list.filter((r) => r.prix == null || r.prix >= min);
    if (max != null) list = list.filter((r) => r.prix == null || r.prix <= max);
    return list;
  }, [resultats, categorieSlug, sousCategorieSlug, marqueSlug, prixMin, prixMax]);

  const aDesFiltres = !!(categorieSlug || sousCategorieSlug || marqueSlug || prixMin || prixMax);

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7">
        <div className="pt-6 pb-2 text-sm text-ink-soft">
          <Link href="/" className="hover:text-orange">Accueil</Link> / <span className="text-ink">Recherche</span>
        </div>
        <div className="pt-2 pb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Recherche</p>
              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mt-3">
                Résultats pour «&nbsp;{query}&nbsp;»
              </h1>
              <p className="text-ink-soft mt-3">{filtered.length} produit{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}</p>
            </div>
            <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-orange hover:text-orange transition whitespace-nowrap">
              Voir tout le catalogue →
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-20">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          <CatalogueFilters
            filtres={filtres}
            valeurs={{ categorieSlug, sousCategorieSlug, marqueSlug, prixMin, prixMax }}
            onFiltresChange={handleFiltresChange}
          />

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-12 text-center">
              <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-surface-2 text-ink-soft/40">
                <svg width="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              </div>
              <p className="text-ink">Aucun produit ne correspond à «&nbsp;{query}&nbsp;»{aDesFiltres ? " avec ces filtres" : ""}.</p>
              <p className="text-[13px] text-ink-soft mt-1">Essayez un autre mot-clé, une gamme ou une marque.</p>
              <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Parcourir le catalogue →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((r) => (
                <Link key={r.id} href={r.href}
                  className="group rounded-2xl border border-line bg-white overflow-hidden hover:border-orange/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition">
                  <div className="aspect-[4/3] bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f4f1ec)] overflow-hidden relative">
                    {r.imageUrl ? (
                      <img src={r.imageUrl} alt={r.nom} className="w-full h-full object-contain p-4 group-hover:scale-[1.03] transition" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-charcoal/15">
                        <svg width="35%" viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="3"><rect x="12" y="30" width="96" height="10" rx="2" /><path d="M22 40v34M98 40v34" /></svg>
                      </div>
                    )}
                    {r.promo && <span className="absolute top-3 left-3 rounded-full bg-orange text-white text-[11px] font-bold px-2.5 py-1">{r.promo}</span>}
                  </div>
                  <div className="p-4">
                    {r.brand && <p className="text-[11px] font-semibold uppercase tracking-wide text-orange">{r.brand}</p>}
                    <p className="font-semibold text-ink text-[15px] leading-snug mt-1 group-hover:text-orange-dark transition line-clamp-2">{r.nom}</p>
                    {r.gammeNom && <p className="text-[12px] text-ink-soft mt-0.5">{r.gammeNom}</p>}
                    <p className="text-[13px] text-ink-soft mt-1.5">
                      {r.prixAffiche === "Sur devis" ? (
                        "Sur devis"
                      ) : (
                        <>
                          <span className="font-display font-bold text-ink">{r.prixAffiche}</span> HT
                          {r.oldPrice && <span className="line-through ml-2 text-ink-soft/70">{r.oldPrice}</span>}
                        </>
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}