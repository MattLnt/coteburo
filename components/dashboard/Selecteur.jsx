"use client";

// Le menu déroulant de l'administration.
//
// POURQUOI PAS LE <select> NATIF
//   Sa liste est dessinée par le système, pas par la page : on ne peut lui
//   donner ni la police, ni les espacements, ni les pastilles de couleur, ni
//   un champ de recherche. Sur une liste de cent une gammes, il devient
//   inutilisable. Le site avait déjà tranché — DevisForm et CatalogueClient
//   ont chacun leur menu sur mesure, en thème sombre. L'administration
//   gardait treize natifs.
//
// CE QU'IL SAIT FAIRE
//   Une pastille ou une vignette devant chaque entrée, un détail en gris, un
//   champ de recherche dès que la liste s'allonge, et le clavier en entier :
//   flèches, Début, Fin, Entrée, Échap, et la frappe directe qui saute à
//   l'entrée commençant par ce qu'on tape.
//
// ACCESSIBILITÉ
//   Le bouton est un `combobox`, la liste une `listbox`, et l'entrée
//   survolée est désignée par aria-activedescendant. Un menu qu'on ne peut
//   pas traverser au clavier est un menu cassé, pas un menu joli.

import { useState, useRef, useEffect, useMemo, useId } from "react";

const nu = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** La pastille d'une entrée : sa vignette, sa couleur, ou rien. */
function Vignette({ couleur, imageUrl, taille = 16 }) {
  if (!couleur && !imageUrl) return null;
  return (
    <span
      className="shrink-0 rounded-full border border-line bg-cover bg-center"
      style={{
        width: taille, height: taille,
        ...(imageUrl ? { backgroundImage: `url(${imageUrl})` } : { background: couleur }),
      }}
    />
  );
}

const CHEVRON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/**
 * @param options  [{ valeur, libelle, detail?, couleur?, imageUrl?, groupe? }]
 *                 Une chaîne simple vaut { valeur: s, libelle: s }.
 * @param valeur   la valeur retenue
 * @param onChange (valeur) => void
 * @param recherche  true | false | "auto" (dès neuf entrées)
 */
