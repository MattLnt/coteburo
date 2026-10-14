// Le Meta Pixel de Côté BURO.
//
// Un SEUL endroit parle à `fbq` : ce fichier. Partout ailleurs on appelle
// `pixel("AddToCart", …)`, qui ne fait RIEN si le script n'est pas chargé —
// et il ne l'est que si le visiteur a accepté les cookies de mesure
// (components/MetaPixel.js). Aucun garde-fou à répéter sur chaque appel.

// L'identifiant est public par nature : il voyage dans le script envoyé au
// navigateur. La variable d'environnement n'est qu'une commodité pour
// pointer un autre pixel (recette, second compte) sans toucher au code.
export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "2024069618303910";

// La boutique ne vend qu'en euros. Écrit une fois, pour que les quatre
// événements marchands n'inventent pas chacun leur devise.
export const DEVISE = "EUR";

// Meta refuse les montants à rallonge. Les prix du catalogue sortent de
// multiplications par la marge et la TVA : 1290.0000000000002 arrive vite.
export function montant(valeur) {
  const n = Number(valeur);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100) / 100;
}

// Les événements marchands demandent `contents` : une entrée par article,
// avec sa quantité et son prix unitaire. Même forme pour le panier du
// navigateur et pour les lignes d'une commande enregistrée.
export function contenus(lignes = []) {
  return lignes
    .filter((l) => l && l.id)
    .map((l) => ({
      id: String(l.id),
      quantity: l.quantite ?? 1,
      item_price: montant(l.prix),
    }));
}

// Les événements émis avant que le script ne soit en place.
//
// Le cas n'a rien de théorique : l'effet qui déclare ViewContent s'exécute au
// montage de la fiche, alors que le script est injecté après l'hydratation.
// Sans cette file, le ViewContent de la page d'arrivée partait à la poubelle —
// c'est-à-dire celui de la toute première fiche vue par un visiteur.
//
// Plafonnée : si le script ne vient jamais (refus, bloqueur, réseau coupé),
// la file ne doit pas grossir indéfiniment au fil de la navigation.
const enAttente = [];
const MAX_EN_ATTENTE = 20;

function emettre(evenement, parametres, options) {
  try {
    window.fbq("track", evenement, parametres, options);
    return true;
  } catch {
    // Un bloqueur de publicité qui casse `fbq` ne doit pas emporter la
    // boutique avec lui : un ajout au panier reste un ajout au panier.
    return false;
  }
}

// L'appel. `options` porte l'eventID quand on en a un (la déduplication
// côté Meta : une page de confirmation rechargée ne doit pas compter deux
// achats).
export function pixel(evenement, parametres = {}, options = undefined) {
  if (typeof window === "undefined") return;
  if (typeof window.fbq === "function") {
    emettre(evenement, parametres, options);
    return;
  }
  if (enAttente.length < MAX_EN_ATTENTE) enAttente.push([evenement, parametres, options]);
}

// Vidée par components/MetaPixel.js dès que le script est en place. Sans
// consentement, elle n'est jamais vidée : les événements meurent dans la
// mémoire de l'onglet, sans jamais partir nulle part.
export function viderFile() {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  while (enAttente.length) {
    const [evenement, parametres, options] = enAttente.shift();
    emettre(evenement, parametres, options);
  }
}
