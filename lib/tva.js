// lib/tva.js — le taux de TVA, en un seul endroit.
//
// Module PUR : utilisable serveur et navigateur. Reglages.tva est réglable
// dans l'admin (« Calcul des prix TTC ») mais n'était lu nulle part : huit
// fichiers multipliaient par 0,2 ou 1,2 en dur, et sept affichaient
// « TVA (20 %) » en toutes lettres. Le champ mentait à l'administrateur.
//
// Deux usages à ne pas confondre :
//
// • Un montant EN COURS de calcul — panier, commande en préparation, prix
//   affiché sur une fiche — se calcule avec le taux ACTUEL des Réglages.
//
// • Un document DÉJÀ ÉMIS — commande passée, devis envoyé — a figé son
//   montant de TVA. Son taux se relit sur ses propres chiffres, jamais sur
//   le réglage courant : une commande de l'an dernier doit continuer
//   d'afficher le taux auquel elle a été facturée.

export const TVA_DEFAUT = 0.2;

function arrondir2(n) {
  return Math.round(n * 100) / 100;
}

// Montant de TVA pour un total HT.
export function montantTVA(totalHT, taux = TVA_DEFAUT) {
  if (totalHT == null) return null;
  return arrondir2(totalHT * (taux ?? TVA_DEFAUT));
}

// Total TTC pour un total HT.
export function ajouterTVA(totalHT, taux = TVA_DEFAUT) {
  if (totalHT == null) return null;
  return arrondir2(totalHT * (1 + (taux ?? TVA_DEFAUT)));
}

// « 20 % », « 5,5 % » — sans décimale inutile.
export function pourcentageTVA(taux = TVA_DEFAUT) {
  const pct = (taux ?? TVA_DEFAUT) * 100;
  const arrondi = Math.round(pct * 100) / 100;
  return `${String(arrondi).replace(".", ",")} %`;
}

// Libellé d'une ligne de total : « TVA (20 %) ».
export function libelleTVA(taux = TVA_DEFAUT) {
  return `TVA (${pourcentageTVA(taux)})`;
}

// Taux effectif d'un document déjà émis, relu sur ses propres montants.
// Renvoie le taux par défaut si les chiffres ne permettent pas de conclure —
// mieux vaut un libellé plausible qu'une division par zéro affichée au client.
export function tauxDepuisMontants(totalHT, totalTVA) {
  const ht = Number(totalHT);
  const tva = Number(totalTVA);
  if (!Number.isFinite(ht) || !Number.isFinite(tva) || ht <= 0) return TVA_DEFAUT;
  return Math.round((tva / ht) * 10000) / 10000;
}
