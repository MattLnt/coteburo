// Décompose une finition brute en niveaux structurés.
// "NOIR METAL / NEBRASKA / VERT EAU - VERT ACIDE"
//   -> ["NOIR METAL", "NEBRASKA", "VERT EAU", "VERT ACIDE"]
export function decomposerFinition(finition) {
  if (!finition) return [];
  // On sépare d'abord sur " - " (dernier niveau), puis sur " / "
  const [avant, apres] = finition.split(" - ");
  const niveaux = avant.split(" / ").map((s) => s.trim());
  if (apres) niveaux.push(apres.trim());
  return niveaux;
}

// Construit la liste des étapes (labels) selon le nombre de niveaux détecté.
// On nomme les niveaux de façon générique mais lisible.
export function nomsNiveaux(nbNiveaux) {
  const noms = ["Structure", "Plateau", "Coloris", "Finition tissu", "Option"];
  return Array.from({ length: nbNiveaux }, (_, i) => noms[i] || `Niveau ${i + 1}`);
}

// À partir d'une liste de finitions brutes + des choix déjà faits,
// renvoie les options disponibles pour le prochain niveau.
export function optionsNiveau(finitions, choix) {
  const niveau = choix.length;
  const options = new Set();
  for (const f of finitions) {
    const parts = decomposerFinition(f);
    // La finition doit correspondre à tous les choix déjà faits
    const compatible = choix.every((c, i) => parts[i] === c);
    if (compatible && parts[niveau] != null) {
      options.add(parts[niveau]);
    }
  }
  return [...options];
}

// Reconstitue la chaîne de finition exacte à partir des niveaux choisis.
// ["NOIR METAL","NEBRASKA","VERT EAU","VERT ACIDE"] -> "NOIR METAL / NEBRASKA / VERT EAU - VERT ACIDE"
export function recomposerFinition(niveaux) {
  if (niveaux.length === 0) return "";
  if (niveaux.length === 1) return niveaux[0];
  const debut = niveaux.slice(0, -1).join(" / ");
  const fin = niveaux[niveaux.length - 1];
  return `${debut} - ${fin}`;
}