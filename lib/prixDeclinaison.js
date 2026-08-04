// Calcule le prix de vente effectif d'une ligne de déclinaison — utilisé partout
// (admin, fiche produit publique, panier, checkout) pour ne jamais avoir deux
// endroits qui calculent le prix différemment.
//
// Principe (même logique que l'ancien système Produit.prixVerrouille) :
// - Si la ligne est verrouillée (prixVerrouille: true) → on utilise prixVenteHT tel quel,
//   figé, peu importe la marge actuelle des Réglages.
// - Sinon (Auto, par défaut) → prixTarifHT × (1 + margeGlobale), recalculé à la volée.
//   Changer la marge dans les Réglages fait donc bouger tout le catalogue instantanément,
//   sans avoir à rouvrir aucune fiche produit.
export function prixVenteEffectif(ligne, margeGlobale) {
  const tarif = toNombre(ligne.prixTarifHT);
  const vente = toNombre(ligne.prixVenteHT);

  if (ligne.prixVerrouille) {
    return vente;
  }
  if (tarif == null) {
    // Pas de tarif renseigné — on retombe sur le prix de vente déjà saisi, s'il existe,
    // plutôt que d'afficher un prix nul ou une erreur.
    return vente;
  }
  return arrondir2(tarif * (1 + (margeGlobale ?? 0)));
}

function toNombre(v) {
  if (v === "" || v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

function arrondir2(n) {
  return Math.round(n * 100) / 100;
}