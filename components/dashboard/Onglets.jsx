"use client";

// Le sélecteur d'onglets de l'administration.
//
// Il remplace le trait sous le mot actif : les onglets se voient comme un
// ensemble, l'actif se détache par son fond, chacun porte son compte dans une
// pastille et un point orange quand quelque chose y manque.
//
// POURQUOI PARTAGÉ
//   La fiche produit et l'architecture avaient chacune leur barre, dessinées
//   à quelques pixels près différemment. Deux barres qui font la même chose
//   finissent toujours par ne plus se ressembler.

import { Icon } from "./Icon";

/**
 * @param onglets  [{ cle, nom, icone?, compte?, alerte? }]
 *                 `alerte` est une chaîne — le motif — ou null. Jamais 0 :
 *                 « 0 && "…" » vaut 0, que JSX affiche tel quel.
 * @param actif    la clé retenue
 * @param onChange (cle) => void
 */
export default function Onglets({ onglets = [], actif, onChange, className = "" }) {
  return (
    <div className={`flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface-2/60 p-1 ${className}`}>
      {onglets.map((o) => {
        const ici = actif === o.cle;
        return (
          <button
            key={o.cle}
            type="button"
            onClick={() => onChange(o.cle)}
            title={o.alerte || undefined}
            aria-current={ici ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
              ici
                ? "bg-surface font-semibold text-ink shadow-sm ring-1 ring-line"
                : "text-ink-soft hover:bg-surface/70 hover:text-ink"
            }`}
          >
            {o.icone && <Icon name={o.icone} size={15} strokeWidth={ici ? 2.2 : 1.8} />}
            {o.nom}
            {o.compte != null && (
              <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                ici ? "bg-surface-2 text-ink-soft" : "bg-surface/70 text-ink-soft/80"
              }`}>
                {o.compte}
              </span>
            )}
            {o.alerte && (
              <span
                aria-label={o.alerte}
                className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-orange"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
