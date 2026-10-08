"use client";
import { useEffect, useMemo, useRef, useState } from "react";

// Afficher une longue liste par tranches.
//
// Le catalogue posait une carte par produit publié — plus de quatre cents
// nœuds et autant d'images à télécharger — et la recherche faisait de même
// avec tous ses résultats. Le navigateur mettait plusieurs secondes à peindre la page et
// bloquait sur le défilement.
//
// On en rend une tranche, puis les suivantes à mesure que le bas de la liste
// approche. Le filtrage continue de porter sur la totalité : c'est l'affichage
// qui est progressif, pas la recherche.
//
// `cleCriteres` est une empreinte des filtres choisis, pas la liste elle-même.
// Les listes filtrées sont souvent recalculées pour des raisons qui ne changent
// rien à leur contenu — dans le catalogue, chaque bascule de favori en produit
// une nouvelle — et se fier à leur identité replierait la grille sous les pieds
// de quelqu'un qui vient de cliquer au bout de deux cents cartes.
export function useAffichageProgressif(liste, cleCriteres, parTranche = 48) {
  const [nbVisibles, setNbVisibles] = useState(parTranche);
  const [cleAffichee, setCleAffichee] = useState(cleCriteres);
  // Ajustement pendant le rendu : c'est ce que React recommande pour un état
  // dérivé d'une prop, et ça évite un rendu intermédiaire à l'ancienne valeur.
  if (cleAffichee !== cleCriteres) {
    setCleAffichee(cleCriteres);
    setNbVisibles(parTranche);
  }

  const visibles = useMemo(() => liste.slice(0, nbVisibles), [liste, nbVisibles]);
  const resteAAfficher = liste.length > nbVisibles;

  // Sentinelle en bas de liste : quand elle approche, on déplie la tranche
  // suivante. L'observateur se redéclare à chaque palier, ce qui suffit — il
  // n'y a jamais qu'une sentinelle à l'écran.
  const sentinelleRef = useRef(null);
  useEffect(() => {
    if (!resteAAfficher) return;
    const cible = sentinelleRef.current;
    if (!cible) return;
    const obs = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) setNbVisibles((n) => n + parTranche);
      },
      // On déplie avant que le vide n'apparaisse à l'écran.
      { rootMargin: "800px 0px" }
    );
    obs.observe(cible);
    return () => obs.disconnect();
  }, [resteAAfficher, nbVisibles, parTranche]);

  return {
    visibles,
    resteAAfficher,
    sentinelleRef,
    afficherPlus: () => setNbVisibles((n) => n + parTranche),
    total: liste.length,
  };
}

export default useAffichageProgressif;
