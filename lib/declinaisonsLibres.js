// lib/declinaisonsLibres.js
// Moteur de résolution pour les déclinaisons libres (axes nommés par l'admin + prix par ligne).
// Même principe que le moteur dynamique du configurateur : à chaque instant, on détermine
// la prochaine vraie question (celle qui a un choix réel), jamais une combinaison impossible.

// Filtre les déclinaisons compatibles avec les réponses données jusqu'ici
export function filtrerDeclinaisons(declinaisons, reponses = {}) {
  return declinaisons.filter((d) =>
    Object.entries(reponses).every(([axeId, valeur]) => d.valeurs?.[axeId] === valeur)
  );
}

// Résout : si une seule déclinaison correspond exactement aux réponses, on la retourne
export function resoudreDeclinaison(declinaisons, reponses = {}) {
  const restantes = filtrerDeclinaisons(declinaisons, reponses);
  const match = restantes.length === 1 ? restantes[0] : null;
  return { match, restantes };
}

// Détermine le prochain axe à traiter : pas encore répondu, avec un vrai choix (2+ valeurs possibles)
// dejaTraites : Set des ids d'axes déjà répondus
export function prochainAxe(axes, declinaisons, reponses, dejaTraites) {
  const restantes = filtrerDeclinaisons(declinaisons, reponses);
  for (const axe of axes) {
    if (dejaTraites.has(axe.id)) continue;
    const valeurs = new Set(restantes.map((d) => d.valeurs?.[axe.id]).filter((v) => v != null && v !== ""));
    if (valeurs.size >= 2) {
      return { axe, valeurs: [...valeurs].sort((a, b) => a.localeCompare(b, "fr")) };
    }
  }
  return null;
}

// Compte combien d'axes réels restent à traiter (pour la barre de progression qui s'adapte)
export function compterAxesRestants(axes, declinaisons, reponses, dejaTraites) {
  const restantes = filtrerDeclinaisons(declinaisons, reponses);
  let n = 0;
  for (const axe of axes) {
    if (dejaTraites.has(axe.id)) continue;
    const valeurs = new Set(restantes.map((d) => d.valeurs?.[axe.id]).filter((v) => v != null && v !== ""));
    if (valeurs.size >= 2) n++;
  }
  return n;
}