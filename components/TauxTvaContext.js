"use client";
import { createContext, useContext } from "react";
import { TVA_DEFAUT } from "@/lib/tva";

// Porte le taux de TVA des Réglages jusqu'aux composants client — panier,
// tunnel de commande, fiche produit — qui n'ont pas accès à la base.
// Alimenté une seule fois par le layout du site, qui charge déjà les Réglages.
const TauxTvaContext = createContext(TVA_DEFAUT);

export function TauxTvaProvider({ taux, children }) {
  return (
    <TauxTvaContext.Provider value={typeof taux === "number" ? taux : TVA_DEFAUT}>
      {children}
    </TauxTvaContext.Provider>
  );
}

export function useTauxTva() {
  return useContext(TauxTvaContext);
}
