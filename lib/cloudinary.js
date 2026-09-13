// Transformations d'affichage des images Cloudinary.
//
// Les visuels du catalogue viennent de sources hétérogènes : captures du
// configurateur pCon avec de larges marges blanches, photothèque Sokoa
// déjà cadrée, photos envoyées depuis l'admin. Plutôt que de retoucher
// les fichiers, on demande à Cloudinary de les préparer à la volée —
// l'original reste intact et une même image peut servir en vignette
// comme en grand format.

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

// Rogne les marges uniformes autour du sujet.
//
// Les captures pCon laissent beaucoup de blanc autour du meuble : sans
// rognage, le produit occupe moins de la moitié de son cadre. « c_trim »
// détecte la bordure uniforme et la coupe ; la tolérance évite qu'un
// dégradé léger empêche la détection.
//
// On ajoute ensuite une marge proportionnelle pour que le produit ne
// touche pas les bords.
export function urlProduit(url, { largeur = 800, marge = 30 } = {}) {
  return appliquer(url, [
    // Tolérance 15 sur 100 : assez large pour un fond blanc légèrement
    // dégradé, assez stricte pour ne pas mordre sur le produit.
    "e_trim:15",
    // Le fond reste blanc : le catalogue s'affiche sur fond clair.
    `c_pad,b_white,w_${largeur},h_${largeur}`,
    // Marge intérieure, pour ne pas coller aux bords.
    `bo_${marge}px_solid_white`,
    "f_auto",
    "q_auto",
  ]);
}

// Version vignette, plus légère et sans marge superflue.
export function urlVignette(url, taille = 200) {
  return appliquer(url, [
    "e_trim:15",
    `c_pad,b_white,w_${taille},h_${taille}`,
    `bo_${Math.round(taille * 0.05)}px_solid_white`,
    "f_auto",
    "q_auto",
  ]);
}

// Les photos d'ambiance montrent le produit en situation : les rogner
// n'aurait aucun sens, le décor fait partie de l'image.
export function urlAmbiance(url, largeur = 800) {
  return appliquer(url, [`c_fill,w_${largeur},h_${largeur}`, "f_auto", "q_auto"]);
}