"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { getFavorisCodes } from "@/app/(compte)/compte/favoris/actions";

// Les favoris étaient lus sur le serveur, au rendu de chaque page qui montre
// une carte produit — catalogue, fiche, accueil. Lire la session, c'est lire
// un cookie, et une page qui lit un cookie ne peut plus être mise en cache :
// le catalogue entier était donc recalculé à chaque visite, y compris pour un
// visiteur jamais connecté et pour les robots.
//
// Les favoris sont pourtant une décoration : un cœur plein ou vide sur une
// carte. Ils n'appartiennent pas au contenu de la page, qui est le même pour
// tout le monde. On les charge donc depuis le navigateur, une seule fois pour
// toute la visite, et seulement si quelqu'un est connecté — un visiteur
// anonyme ne déclenche aucun appel.
const FavorisContext = createContext(null);

const VIDE = new Set();

export function FavorisProvider({ children }) {
  const { data: session, status } = useSession();
  const connecte = status === "authenticated";
  const estAdmin = session?.user?.role === "ADMIN";

  // null tant que la réponse n'est pas revenue ; un Set ensuite. L'état n'est
  // posé que dans le retour de la promesse — jamais dans le corps de l'effet,
  // qui déclencherait un rendu en cascade.
  const [chargees, setChargees] = useState(null);

  useEffect(() => {
    // next-auth commence par « loading », et un visiteur anonyme n'a rien à
    // demander : dans les deux cas on ne touche pas au serveur.
    if (status !== "authenticated") return;

    let vivant = true;
    getFavorisCodes()
      .then((res) => { if (vivant) setChargees(new Set(res?.vitrines || [])); })
      // Un favori qui ne se charge pas ne doit pas casser le catalogue : les
      // cœurs restent vides, tout le reste fonctionne.
      .catch(() => { if (vivant) setChargees(VIDE); });
    return () => { vivant = false; };
  }, [status]);

  const favoris = connecte ? (chargees || VIDE) : VIDE;
  // « pret » distingue « pas encore chargé » de « aucun favori ». Sans lui, un
  // cœur déjà posé clignote en vide le temps de la réponse.
  const pret = status === "loading" ? false : (connecte ? chargees !== null : true);

  const valeur = useMemo(() => ({
    connecte,
    estAdmin,
    favoris,
    pret,
    // Appelée par chaque bouton après une bascule : les compteurs et le filtre
    // favoris de l'admin restent justes sans recharger la page.
    basculer: (vitrineId, actif) => setChargees((prev) => {
      const suite = new Set(prev || VIDE);
      if (actif) suite.add(vitrineId); else suite.delete(vitrineId);
      return suite;
    }),
  }), [connecte, estAdmin, favoris, pret]);

  return <FavorisContext.Provider value={valeur}>{children}</FavorisContext.Provider>;
}

// Utilisable hors du fournisseur (l'admin, le compte) : on retombe alors sur
// un état neutre, et les composants concernés passent leurs props comme avant.
export function useFavoris() {
  return useContext(FavorisContext) || {
    connecte: false,
    estAdmin: false,
    favoris: VIDE,
    pret: false,
    basculer: () => {},
  };
}
