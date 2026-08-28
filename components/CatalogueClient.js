"use client";
import { useState, useMemo, useEffect, useRef } from "react";
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

const LIBELLES_TRI = { nom: "Nom (A–Z)", "prix-asc": "Prix croissant", "prix-desc": "Prix décroissant" };

export default function CatalogueClient({ cartes, filtres, favorisVitrines, connecte, valeursInitiales, basePath = "/catalogue" }) {
  const [categorieSlug, setCategorieSlug] = useState(valeursInitiales.categorieSlug || null);
  const [sousCategorieSlug, setSousCategorieSlug] = useState(valeursInitiales.sousCategorieSlug || null);
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

  // Panneaux mobile
  const [panneauFiltres, setPanneauFiltres] = useState(false);
  const [panneauTri, setPanneauTri] = useState(false);
  // Menu de tri desktop — remplace le <select> natif, impossible à styler
  const [menuTriOuvert, setMenuTriOuvert] = useState(false);
  const menuTriRef = useRef(null);

  const favSet = useMemo(() => new Set(favorisVitrines), [favorisVitrines]);

  // Ferme le menu de tri au clic extérieur
  useEffect(() => {
    if (!menuTriOuvert) return;
    const onClick = (e) => {
      if (menuTriRef.current && !menuTriRef.current.contains(e.target)) setMenuTriOuvert(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuTriOuvert]);

  // Le composant est réutilisé d'une URL à l'autre (bureaux → sièges) : les
  // useState ne sont évalués qu'au montage, donc l'état resterait figé sur la
  // catégorie d'origine. On resynchronise quand les valeurs initiales changent.
  const cleInitiale = `${valeursInitiales.categorieSlug || ""}|${valeursInitiales.sousCategorieSlug || ""}`;
  const cleAppliquee = useRef(cleInitiale);
  useEffect(() => {
    if (cleAppliquee.current === cleInitiale) return;
    cleAppliquee.current = cleInitiale;
    setCategorieSlug(valeursInitiales.categorieSlug || null);
    setSousCategorieSlug(valeursInitiales.sousCategorieSlug || null);
    setPrixMin(valeursInitiales.prixMin || null);
    setPrixMax(valeursInitiales.prixMax || null);
    setLargeurMin(valeursInitiales.largeurMin || null);
    setLargeurMax(valeursInitiales.largeurMax || null);
    setHauteurMin(valeursInitiales.hauteurMin || null);
    setHauteurMax(valeursInitiales.hauteurMax || null);
    setProfondeurMin(valeursInitiales.profondeurMin || null);
    setProfondeurMax(valeursInitiales.profondeurMax || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleInitiale]);

  // Empêche le scroll de la page derrière un panneau ouvert.
  useEffect(() => {
    const ouvert = panneauFiltres || panneauTri;
    document.body.style.overflow = ouvert ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [panneauFiltres, panneauTri]);

  // Met à jour l'adresse dans le navigateur SANS passer par le routeur Next.js —
  // ça garde l'URL partageable, sans jamais redemander la page au serveur.
  useEffect(() => {
    const params = new URLSearchParams();
    if (categorieSlug) params.set("categorie", categorieSlug);
    if (sousCategorieSlug) params.set("sousCategorie", sousCategorieSlug);
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
    // Garde la clé de synchro alignée : sans ça, revenir manuellement sur la
    // catégorie d'origine relancerait l'effet de resynchronisation.
    cleAppliquee.current = `${categorieSlug || ""}|${sousCategorieSlug || ""}`;
    window.history.replaceState(null, "", `${basePath}${qs ? `?${qs}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorieSlug, sousCategorieSlug, prixMin, prixMax, largeurMin, largeurMax, hauteurMin, hauteurMax, profondeurMin, profondeurMax, tri]);

  const handleFiltresChange = (updates) => {
    if ("categorieSlug" in updates) setCategorieSlug(updates.categorieSlug);
    if ("sousCategorieSlug" in updates) setSousCategorieSlug(updates.sousCategorieSlug);
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
  }, [cartes, categorieSlug, sousCategorieSlug, prixMin, prixMax, largeurMin, largeurMax, hauteurMin, hauteurMax, profondeurMin, profondeurMax, tri]);

  const categorieActive = filtres.categories.find((c) => c.slug === categorieSlug);
  const sousCategorieActive = categorieActive?.sousCategories.find((s) => s.slug === sousCategorieSlug);
  const titre = sousCategorieActive?.nom || categorieActive?.nom || "Tout le catalogue";
  const aDesFiltres = !!(categorieSlug || sousCategorieSlug || prixMin || prixMax || largeurMin || largeurMax || hauteurMin || hauteurMax || profondeurMin || profondeurMax);

  const reinitialiserTout = () => handleFiltresChange({
    categorieSlug: null, sousCategorieSlug: null, prixMin: null, prixMax: null,
    largeurMin: null, largeurMax: null, hauteurMin: null, hauteurMax: null, profondeurMin: null, profondeurMax: null,
  });

  const valeursFiltres = { categorieSlug, sousCategorieSlug, prixMin, prixMax, largeurMin, largeurMax, hauteurMin, hauteurMax, profondeurMin, profondeurMax };

  // Pastilles des filtres actifs, retirables d'un tap.
  const pastillesActives = [];
  if (categorieActive) pastillesActives.push({ cle: "cat", label: categorieActive.nom, retirer: () => handleFiltresChange({ categorieSlug: null, sousCategorieSlug: null }) });
  if (sousCategorieActive) pastillesActives.push({ cle: "sscat", label: sousCategorieActive.nom, retirer: () => handleFiltresChange({ sousCategorieSlug: null }) });
  if (prixMin || prixMax) pastillesActives.push({ cle: "prix", label: `${prixMin || "…"} – ${prixMax || "…"} €`, retirer: () => handleFiltresChange({ prixMin: null, prixMax: null }) });
  if (largeurMin || largeurMax) pastillesActives.push({ cle: "larg", label: `Larg. ${largeurMin || "…"}–${largeurMax || "…"}`, retirer: () => handleFiltresChange({ largeurMin: null, largeurMax: null }) });
  if (hauteurMin || hauteurMax) pastillesActives.push({ cle: "haut", label: `Haut. ${hauteurMin || "…"}–${hauteurMax || "…"}`, retirer: () => handleFiltresChange({ hauteurMin: null, hauteurMax: null }) });
  if (profondeurMin || profondeurMax) pastillesActives.push({ cle: "prof", label: `Prof. ${profondeurMin || "…"}–${profondeurMax || "…"}`, retirer: () => handleFiltresChange({ profondeurMin: null, profondeurMax: null }) });

  const carteProduit = (c) => (
    <div key={c.id} className="group relative rounded-2xl border border-line bg-white overflow-hidden hover:border-orange/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition">
      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20">
        <FavoriButton vitrineId={c.id} initial={favSet.has(c.id)} connecte={connecte} variant="float" />
      </div>
      <Link href={urlProduit({ categorieSlug: c.categorieSlug, sousCategorieSlug: c.sousCategorieSlug, slug: c.slug })}>
        <div className="aspect-[4/3] bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f4f1ec)] overflow-hidden">
          {c.imageUrl ? (
            <img src={c.imageUrl} alt={c.nom} className="w-full h-full object-contain p-3 sm:p-4 group-hover:scale-[1.03] transition" />
          ) : (
            <div className="w-full h-full grid place-items-center text-charcoal/15">
              <svg width="35%" viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="3"><rect x="12" y="30" width="96" height="10" rx="2" /><path d="M22 40v34M98 40v34" /></svg>
            </div>
          )}
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-[9.5px] sm:text-[11px] font-semibold uppercase tracking-wide text-orange truncate">{c.gammeNom}</p>
          <p className="font-semibold text-ink text-[12.5px] sm:text-[15px] leading-snug mt-1 group-hover:text-orange-dark transition line-clamp-2">{c.nom}</p>
          {c.prixMini != null ? (
            <p className="text-[11.5px] sm:text-[13px] text-ink-soft mt-1.5">dès <span className="font-display font-bold text-ink text-[13px] sm:text-[15px]">{fmt(c.prixMini)}</span> HT</p>
          ) : (
            <p className="text-[11.5px] sm:text-[13px] text-ink-soft mt-1.5">Sur devis</p>
          )}
        </div>
      </Link>
    </div>
  );

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-2 pb-5 sm:pb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Catalogue</p>
            <h1 className="font-display font-bold text-[27px] sm:text-5xl mt-1.5 sm:mt-3">{titre}</h1>
            <p className="text-ink-soft mt-1.5 sm:mt-3 text-[13px] sm:text-base">{filtered.length} produit{filtered.length > 1 ? "s" : ""}</p>
          </div>

          <div className="hidden lg:flex items-center gap-3 flex-wrap">
            {/* Menu de tri sur mesure : le <select> natif impose l'apparence de
                sa liste déroulante et ne s'accorde pas au reste du site. */}
            <div ref={menuTriRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuTriOuvert((v) => !v)}
                className={`inline-flex items-center gap-2.5 rounded-full border bg-white px-5 py-2.5 text-sm transition ${menuTriOuvert ? "border-ink/25" : "border-line hover:border-ink/25"}`}
              >
                <span className="text-ink-soft">Trier :</span>
                <span className="font-semibold text-ink">{LIBELLES_TRI[tri]}</span>
                <span className={`text-ink-soft/60 transition-transform ${menuTriOuvert ? "rotate-180" : ""}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m6 9 6 6 6-6" /></svg>
                </span>
              </button>

              {menuTriOuvert && (
                <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-[210px] rounded-2xl bg-white border border-line p-1.5"
                  style={{ boxShadow: "0 16px 40px -12px rgba(33,36,40,0.22)" }}>
                  {Object.entries(LIBELLES_TRI).map(([val, label]) => {
                    const actif = tri === val;
                    return (
                      <button key={val} type="button" onClick={() => { setTri(val); setMenuTriOuvert(false); }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition ${actif ? "bg-orange-tint text-orange-dark font-semibold" : "text-ink hover:bg-surface-2"}`}>
                        {label}
                        {actif && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" className="shrink-0"><path d="M20 6 9 17l-5-5" /></svg>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {aDesFiltres && (
              <button onClick={reinitialiserTout}
                className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-orange hover:text-orange transition whitespace-nowrap">
                Voir tout le catalogue →
              </button>
            )}
          </div>
        </div>

        {/* ── Barre Filtrer / Trier (mobile) ── */}
        <div className="lg:hidden mt-4">
          <div className="flex gap-2">
            <button onClick={() => setPanneauFiltres(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-charcoal text-white py-2.5 text-[12.5px] font-semibold">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
              Filtrer
              {pastillesActives.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange">{pastillesActives.length}</span>
              )}
            </button>
            <button onClick={() => setPanneauTri(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white py-2.5 text-[12.5px] font-semibold text-ink">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M3 8h13M3 16h9" /><path d="m17 12 4 4 4-4" transform="translate(-4,0)" /></svg>
              Trier
            </button>
          </div>

          {pastillesActives.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {pastillesActives.map((p) => (
                <button key={p.cle} onClick={p.retirer}
                  className="inline-flex items-center gap-1.5 rounded-full bg-orange-tint text-orange-dark text-[11.5px] font-semibold px-3 py-1.5">
                  {p.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              ))}
              <button onClick={reinitialiserTout} className="text-[11.5px] font-semibold text-ink-soft px-2 py-1.5">Tout effacer</button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-20 grid lg:grid-cols-[280px_1fr] gap-8 items-start">
        <CatalogueFilters
          filtres={filtres}
          valeurs={valeursFiltres}
          onFiltresChange={handleFiltresChange}
        />

        <div>
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-line bg-surface p-10 sm:p-16 text-center text-ink-soft text-[13.5px] sm:text-base">
              Aucun produit ne correspond à ces filtres.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {filtered.map(carteProduit)}
            </div>
          )}
        </div>
      </div>

      {/* ══ Panneau Filtres (mobile) ══ */}
      {panneauFiltres && (
        <div className="lg:hidden fixed inset-0 z-[90] flex flex-col">
          <div onClick={() => setPanneauFiltres(false)} className="absolute inset-0 bg-charcoal/50" />
          <div className="relative mt-auto flex flex-col bg-white rounded-t-[22px] max-h-[88dvh]">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-line shrink-0">
              <p className="font-display font-bold text-[16px]">Filtrer</p>
              <button onClick={() => setPanneauFiltres(false)} className="grid place-items-center w-8 h-8 text-ink-soft">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <CatalogueFilters
                filtres={filtres}
                valeurs={valeursFiltres}
                onFiltresChange={handleFiltresChange}
                variante="panneau"
              />
            </div>

            <div className="flex gap-2 px-4 py-3 border-t border-line shrink-0" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
              {aDesFiltres && (
                <button onClick={reinitialiserTout} className="rounded-full border border-line px-5 py-3 text-[13px] font-semibold text-ink-soft shrink-0">
                  Effacer
                </button>
              )}
              <button onClick={() => setPanneauFiltres(false)} className="flex-1 rounded-full bg-orange text-white py-3 text-[13px] font-semibold">
                Voir {filtered.length} produit{filtered.length > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Panneau Tri (mobile) ══ */}
      {panneauTri && (
        <div className="lg:hidden fixed inset-0 z-[90] flex flex-col">
          <div onClick={() => setPanneauTri(false)} className="absolute inset-0 bg-charcoal/50" />
          <div className="relative mt-auto bg-white rounded-t-[22px]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-line">
              <p className="font-display font-bold text-[16px]">Trier par</p>
              <button onClick={() => setPanneauTri(false)} className="grid place-items-center w-8 h-8 text-ink-soft">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-2">
              {Object.entries(LIBELLES_TRI).map(([val, label]) => {
                const actif = tri === val;
                return (
                  <button key={val} onClick={() => { setTri(val); setPanneauTri(false); }}
                    className={`w-full flex items-center justify-between px-3.5 py-3.5 rounded-xl text-[14px] ${actif ? "bg-orange-tint text-orange-dark font-semibold" : "text-ink"}`}>
                    {label}
                    {actif && <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><path d="M20 6 9 17l-5-5" /></svg>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}