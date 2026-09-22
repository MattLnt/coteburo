// Poser une image produit sur du blanc, sans toucher au fichier d'origine.
//
// LE PROBLÈME
//   Beaucoup de visuels fournisseurs sont des PNG détourés : leur fond est
//   transparent. Posés sur le dégradé beige de la galerie, ils laissent
//   voir ce dégradé au travers, et le meuble semble flotter dans une tache
//   de couleur. Sur un fond blanc, un PNG détouré rend exactement comme une
//   photo sur fond blanc — il n'y a donc plus rien à détourer ni à retoucher.
//
// CE QU'ON FAIT
//   On demande à Cloudinary d'aplatir la transparence sur du blanc à la
//   livraison : « b_white » donne la couleur de fond, « f_jpg » choisit un
//   format qui ne sait pas porter de transparence, ce qui force l'aplatissement.
//
//   Le fichier d'origine n'est pas modifié. On peut revenir en arrière en
//   cessant d'appeler cette fonction, et les PNG transparents restent
//   disponibles tels quels pour qui en aurait besoin.
//
// POURQUOI PAS f_auto
//   « f_auto » livrerait volontiers du WebP, qui sait porter la transparence :
//   le fond blanc ne serait alors pas appliqué et le problème reviendrait
//   sur les navigateurs modernes seulement — le pire des cas, un défaut qui
//   n'apparaît que chez certains.
//
// CE QUI N'EST PAS TOUCHÉ
//   Une adresse qui ne vient pas de Cloudinary est rendue telle quelle. Les
//   bannières, logos, réalisations et articles ne passent pas par ici.

const MARQUEUR = "/upload/";

/**
 * L'adresse d'une image produit, aplatie sur fond blanc.
 *
 * @param url      l'adresse d'origine
 * @param largeur  largeur maximale souhaitée, en pixels (facultatif)
 */
export function surFondBlanc(url, largeur = null) {
  const adresse = String(url || "");
  if (!adresse.includes("res.cloudinary.com") || !adresse.includes(MARQUEUR)) return adresse;

  const [avant, apres] = adresse.split(MARQUEUR);
  // Une adresse déjà transformée par nos soins n'est pas transformée deux fois.
  if (/^b_white/.test(apres)) return adresse;

  const reglages = ["b_white", "f_jpg", "q_auto"];
  if (largeur) reglages.push(`w_${largeur}`, "c_limit");
  return `${avant}${MARQUEUR}${reglages.join(",")}/${apres}`;
}

export default surFondBlanc;
