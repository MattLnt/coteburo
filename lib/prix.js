// lib/prix.js — moteur de prix centralisé

// Prix de vente affiché pour un produit.
// Priorité : prixVenteHT (défini/ajusté par l'admin) → sinon calcul catalogue × (1+marge).
export function getPrixVente(produit, { margeGlobale = 0.3, margeCategorie = null } = {}) {
  if (produit?.prixVenteHT != null && produit.prixVenteHT > 0) return produit.prixVenteHT;
  const base = produit?.prixPublicHT ?? 0;
  const marge = margeCategorie != null ? margeCategorie : margeGlobale;
  return Math.round(base * (1 + marge) * 100) / 100;
}

// Marge d'un produit (en € et %), calculée entre prix d'achat et prix de vente.
// Si pas de prix d'achat, on ne peut pas calculer -> retourne null.
export function calculerMarge(produit) {
  const vente = produit?.prixVenteHT ?? null;
  const achat = produit?.prixAchatHT ?? null;
  if (vente == null || achat == null || achat <= 0) return null;
  const euros = Math.round((vente - achat) * 100) / 100;
  const pct = Math.round(((vente - achat) / achat) * 1000) / 10; // 1 décimale
  return { euros, pct };
}

// Prix TTC à partir d'un HT + taux TVA (ex 0.2)
export function toTTC(ht, tva = 0.2) {
  if (ht == null) return null;
  return Math.round(ht * (1 + tva) * 100) / 100;
}

// Formatage € FR
export function fmtEuro(n) {
  if (n == null) return "—";
  return `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}