export default function Selecteur({
  options = [],
  valeur,
  onChange,
  placeholder = "Choisir…",
  recherche = "auto",
  taille = "md",
  className = "",
  ariaLabel,
  disabled = false,
  // Un filtre en vigueur se voit de loin : c'est le seul moyen de savoir
  // pourquoi la liste ne montre que douze fiches sur cinq cent cinquante-cinq.
  actif = false,
}) {
  const liste = useMemo(
    () => options.map((o) => (typeof o === "string" ? { valeur: o, libelle: o } : o)),
    [options],
  );
  const choisie = liste.find((o) => o.valeur === valeur) || null;

  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState("");
  const [survol, setSurvol] = useState(-1);
  const [versLeHaut, setVersLeHaut] = useState(false);

  const enveloppe = useRef(null);
  const champ = useRef(null);
  const listeRef = useRef(null);
  const frappe = useRef({ texte: "", quand: 0 });
  const id = useId();

  const avecRecherche = recherche === true || (recherche === "auto" && liste.length > 8);

  const filtrees = useMemo(() => {
    if (!q.trim()) return liste;
    const k = nu(q);
    return liste.filter((o) => nu(`${o.libelle} ${o.detail || ""} ${o.groupe || ""}`).includes(k));
  }, [liste, q]);

  // Fermer au clic hors du menu.
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e) => {
      if (enveloppe.current && !enveloppe.current.contains(e.target)) setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [ouvert]);

  // À l'ouverture : se placer sur l'entrée retenue, et s'ouvrir vers le haut
  // s'il n'y a pas la place en dessous — sinon le menu sort de l'écran.
  useEffect(() => {
    if (!ouvert) { setQ(""); return; }
    setSurvol(Math.max(0, filtrees.findIndex((o) => o.valeur === valeur)));
    const r = enveloppe.current?.getBoundingClientRect();
    if (r) setVersLeHaut(window.innerHeight - r.bottom < 280 && r.top > 280);
    if (avecRecherche) champ.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);

  // Garder l'entrée survolée dans la zone visible.
  useEffect(() => {
    if (!ouvert || survol < 0) return;
    listeRef.current?.querySelector(`[data-i="${survol}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [survol, ouvert]);

  const retenir = (o) => {
    onChange?.(o.valeur);
    setOuvert(false);
  };

  const auClavier = (e) => {
    if (disabled) return;
    if (!ouvert) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); setOuvert(true); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setOuvert(false); return; }
    if (e.key === "Tab") { setOuvert(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSurvol((i) => Math.min(filtrees.length - 1, i + 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setSurvol((i) => Math.max(0, i - 1)); return; }
    if (e.key === "Home") { e.preventDefault(); setSurvol(0); return; }
    if (e.key === "End") { e.preventDefault(); setSurvol(filtrees.length - 1); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtrees[survol]) retenir(filtrees[survol]);
      return;
    }
    // La frappe directe ne vaut que sans champ de recherche : ailleurs, les
    // lettres appartiennent au champ.
    if (!avecRecherche && e.key.length === 1) {
      const maintenant = Date.now();
      const texte = (maintenant - frappe.current.quand < 900 ? frappe.current.texte : "") + e.key;
      frappe.current = { texte, quand: maintenant };
      const i = filtrees.findIndex((o) => nu(o.libelle).startsWith(nu(texte)));
      if (i >= 0) setSurvol(i);
    }
  };

  const h = taille === "sm" ? "h-8 text-[12.5px]" : "h-9 text-[13px]";

  return (
    <div ref={enveloppe} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOuvert((o) => !o)}
        onKeyDown={auClavier}
        role="combobox"
        aria-expanded={ouvert}
        aria-haspopup="listbox"
        aria-controls={`${id}-liste`}
        aria-label={ariaLabel}
        className={`flex w-full items-center gap-2 rounded-lg border px-2.5 text-left transition ${h} ${
          ouvert
            ? "border-orange bg-surface ring-1 ring-orange/30"
            : actif
              ? "border-orange bg-orange-tint font-semibold text-orange-dark"
              : "border-line bg-surface hover:border-ink-soft/40"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {choisie && <Vignette couleur={choisie.couleur} imageUrl={choisie.imageUrl} />}
        <span className={`flex-1 truncate ${choisie ? "" : "text-ink-soft/70"}`}>
          {choisie ? choisie.libelle : placeholder}
          {choisie?.detail && <span className="text-ink-soft"> · {choisie.detail}</span>}
        </span>
        <span className={`shrink-0 text-ink-soft transition-transform ${ouvert ? "rotate-180" : ""}`}>
          {CHEVRON}
        </span>
      </button>

      {ouvert && (
        <div
          className={`absolute left-0 right-0 z-50 min-w-[200px] rounded-xl border border-line bg-surface p-1 shadow-lg ${
            versLeHaut ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
          }`}
        >
          {avecRecherche && (
            <input
              ref={champ}
              value={q}
              onChange={(e) => { setQ(e.target.value); setSurvol(0); }}
              onKeyDown={auClavier}
              placeholder="Filtrer…"
              className="mb-1 h-8 w-full rounded-lg border border-line px-2.5 text-[12.5px]"
            />
          )}

          <div
            ref={listeRef}
            id={`${id}-liste`}
            role="listbox"
            aria-activedescendant={survol >= 0 ? `${id}-${survol}` : undefined}
            className="max-h-[260px] overflow-y-auto"
          >
            {filtrees.map((o, i) => {
              // Un intertitre quand le groupe change — la marque devant ses
              // gammes, la catégorie devant ses rayons.
              const entete = o.groupe && o.groupe !== filtrees[i - 1]?.groupe ? o.groupe : null;
              const actif = o.valeur === valeur;
              return (
                <div key={`${o.valeur}-${i}`}>
                  {entete && (
                    <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-ink-soft/70">
                      {entete}
                    </div>
                  )}
                  <button
                    type="button"
                    id={`${id}-${i}`}
                    data-i={i}
                    role="option"
                    aria-selected={actif}
                    onClick={() => retenir(o)}
                    onMouseEnter={() => setSurvol(i)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] ${
                      survol === i ? "bg-surface-2" : ""
                    } ${actif ? "font-semibold" : ""}`}
                  >
                    <Vignette couleur={o.couleur} imageUrl={o.imageUrl} />
                    <span className="flex-1 truncate">
                      {o.libelle}
                      {o.detail && <span className="font-normal text-ink-soft"> · {o.detail}</span>}
                    </span>
                    {actif && <span className="shrink-0 text-orange-dark">✓</span>}
                  </button>
                </div>
              );
            })}

            {!filtrees.length && (
              <div className="px-2.5 py-3 text-center text-[12.5px] text-ink-soft">
                Rien ne correspond.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
