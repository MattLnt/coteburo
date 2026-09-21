import { createHash } from "node:crypto";

// L'empreinte d'une combinaison : ce qui garantit qu'un produit ne porte pas
// deux fois la même variante.
//
// Elle ne dépend pas de l'ordre des clés du JSON — `{largeur, hauteur}` et
// `{hauteur, largeur}` décrivent la même variante, et la contrainte d'unicité
// de la base doit le voir ainsi.
//
// Elle vit ici, seule, parce que deux calculs divergents produiraient des
// doublons invisibles : la migration et l'import écrivent tous deux des
// combinaisons, et ils doivent s'accorder au caractère près.

const SEP = "␟";

export function empreinteDe(valeurs) {
  const ordonne = Object.keys(valeurs || {}).sort()
    .map((k) => `${k}=${valeurs[k]}`).join(SEP);
  return createHash("md5").update(ordonne).digest("hex").slice(0, 16);
}
