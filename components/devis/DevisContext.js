"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const DevisContext = createContext(null);
const STORAGE_KEY = "coteburo_devis";

export function DevisProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, loaded]);

  // Identifiant d'une ligne devis = produit + config (finition/options)
  const lineId = (codeRacine, config) => `${codeRacine}::${config || "_"}`;

  const addDevis = useCallback((item, quantite = 1) => {
    setItems((prev) => {
      const id = lineId(item.codeRacine, item.config);
      const existing = prev.find((it) => it.id === id);
      if (existing) {
        return prev.map((it) => it.id === id ? { ...it, quantite: it.quantite + quantite } : it);
      }
      return [...prev, {
        id,
        codeRacine: item.codeRacine || null,          // peut être null si pas de config résolue
        gammeSlug: item.gammeSlug || null,
        carteSlug: item.carteSlug || null,
        designation: item.designation,                 // ex "Plan droit L120×P80 obturateurs" ou "Plan droit (Astro)"
        gammeNom: item.gammeNom || null,
        marque: item.marque || "Buronomic",
        image: item.image || null,
        config: item.config || null,                   // récap lisible de la config choisie
        finitions: Array.isArray(item.finitions) ? item.finitions : [], // [{ nom, valeurs: [string] }] — finitions disponibles pour ce produit
        prixIndicatif: item.prixIndicatif ?? null,     // "à partir de" ou prix résolu (indicatif, jamais engageant)
        quantite,
      }];
    });
    setOpen(true);
  }, []);

  const removeDevis = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const updateQuantite = useCallback((id, quantite) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, quantite: Math.max(1, quantite) } : it));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, it) => sum + it.quantite, 0);

  return (
    <DevisContext.Provider value={{ items, count, loaded, open, setOpen, addDevis, removeDevis, updateQuantite, clear }}>
      {children}
    </DevisContext.Provider>
  );
}

export function useDevis() {
  const ctx = useContext(DevisContext);
  if (!ctx) throw new Error("useDevis doit être utilisé dans un DevisProvider");
  return ctx;
}