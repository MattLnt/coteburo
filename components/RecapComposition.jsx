"use client";

// components/RecapComposition.jsx — ce qu'une fiche composée commande vraiment.
//
// Une fiche ordinaire se résume à une référence et un prix ; la ligne du
// récapitulatif suffit. Une fiche composée en a quatre, et les taire
// donnerait au client un prix sans lui dire ce qu'il achète : page 241 du
// tarif Buronomic, « rangements avec alcôve » veut dire un rangement, une
// alcôve, deux portes et deux poignées, commandés ensemble et livrés
// ensemble.
//
// Le composant est partagé parce que trois pages du tarif se vendent ainsi —
// Quiétude rangements (238-239), Quiétude alcôve (240-241), Eko casiers
// (262-263) — et qu'elles doivent se ressembler à l'écran.
//
// Il ne calcule rien : lib/modeleProduit.js lui donne déjà les éléments
// assemblés, chacun avec sa référence et son prix. C'est la même règle que
// pour FicheProduitModele — le raisonnement est pur et vit ailleurs, pour que
// le serveur le refasse à l'identique au moment de la commande.

const euros = (n) =>
  n == null ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/**
 * @param elements  ce que `elementsDe(produit, reponses)` rend
 * @param marge     la marge du catalogue, pour afficher le prix de vente
 * @param titre     l'intitulé du bloc
 */
export default function RecapComposition({ elements = [], marge = 0, titre = "Ce qui sera commandé" }) {
  if (!elements.length) return null;

  const prixVente = (ht) => (ht == null ? null : ht * (1 + marge));
  // Un élément peut compter plusieurs exemplaires : chez Eko il faut trois
  // kits de portes pour un casier neuf cases. Le total les compte tous.
  const totalDe = (e) => prixVente(e.prixTotalHT ?? e.prixTarifHT) ?? 0;
  const total = elements.reduce((a, e) => a + totalDe(e), 0);
  const complet = elements.every((e) => e.reference);

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
        <h3 className="font-display text-base font-semibold text-ink">{titre}</h3>
        <span className="text-xs text-ink-soft">
          {elements.length} référence{elements.length > 1 ? "s" : ""}
        </span>
      </div>

      <ul className="mt-4 flex flex-col">
        {elements.map((e, i) => (
          <li
            key={`${e.cle}-${i}`}
            className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 ${i ? "border-t border-line" : ""}`}
          >
            <span className="min-w-0 flex-1 text-sm text-ink">
              {e.designation}
              {e.quantite > 1 && (
                <span className="ml-1.5 text-xs font-semibold text-ink-soft">
                  × {e.quantite}
                </span>
              )}
            </span>

            {/* La référence, décomposée : la base en sombre, ce que les
                finitions y ajoutent en orange. Le client voit d'où vient
                chaque lettre. */}
            <span className="font-display text-sm font-bold tracking-wide tabular-nums">
              {e.reference ? (
                <>
                  {e.referenceBase}
                  <span className="text-orange">{e.reference.slice(e.referenceBase.length)}</span>
                </>
              ) : (
                <span className="font-sans text-xs font-medium text-ink-soft">à préciser</span>
              )}
            </span>

            <span className="w-20 shrink-0 text-right text-sm tabular-nums text-ink-soft">
              {euros(totalDe(e))}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between gap-3 border-t border-line px-5 py-3.5">
        <span className="text-sm font-semibold text-ink">Total de la composition</span>
        <span className="font-display text-base font-bold tabular-nums">{euros(total)}</span>
      </div>

      {complet && (
        <p className="px-5 pb-5 text-xs leading-relaxed text-ink-soft">
          Les {elements.length} éléments se commandent ensemble et
          n&apos;arrivent qu&apos;une fois réunis. Ils apparaîtront groupés sur
          votre devis et sur votre commande.
        </p>
      )}
    </div>
  );
}
