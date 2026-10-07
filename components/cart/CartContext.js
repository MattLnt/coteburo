"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { remiseDuCode } from "@/lib/codePromo";

const CartContext = createContext(null);
const STORAGE_KEY = "coteburo_panier";
// Version du FORMAT des articles du panier. À incrémenter dès qu'on change leur structure
// (nouveaux champs, options, etc.) → les paniers d'un autre format se vident tout seuls au chargement.
const STORAGE_VERSION = 4;

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false); // tiroir panier (optionnel plus tard)
  // Code promo retenu, tel que /api/code-promo l'a validé :
  // { code, nom, typeRemise, valeur, minimumHT }. Il survit au rechargement
  // de la page — un client qui revient ne retape pas son code — mais il est
  // TOUJOURS revérifié au paiement : ce qui est ici n'est qu'un affichage.
  const [codePromo, setCodePromo] = useState(null);

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
          // Le code promo voyage à côté des articles. Son absence n'a rien
          // d'anormal : la plupart des paniers n'en ont pas.
          if (data.codePromo?.code) setCodePromo(data.codePromo);
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, items, codePromo })); } catch {}
  }, [items, loaded, codePromo]);

  // Identifiant unique d'une ligne.
  //
  // La variante s'y désigne par sa COMBINAISON, qui est ce que la boutique
  // lit aujourd'hui. L'ancien identifiant de déclinaison reste accepté en
  // second : les accessoires liés le fournissent encore, et Combinaison.ancienId
  // fait le pont côté serveur.
  const lineId = (item, finition) => {
    // Une fiche composée pose plusieurs lignes qui partagent la fiche ET la
    // combinaison : le rangement, l'alcôve, les portes, les poignées. Sans la
    // clé de l'élément, elles portent le même identifiant et se fondent en
    // une seule ligne dont la quantité monte — le panier affichait « Alcôve,
    // quantité 3 » à la place des trois éléments.
    //
    // Le segment ne s'ajoute QUE s'il existe : les identifiants des paniers
    // déjà en localStorage ne bougent pas.
    const element = item.elementCle ? `::${item.elementCle}` : "";
    if (item.type === "nouveau") {
      const variante = item.combinaisonId || item.declinaisonId || "_";
      return `v:${item.vitrineId}::${variante}${element}::${finition || "_"}`;
    }
    return `p:${item.codeRacine}${element}::${finition || "_"}`;
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
        // L'élément d'une fiche composée dont cette ligne est la commande.
        elementCle: produit.elementCle || null,
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

  const clear = useCallback(() => { setItems([]); setCodePromo(null); }, []);

  // Le code s'oublie avec le panier vidé : une remise sans articles n'a plus
  // d'objet, et le garde-fou du montant minimum doit être rejoué.
  const retirerCode = useCallback(() => setCodePromo(null), []);

  const count = items.reduce((sum, it) => sum + it.quantite, 0);
  // Total indicatif, cote navigateur. Le montant facture est celui que
  // /api/commande/checkout recalcule. prix : ancien nom, pour les paniers
  // deja enregistres en localStorage avant le renommage.
  const prixLigneAffichee = (it) => it.prixAffichage ?? it.prix ?? 0;
  // Sous-total des articles, remises du catalogue déjà comprises dans leur prix.
  const sousTotalHT = items.reduce((sum, it) => sum + prixLigneAffichee(it) * it.quantite, 0);

  // La remise du code se RECALCULE à chaque rendu, depuis le taux retenu : une
  // quantité modifiée, une ligne retirée, et le montant suit. Mémoriser un
  // montant figé aurait laissé « −300 € » sur un panier devenu plus petit.
  const remiseCode = codePromo ? remiseDuCode(codePromo, sousTotalHT) : 0;

  // Le code tombe de lui-même si le panier repasse sous son montant minimum.
  // On ne le retire pas — le client le retrouvera en complétant son panier —
  // mais il ne remise rien tant que le minimum n'est pas atteint.
  const minimumAtteint = !codePromo?.minimumHT || sousTotalHT >= codePromo.minimumHT;
  const remiseAppliquee = minimumAtteint ? remiseCode : 0;

  // totalHT est NET : c'est lui que la TVA, les frais de port et le paiement
  // prennent pour base, pour que le panier, la commande et la facture
  // annoncent le même montant.
  const totalHT = Math.max(0, sousTotalHT - remiseAppliquee);

  return (
    <CartContext.Provider value={{
      items, count, sousTotalHT, totalHT, prixLigneAffichee, loaded, open, setOpen,
      addItem, removeItem, updateQuantite, clear,
      codePromo, setCodePromo, retirerCode, remiseCode: remiseAppliquee, minimumAtteint,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans un CartProvider");
  return ctx;
}