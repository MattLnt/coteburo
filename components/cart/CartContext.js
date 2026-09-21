"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "coteburo_panier";
// Version du FORMAT des articles du panier. À incrémenter dès qu'on change leur structure
// (nouveaux champs, options, etc.) → les paniers d'un autre format se vident tout seuls au chargement.
const STORAGE_VERSION = 4;

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false); // tiroir panier (optionnel plus tard)

  // Chargement initial depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        // Format attendu : { v, items }. Toute autre forme (ancien panier) est ignorée et supprimée,
        // pour éviter des articles au format périmé qui casseraient le paiement.
        if (data && data.v === STORAGE_VERSION && Array.isArray(data.items)) {
          setItems(data.items);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoaded(true);
  }, []);

  // Sauvegarde à chaque changement (une fois chargé)
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, items })); } catch {}
  }, [items, loaded]);

  // Identifiant unique d'une ligne.
  //
  // La variante s'y désigne par sa COMBINAISON, qui est ce que la boutique
  // lit aujourd'hui. L'ancien identifiant de déclinaison reste accepté en
  // second : les accessoires liés le fournissent encore, et Combinaison.ancienId
  // fait le pont côté serveur.
  const lineId = (item, finition) => {
    if (item.type === "nouveau") {
      const variante = item.combinaisonId || item.declinaisonId || "_";
      return `v:${item.vitrineId}::${variante}::${finition || "_"}`;
    }
    return `p:${item.codeRacine}::${finition || "_"}`;
  };

  // Renvoie l'id de la ligne ajoutée (utile pour rattacher des options à leur parent).
  const addItem = useCallback((produit, finition, quantite = 1) => {
    const id = lineId(produit, finition);
    setItems((prev) => {
      const existing = prev.find((it) => it.id === id);
      if (existing) {
        return prev.map((it) => it.id === id ? { ...it, quantite: it.quantite + quantite } : it);
      }
      const base = {
        id,
        type: produit.type === "nouveau" ? "nouveau" : "ancien",
        slug: produit.slug,
        categorieSlug: produit.categorieSlug || null,        // nécessaire pour reconstruire l'URL produit
        sousCategorieSlug: produit.sousCategorieSlug || null,
        designation: produit.designation,
        marque: produit.marque || null,
        image: produit.image || null,
        // Prix d AFFICHAGE uniquement. Le paiement et le devis le recalculent
        // depuis la base et ne lisent jamais cette valeur : un panier garde en
        // localStorage un montant qui peut avoir vieilli de plusieurs mois.
        prixAffichage: produit.prix,
        finition: finition || null,
        quantite,
        parentId: produit.parentId || null,   // si renseigné → c'est une option rattachée à un produit
        estOption: !!produit.parentId,
        vitrineId: produit.vitrineId || null,  // produit "nouveau" ou option → id de la fiche produit
        optionId: produit.optionId || null,    // option → son id dans optionsAdditionnelles
        optionDeclinaisonId: produit.optionDeclinaisonId || null, // option à déclinaisons → id de la combinaison choisie
        reference: produit.reference || null,  // référence fournisseur (option)
        // ── Le bloc d'identité ──
        //
        // La fiche le donnait déjà ; le panier le jetait, et la commande
        // devait retrouver quoi commander à partir d'un identifiant d'avant
        // la refonte. Il voyage maintenant jusqu'au bon de commande.
        combinaisonId: produit.combinaisonId || null,
        referenceComplete: produit.referenceComplete || null,
        fournisseur: produit.fournisseur || produit.marque || null,
        choix: produit.choix || null,
      };
      if (base.type === "nouveau") {
        return [...prev, { ...base, vitrineId: produit.vitrineId, declinaisonId: produit.declinaisonId }];
      }
      return [...prev, { ...base, codeRacine: produit.codeRacine }];
    });
    setOpen(true);
    return id;
  }, []);

  // Supprime une ligne — et, si c'est un produit parent, toutes ses options rattachées.
  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id && it.parentId !== id));
  }, []);

  const updateQuantite = useCallback((id, quantite) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, quantite: Math.max(1, quantite) } : it));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, it) => sum + it.quantite, 0);
  // Total indicatif, cote navigateur. Le montant facture est celui que
  // /api/commande/checkout recalcule. prix : ancien nom, pour les paniers
  // deja enregistres en localStorage avant le renommage.
  const prixLigneAffichee = (it) => it.prixAffichage ?? it.prix ?? 0;
  const totalHT = items.reduce((sum, it) => sum + prixLigneAffichee(it) * it.quantite, 0);

  return (
    <CartContext.Provider value={{ items, count, totalHT, prixLigneAffichee, loaded, open, setOpen, addItem, removeItem, updateQuantite, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans un CartProvider");
  return ctx;
}