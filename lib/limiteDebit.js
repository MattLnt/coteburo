// Limitation de débit des points d'entrée publics.
//
// Le site n'en avait aucune : la connexion était exposée au bourrinage de mots
// de passe, et les formulaires de contact et de devis au spam — chacun
// déclenche un envoi d'email facturé.
//
// Le compteur vit en mémoire du processus. C'est volontairement modeste :
// sans Redis, une fenêtre glissante par instance arrête un script lancé depuis
// une machine, ce qui est la menace réelle ici. Une attaque distribuée sur
// plusieurs adresses passerait au travers ; le jour où ça devient un sujet, le
// remplacement se fait derrière cette même fonction.
//
// Les entrées expirées sont purgées au fil des appels : rien ne tourne en
// tâche de fond, et la table ne grossit pas indéfiniment.

const compteurs = new Map();

// Dernier nettoyage, pour ne pas balayer la table à chaque appel.
let dernierMenage = 0;
const INTERVALLE_MENAGE = 60_000;

function menage(maintenant) {
  if (maintenant - dernierMenage < INTERVALLE_MENAGE) return;
  dernierMenage = maintenant;
  for (const [cle, e] of compteurs) {
    if (maintenant > e.jusqu) compteurs.delete(cle);
  }
}

// L'adresse du client, telle que la voit Vercel. `x-forwarded-for` peut
// contenir une liste : la première adresse est celle du client d'origine.
export function adresseDe(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "inconnue";
}

/**
 * Autorise ou refuse une tentative.
 *
 * @param {string} cle        identifiant du seau — « contact:1.2.3.4 »
 * @param {number} maximum    tentatives autorisées dans la fenêtre
 * @param {number} fenetreMs  durée de la fenêtre
 * @returns {{ok: boolean, restant: number, retenteDans: number}}
 */
export function limiter(cle, maximum, fenetreMs) {
  const maintenant = Date.now();
  menage(maintenant);

  const e = compteurs.get(cle);
  if (!e || maintenant > e.jusqu) {
    compteurs.set(cle, { n: 1, jusqu: maintenant + fenetreMs });
    return { ok: true, restant: maximum - 1, retenteDans: 0 };
  }

  if (e.n >= maximum) {
    return { ok: false, restant: 0, retenteDans: Math.ceil((e.jusqu - maintenant) / 1000) };
  }

  e.n++;
  return { ok: true, restant: maximum - e.n, retenteDans: 0 };
}

// Réponse normalisée, avec l'en-tête que les clients HTTP savent lire.
export function reponseTropDeRequetes(retenteDans) {
  return Response.json(
    { error: `Trop de tentatives. Réessayez dans ${retenteDans} seconde${retenteDans > 1 ? "s" : ""}.` },
    { status: 429, headers: { "Retry-After": String(retenteDans) } }
  );
}
