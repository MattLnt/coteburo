"use client";
import { useState, useEffect, useRef } from "react";

export default function CatalogueFilters({ filtres, valeurs, onFiltresChange }) {
  const [prixMin, setPrixMin] = useState(valeurs.prixMin ?? "");
  const [prixMax, setPrixMax] = useState(valeurs.prixMax ?? "");

  // Dimensions
  const [largeurMin, setLargeurMin] = useState(valeurs.largeurMin ?? "");
  const [largeurMax, setLargeurMax] = useState(valeurs.largeurMax ?? "");
  const [hauteurMin, setHauteurMin] = useState(valeurs.hauteurMin ?? "");
  const [hauteurMax, setHauteurMax] = useState(valeurs.hauteurMax ?? "");
  const [profondeurMin, setProfondeurMin] = useState(valeurs.profondeurMin ?? "");
  const [profondeurMax, setProfondeurMax] = useState(valeurs.profondeurMax ?? "");

  const debounce = useRef(null);
  const premierRendu = useRef(true);
  const debounceDim = useRef(null);
  const premierRenduDim = useRef(true);

  const toggleCategorie = (slug) => {
    if (valeurs.categorieSlug === slug) onFiltresChange({ categorieSlug: null, sousCategorieSlug: null });
    else onFiltresChange({ categorieSlug: slug, sousCategorieSlug: null });
  };
  const toggleSousCategorie = (catSlug, sousSlug) => {
    if (valeurs.sousCategorieSlug === sousSlug) onFiltresChange({ categorieSlug: catSlug, sousCategorieSlug: null });
    else onFiltresChange({ categorieSlug: catSlug, sousCategorieSlug: sousSlug });
  };
  const toggleMarque = (slug) => {
    if (valeurs.marqueSlug === slug) onFiltresChange({ marqueSlug: null });
    else onFiltresChange({ marqueSlug: slug });
  };

  // Applique le prix automatiquement, avec un léger délai après la dernière frappe
  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      onFiltresChange({ prixMin: prixMin || null, prixMax: prixMax || null });
    }, 400);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prixMin, prixMax]);

  // Applique les dimensions automatiquement, même logique
  useEffect(() => {
    if (premierRenduDim.current) { premierRenduDim.current = false; return; }
    clearTimeout(debounceDim.current);
    debounceDim.current = setTimeout(() => {
      onFiltresChange({
        largeurMin: largeurMin || null, largeurMax: largeurMax || null,
        hauteurMin: hauteurMin || null, hauteurMax: hauteurMax || null,
        profondeurMin: profondeurMin || null, profondeurMax: profondeurMax || null,
      });
    }, 400);
    return () => clearTimeout(debounceDim.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [largeurMin, largeurMax, hauteurMin, hauteurMax, profondeurMin, profondeurMax]);

  const reinitialiser = () => {
    setPrixMin(""); setPrixMax("");
    setLargeurMin(""); setLargeurMax("");
    setHauteurMin(""); setHauteurMax("");
    setProfondeurMin(""); setProfondeurMax("");
    onFiltresChange({
      categorieSlug: null, sousCategorieSlug: null, marqueSlug: null, prixMin: null, prixMax: null,
      largeurMin: null, largeurMax: null, hauteurMin: null, hauteurMax: null, profondeurMin: null, profondeurMax: null,
    });
  };

  const actif = valeurs.categorieSlug || valeurs.sousCategorieSlug || valeurs.marqueSlug
    || valeurs.prixMin || valeurs.prixMax
    || valeurs.largeurMin || valeurs.largeurMax || valeurs.hauteurMin || valeurs.hauteurMax || valeurs.profondeurMin || valeurs.profondeurMax;

  const dim = filtres.dimensions || {};
  const aDimensions = ["largeur", "hauteur", "profondeur"].some((k) => dim[k]?.max != null);

  const lignesDim = [
    ["Largeur", dim.largeur, largeurMin, setLargeurMin, largeurMax, setLargeurMax],
    ["Hauteur", dim.hauteur, hauteurMin, setHauteurMin, hauteurMax, setHauteurMax],
    ["Profondeur", dim.profondeur, profondeurMin, setProfondeurMin, profondeurMax, setProfondeurMax],
  ];

  return (
    <aside className="hidden lg:block rounded-[24px] border border-line bg-surface px-5 pb-4">
      {/* Catégories */}
      <Group title="Catégorie">
        {filtres.categories.map((cat) => (
          <div key={cat.id}>
            <Check
              label={cat.nom}
              checked={valeurs.categorieSlug === cat.slug}
              onChange={() => toggleCategorie(cat.slug)}
            />
            {valeurs.categorieSlug === cat.slug && cat.sousCategories.length > 0 && (
              <div className="pl-7 flex flex-col gap-2 mt-1.5 mb-1">
                {cat.sousCategories.map((s) => (
                  <Check
                    key={s.id}
                    label={s.nom}
                    small
                    checked={valeurs.sousCategorieSlug === s.slug}
                    onChange={() => toggleSousCategorie(cat.slug, s.slug)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </Group>

      {/* Marque */}
      {filtres.marques.length > 1 && (
        <Group title="Marque">
          {filtres.marques.map((m) => (
            <Check key={m.slug} label={m.nom} checked={valeurs.marqueSlug === m.slug} onChange={() => toggleMarque(m.slug)} />
          ))}
        </Group>
      )}

      {/* Prix — s'applique automatiquement, sans bouton */}
      <Group title="Prix">
        <div className="pt-1 flex items-center gap-2">
          <input type="number" value={prixMin} onChange={(e) => setPrixMin(e.target.value)} placeholder="Min"
            className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-orange" />
          <span className="text-ink-soft text-[13px]">—</span>
          <input type="number" value={prixMax} onChange={(e) => setPrixMax(e.target.value)} placeholder="Max"
            className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-orange" />
        </div>
      </Group>

      {/* Dimensions (cm) — s'appliquent automatiquement */}
      {aDimensions && (
        <Group title="Dimensions (cm)">
          <div className="flex flex-col gap-3 pt-1">
            {lignesDim.map(([label, bornes, vMin, sMin, vMax, sMax]) => (
              (bornes?.max != null) && (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-semibold text-ink">{label}</span>
                    {bornes?.min != null && bornes?.max != null && (
                      <span className="text-[11px] text-ink-soft">{bornes.min}–{bornes.max}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={vMin} onChange={(e) => sMin(e.target.value)} placeholder="Min"
                      className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-orange" />
                    <span className="text-ink-soft text-[13px]">—</span>
                    <input type="number" value={vMax} onChange={(e) => sMax(e.target.value)} placeholder="Max"
                      className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-orange" />
                  </div>
                </div>
              )
            ))}
          </div>
        </Group>
      )}

      {/* Coloris — visuel seul, pas de donnée pour l'instant */}
      <Group title="Coloris" last disabled>
        <div className="flex flex-wrap gap-2.5 pt-1">
          {["#23262A", "#F0661B", "#3C6E8F", "#7E8B6A", "#B8B2A6", "#9C3B36"].map((c) => (
            <span key={c} className="h-[26px] w-[26px] rounded-full ring-1 ring-line opacity-35 cursor-not-allowed" style={{ background: c }} title="Bientôt disponible" />
          ))}
        </div>
      </Group>

      {actif && (
        <button onClick={reinitialiser} className="w-full text-center text-[13px] font-semibold text-orange py-2">
          Réinitialiser les filtres
        </button>
      )}
    </aside>
  );
}

function Group({ title, children, last, disabled }) {
  return (
    <div className={`py-5 ${last ? "" : "border-b border-line/70"} ${disabled ? "opacity-45" : ""}`}>
      <h4 className="font-display font-bold text-[15px] flex items-center gap-2">
        {title}
        {disabled && <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft bg-surface-2 rounded-full px-2 py-0.5">Bientôt</span>}
      </h4>
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Check({ label, count, checked, onChange, small, disabled }) {
  return (
    <label className={`flex items-center gap-2.5 text-sm text-ink-soft hover:text-ink ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"} ${small ? "text-[13px]" : ""}`}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={onChange} className="peer sr-only" />
      <span className={`grid place-items-center rounded-[5px] border border-line peer-checked:bg-orange peer-checked:border-orange transition ${small ? "h-[16px] w-[16px]" : "h-[18px] w-[18px]"}`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="m20 6-11 11-5-5" /></svg>
      </span>
      <span>{label}</span>
      {count && <span className="ml-auto text-xs text-ink-soft bg-surface-2 rounded-full px-2 py-0.5">{count}</span>}
    </label>
  );
}