import { revalidatePath } from "next/cache";

/**
 * Vide le cache des pages publiques.
 *
 * Tant que l'accueil, le catalogue et les fiches étaient en force-dynamic, ils
 * se reconstruisaient à chaque visite : une modification faite dans l'admin
 * était visible au rafraîchissement suivant, sans rien demander à personne.
 * Ces pages sont maintenant mises en cache, et ce qui était gratuit devient
 * nécessaire : sans cet appel, une fiche dépubliée resterait en ligne et un
 * prix modifié ne descendrait qu'à l'expiration du délai (une heure).
 *
 * On invalide depuis la racine en mode "layout" : les prix dépendent de la
 * marge et des campagnes, qui sont globales, et la moindre retouche peut donc
 * changer n'importe quelle carte du site. Viser une fiche en particulier
 * laisserait les autres mentir. C'est l'idiome déjà retenu par l'admin pour
 * les catégories, les promotions et les réglages.
 *
 * Le coût est nul au moment de l'appel : Next se contente de marquer les pages
 * comme périmées, et chacune n'est reconstruite qu'à sa prochaine visite.
 */
export function invaliderSitePublic() {
  revalidatePath("/", "layout");
}
