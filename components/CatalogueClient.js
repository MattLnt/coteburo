"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import CatalogueFilters from "@/components/CatalogueFilters";
import FavoriButton from "@/components/FavoriButton";
import { urlProduit } from "@/lib/catalogue";

const fmt = (n) => (n == null ? null : `${Math.round(n).toLocaleString("fr-FR")} €`);
const num = (v) => (v === "" || v == null ? null : Number(v));

// Un produit [cMin..cMax] correspond à une recherche [selMin..selMax] s'il y a chevauchement.
// Si aucune borne n'est demandée sur cette dimension → toujours vrai.
// Si le produit n'a AUCUNE dimension renseignée alors qu'un filtre est actif → exclu.
function dansPlage(cMin, cMax, selMin, selMax) {
  if (selMin == null && selMax == null) return true;
  const lo = cMin != null ? cMin : cMax;
  const hi = cMax != null ? cMax : cMin;
  if (lo == null && hi == null) return false;
  if (selMin != null && (hi == null || hi < selMin)) return false;
  if (selMax != null && (lo == null || lo > selMax)) return false;
  return true;
}

export default function CatalogueClient({ cartes, filtres, favorisVitrines, connecte, valeursInitiales, basePath = "/catalogue" }) {
  const [categorieSlug, setCategorieSlug] = useState(valeursInitiales.categorieSlug || null);
  const [sousCategorieSlug, setSousCategorieSlug] = useState(valeursInitiales.sousCategorieSlug || null);
  const [marqueSlug, setMarqueSlug] = useState(valeursInitiales.marqueSlug || null);
  const [prixMin, setPrixMin] = useState(valeursInitiales.prixMin || null);
  const [prixMax, setPrixMax] = useState(valeursInitiales.prixMax || null);

  // Filtres dimensions (bornes demandées par l'utilisateur)
  const [largeurMin, setLargeurMin] = useState(valeursInitiales.largeurMin || null);
  const [largeurMax, setLargeurMax] = useState(valeursInitiales.largeurMax || null);
  const [hauteurMin, setHauteurMin] = useState(valeursInitiales.hauteurMin || null);
  const [hauteurMax, setHauteurMax] = useState(valeursInitiales.hauteurMax || null);
  const [profondeurMin, setProfondeurMin] = useState(valeursInitiales.profondeurMin || null);
  const [profondeurMax, setProfondeurMax] = useState(valeursInitiales.profondeurMax || null);

  const [tri, setTri] = useState(valeursInitiales.tri || "nom");

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
    if (largeurMin) params.set("largeurMin", largeurMin);
    if (largeurMax) params.set("largeurMax", largeurMax);
    if (hauteurMin) params.set("hauteurMin", hauteurMin);
    if (hauteurMax) params.set("hauteurMax", hauteurMax);
    if (profondeurMin) params.set("profondeurMin", profondeurMin);
    if (profondeurMax) params.set("profondeurMax", profondeurMax);
    if (tri && tri !== "nom") params.set("tri", tri);
    const qs = params.toString();
    window.history.replaceState(null, "", `${basePath}${qs ? `?${qs}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorieSlug, sousCategorieSlug, marqueSlug, prixMin, prixMax, largeurMin, largeurMax, hauteurMin, hauteurMax, profondeurMin, profondeurMax, tri]);

  const handleFiltresChange = (updates) => {
    if ("categorieSlug" in updates) setCategorieSlug(updates.categorieSlug);
    if ("sousCategorieSlug" in updates) setSousCategorieSlug(updates.sousCategorieSlug);
    if ("marqueSlug" in updates) setMarqueSlug(updates.marqueSlug);
    if ("prixMin" in updates) setPrixMin(updates.prixMin);
    if ("prixMax" in updates) setPrixMax(updates.prixMax);
    if ("largeurMin" in updates) setLargeurMin(updates.largeurMin);
    if ("largeurMax" in updates) setLargeurMax(updates.largeurMax);
    if ("hauteurMin" in updates) setHauteurMin(updates.hauteurMin);
    if ("hauteurMax" in updates) setHauteurMax(updates.hauteurMax);
    if ("profondeurMin" in updates) setProfondeurMin(updates.profondeurMin);
    if ("profondeurMax" in updates) setProfondeurMax(updates.profondeurMax);
  };

  const filtered = useMemo(() => {
    let list = cartes;
    if (categorieSlug) list = list.filter((c) => c.categorieSlug === categorieSlug);
    if (sousCategorieSlug) list = list.filter((c) => c.sousCategorieSlug === sousCategorieSlug);
    if (marqueSlug) list = list.filter((c) => c.marqueSlug === marqueSlug);

    const min = num(prixMin);
    const max = num(prixMax);
    if (min != null) list = list.filter((c) => c.prixMini == null || c.prixMini >= min);
    if (max != null) list = list.filter((c) => c.prixMini == null || c.prixMini <= max);

    // Filtres dimensions
    const lMin = num(largeurMin), lMax = num(largeurMax);
    const hMin = num(hauteurMin), hMax = num(hauteurMax);
    const pMin = num(profondeurMin), pMax = num(profondeurMax);
    if (lMin != null || lMax != null) list = list.filter((c) => dansPlage(c.largeurMin, c.largeurMax, lMin, lMax));
    if (hMin != null || hMax != null) list = list.filter((c) => dansPlage(c.hauteurMin, c.hauteurMax, hMin, hMax));
    if (pMin != null || pMax != null) list = list.filter((c) => dansPlage(c.profondeurMin, c.profondeurMax, pMin, pMax));

    // Tri (prix nuls / sur devis toujours en fin sur les tris par prix)
    const parNom = (a, b) => a.nom.localeCompare(b.nom, "fr");
    const arr = [...list];
    if (tri === "prix-asc") {
      arr.sort((a, b) => {
        if (a.prixMini == null && b.prixMini == null) return parNom(a, b);
        if (a.prixMini == null) return 1;
        if (b.prixMini == null) return -1;
        return a.prixMini - b.prixMini;
      });
    } else if (tri === "prix-desc") {
      arr.sort((a, b) => {
        if (a.prixMini == null && b.prixMini == null) return parNom(a, b);
        if (a.prixMini == null) return 1;
        if (b.prixMini == null) return -1;
        return b.prixMini - a.prixMini;
      });
    } else {
      arr.sort(parNom);
    }
    return arr;
  }, [cartes, categorieSlug, sousCategorieSlug, marqueSlug, prixMin, prixMax, largeurMin, largeurMax, hauteurMin, hauteurMax, profondeurMin, profondeurMax, tri]);

  const categorieActive = filtres.categories.find((c) => c.slug === categorieSlug);
  const sousCategorieActive = categorieActive?.sousCategories.find((s) => s.slug === sousCategorieSlug);
  const titre = sousCategorieActive?.nom || categorieActive?.nom || "Tout le catalogue";
  const aDesFiltres = !!(categorieSlug || sousCategorieSlug || marqueSlug || prixMin || prixMax || largeurMin || largeurMax || hauteurMin || hauteurMax || profondeurMin || profondeurMax);

  const reinitialiserTout = () => handleFiltresChange({
    categorieSlug: null, sousCategorieSlug: null, marqueSlug: null, prixMin: null, prixMax: null,
    largeurMin: null, largeurMax: null, hauteurMin: null, hauteurMax: null, profondeurMin: null, profondeurMax: null,
  });

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-2 pb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Catalogue</p>
            <h1 className="font-display font-bold text-4xl sm:text-5xl mt-3">{titre}</h1>
            <p className="text-ink-soft mt-3">{filtered.length} produit{filtered.length > 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 text-sm text-ink-soft">
              Trier&nbsp;:
              <select
                value={tri}
                onChange={(e) => setTri(e.target.value)}
                className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-orange focus:border-orange outline-none cursor-pointer"
              >
                <option value="nom">Nom (A–Z)</option>
                <option value="prix-asc">Prix croissant</option>
                <option value="prix-desc">Prix décroissant</option>
              </select>
            </label>
            {aDesFiltres && (
              <button onClick={reinitialiserTout}
                className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-orange hover:text-orange transition whitespace-nowrap">
                Voir tout le catalogue →
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-20 grid lg:grid-cols-[280px_1fr] gap-8 items-start">
        <CatalogueFilters
          filtres={filtres}
          valeurs={{ categorieSlug, sousCategorieSlug, marqueSlug, prixMin, prixMax, largeurMin, largeurMax, hauteurMin, hauteurMax, profondeurMin, profondeurMax }}
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