// L'adresse publique du site, en un seul endroit.
//
// robots.txt et sitemap.xml doivent tomber d'accord : un plan de site hébergé
// sur un hôte mais qui référence les URL d'un autre est rejeté par les moteurs.
// Ils lisaient chacun leur variable avec leur propre valeur de repli — trois
// replis différents cohabitaient dans le projet, dont un « coteburo.fr » alors
// que le site est servi sur www.
//
// Le repli ne sert plus qu'aux environnements où la variable manque
// (previews sans configuration) : il vaut mieux un plan de site pointant le
// bon domaine qu'un plan de site pointant l'apex, qui redirige en 308.
const REPLI = "https://www.coteburo.fr";

export function siteUrl() {
  const brut = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  // Sans slash final : tout le reste du code concatène des chemins qui en ont
  // déjà un, et « //catalogue » n'est pas la même URL que « /catalogue ».
  return (brut || REPLI).replace(/\/+$/, "");
}
