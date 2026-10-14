"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

// Le consentement aux cookies de mesure.
//
// Trois états, et c'est tout : on ne sait pas encore ("inconnu" → le bandeau
// s'affiche), le visiteur a dit oui ("accepte" → le pixel se charge), il a
// dit non ("refuse" → rien ne se charge, et on ne le lui redemande pas).
//
// Le choix vit dans localStorage, comme les favoris et le panier : aucun
// cookie n'est posé pour savoir si on a le droit d'en poser.

const ConsentementContext = createContext(null);
const STORAGE_KEY = "coteburo_consentement";
const ETATS = ["accepte", "refuse"];

export function ConsentementProvider({ children }) {
  const [etat, setEtat] = useState("inconnu");
  // Rien ne s'affiche et rien ne se charge avant d'avoir relu le choix :
  // sans ça, le bandeau clignote à chaque page chez quelqu'un qui a déjà
  // répondu, et le pixel part avant qu'on sache s'il en a le droit.
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    try {
      const valeur = localStorage.getItem(STORAGE_KEY);
      if (ETATS.includes(valeur)) setEtat(valeur);
    } catch {
      // Navigation privée, stockage bloqué : on reste sur "inconnu", donc
      // sans mesure. Le défaut penche du côté du visiteur.
    }
    setCharge(true);
  }, []);

  const enregistrer = useCallback((valeur) => {
    setEtat(valeur);
    try {
      if (valeur === "inconnu") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, valeur);
    } catch {}
  }, []);

  const accepter = useCallback(() => enregistrer("accepte"), [enregistrer]);
  const refuser = useCallback(() => enregistrer("refuse"), [enregistrer]);
  // Revenir sur son choix : le bandeau réapparaît, et la page
  // confidentialité s'en sert pour laisser le visiteur changer d'avis.
  const reinitialiser = useCallback(() => enregistrer("inconnu"), [enregistrer]);

  return (
    <ConsentementContext.Provider
      value={{ etat, charge, accepte: etat === "accepte", accepter, refuser, reinitialiser }}
    >
      {children}
    </ConsentementContext.Provider>
  );
}

export function useConsentement() {
  const ctx = useContext(ConsentementContext);
  if (!ctx) throw new Error("useConsentement doit être utilisé dans un ConsentementProvider");
  return ctx;
}
