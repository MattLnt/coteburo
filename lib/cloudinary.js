// Transformations d'affichage des images Cloudinary.
//
// Les visuels du catalogue viennent de sources hétérogènes : captures du
// configurateur pCon, photothèque Sokoa, photos envoyées depuis l'admin.
// Plutôt que de retoucher les fichiers, on demande à Cloudinary de les
// préparer à la volée — l'original reste intact et une même image sert
// en vignette comme en grand format.
//
// Le rognage automatique des marges — « e_trim » — n'est pas disponible
// sur le plan actuel : les captures gardent donc leur fond blanc. Le
// composant les affiche en « contain », ce qui montre le produit entier
// au prix d'un peu d'espace perdu autour.

// Les URL Cloudinary suivent toujours la même forme :
//   https://res.cloudinary.com/<cloud>/image/upload/<transformations>/<chemin>
// On insère donc après « /upload/ ».
const MARQUEUR = "/image/upload/";

function appliquer(url, transformations) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes(MARQUEUR)) return url; // image externe : on n'y touche pas

  const [avant, apres] = url.split(MARQUEUR);

  // Une URL déjà transformée ne doit pas l'être deux fois : on repère
  // les transformations existantes à leur syntaxe « x_y,z_w/ ».
  const dejaTransformee = /^[a-z]_[^/]+\//.test(apres);
  if (dejaTransformee) return url;

  return `${avant}${MARQUEUR}${transformations.join(",")}/${apres}`;
}

// Visuel produit — redimensionné, sans rognage.
//
// « f_auto » sert du WebP aux navigateurs qui le supportent et « q_auto »
// ajuste la compression : les pages se chargent nettement plus vite sans
// perte visible.
export function urlProduit(url, { largeur = 800 } = {}) {
  return appliquer(url, [
    // « limit » réduit sans jamais agrandir : une image déjà petite
    // garde sa taille plutôt que d'être étirée.
    `c_limit,w_${largeur},h_${largeur}`,
    "f_auto",
    "q_auto",
  ]);
}

// Version vignette, plus légère.
export function urlVignette(url, taille = 200) {
  return appliquer(url, [`c_limit,w_${taille},h_${taille}`, "f_auto", "q_auto"]);
}

// Les photos d'ambiance montrent le produit en situation : le décor fait
// partie de l'image, on remplit donc le cadre plutôt que de la contenir.
export function urlAmbiance(url, largeur = 800) {
  return appliquer(url, [`c_fill,w_${largeur},h_${largeur}`, "f_auto", "q_auto"]);
}