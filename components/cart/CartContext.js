"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "coteburo_panier";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false); // tiroir panier (optionnel plus tard)

  // Chargement initial depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  // Sauvegarde à chaque changement (une fois chargé)
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, loaded]);

  // Identifiant unique d'une ligne = produit + finition
  const lineId = (codeRacine, finition) => `${codeRacine}::${finition || "_"}`;

  const addItem = useCallback((produit, finition, quantite = 1) => {
    setItems((prev) => {
      const id = lineId(produit.codeRacine, finition);
      const existing = prev.find((it) => it.id === id);
      if (existing) {
        return prev.map((it) => it.id === id ? { ...it, quantite: it.quantite + quantite } : it);
      }
      return [...prev, {
        id,
        codeRacine: produit.codeRacine,
        slug: produit.slug || produit.codeRacine,
        categorieSlug: produit.categorieSlug || null,        // nécessaire pour reconstruire l'URL produit
        sousCategorieSlug: produit.sousCategorieSlug || null,
        designation: produit.designation,
        marque: produit.marque,
        image: produit.image || null,
        prix: produit.prix,          // prix unitaire HT (déjà calculé avec promo)
        finition: finition || null,
        quantite,
      }];
    });
    setOpen(true);
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const updateQuantite = useCallback((id, quantite) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, quantite: Math.max(1, quantite) } : it));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, it) => sum + it.quantite, 0);
  const totalHT = items.reduce((sum, it) => sum + it.prix * it.quantite, 0);

  return (
    <CartContext.Provider value={{ items, count, totalHT, loaded, open, setOpen, addItem, removeItem, updateQuantite, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans un CartProvider");
  return ctx;
}