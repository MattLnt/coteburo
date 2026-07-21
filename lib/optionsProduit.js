// lib/optionsProduit.js
// Moteur dynamique : détermine à chaque instant la prochaine vraie question
// (celle qui a un choix réel vu les réponses déjà données), sans jamais
// proposer une combinaison qui n'existe pas dans le tarif.

const ORDRE_AXES = ["longueur", "hauteur", "profondeur", "plateau", "pied"];
const LABELS = { longueur: "Longueur", hauteur: "Hauteur", profondeur: "Profondeur", plateau: "Plateau", pied: "Pied" };
const UNITE = { longueur: " cm", hauteur: " cm", profondeur: " cm" };

function trierValeurs(vals) {
  const num = vals.every((v) => /^\d+(\/\d+)?$/.test(String(v)));
  if (num) return [...vals].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  return [...vals].sort((a, b) => String(a).localeCompare(String(b), "fr"));
}

// Recense tous les axes/options possibles sur l'ensemble des produits d'une carte
// (sert à connaître les labels/valeurs, pas à décider quoi afficher — ça, c'est prochaineEtape)
export function identifierAxesEtOptions(produits) {
  const axes = [];
  for (const key of ORDRE_AXES) {
    const set = new Set();
    for (const p of produits) {
      const v = p[key];
      if (v !== null && v !== undefined && v !== "") set.add(String(v));
    }
    if (set.size >= 1) {
      axes.push({ key, label: LABELS[key], valeurs: trierValeurs([...set]).map((v) => ({ value: v, label: v + (UNITE[key] || "") })) });
    }
  }
  const compteur = new Map();
  for (const p of produits) for (const o of p.options || []) compteur.set(o, (compteur.get(o) || 0) + 1);
  const optionsBool = [...compteur.keys()].sort((a, b) => a.localeCompare(b, "fr")).map((k) => ({ key: k, label: k }));
  return { axes, optionsBool };
}

// Filtre les produits selon les axes choisis ET les réponses d'options (true = doit avoir, false = ne doit pas avoir)
export function filtrerProduits(produits, selection = {}, optionsReponses = {}) {
  return produits.filter((p) => {
    for (const key of ORDRE_AXES) {
      if (selection[key] != null && String(p[key]) !== String(selection[key])) return false;
    }
    for (const [opt, val] of Object.entries(optionsReponses)) {
      const aOption = (p.options || []).includes(opt);
      if (val === true && !aOption) return false;
      if (val === false && aOption) return false;
    }
    return true;
  });
}

// Résout la sélection en produit(s) correspondant(s)
export function resoudreSelection(produits, selection = {}, optionsReponses = {}) {
  const restants = filtrerProduits(produits, selection, optionsReponses);
  const match = restants.length === 1 ? restants[0] : null;
  return { match, restants };
}

// Détermine la PROCHAINE vraie question à poser (axe ou option), en ignorant celles déjà
// traitées (répondues OU explicitement passées) et celles qui n'ont plus qu'une seule valeur possible.
// dejaTraites : Set de clés du type "axe:longueur" ou "option:Console B-BOX"
export function prochaineEtapeProduit(identifs, produits, selection, optionsReponses, dejaTraites) {
  const candidats = filtrerProduits(produits, selection, optionsReponses);

  for (const axe of identifs.axes) {
    if (dejaTraites.has(`axe:${axe.key}`)) continue;
    const distinctes = new Set(candidats.map((p) => p[axe.key]).filter((v) => v != null && v !== "").map(String));
    if (distinctes.size >= 2) {
      return { type: "axe", cle: `axe:${axe.key}`, key: axe.key, label: axe.label, axe: { ...axe, valeurs: axe.valeurs.filter((v) => distinctes.has(String(v.value))) } };
    }
  }
  for (const opt of identifs.optionsBool) {
    if (dejaTraites.has(`option:${opt.key}`)) continue;
    const avec = candidats.some((p) => (p.options || []).includes(opt.key));
    const sans = candidats.some((p) => !(p.options || []).includes(opt.key));
    if (avec && sans) return { type: "option", cle: `option:${opt.key}`, key: opt.key, label: opt.label };
  }
  return null; // plus aucun axe/option réel à traiter
}

// Compte combien d'axes/options réels restent à traiter (pour adapter le total de la barre de progression)
export function compterEtapesRestantes(identifs, produits, selection, optionsReponses, dejaTraites) {
  const candidats = filtrerProduits(produits, selection, optionsReponses);
  let n = 0;
  for (const axe of identifs.axes) {
    if (dejaTraites.has(`axe:${axe.key}`)) continue;
    const distinctes = new Set(candidats.map((p) => p[axe.key]).filter((v) => v != null && v !== "").map(String));
    if (distinctes.size >= 2) n++;
  }
  for (const opt of identifs.optionsBool) {
    if (dejaTraites.has(`option:${opt.key}`)) continue;
    const avec = candidats.some((p) => (p.options || []).includes(opt.key));
    const sans = candidats.some((p) => !(p.options || []).includes(opt.key));
    if (avec && sans) n++;
  }
  return n;
}