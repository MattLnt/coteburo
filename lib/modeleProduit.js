// lib/modeleProduit.js — lire un produit du modèle à choix et combinaisons.
//
// Module PUR : aucun accès base, donc utilisable côté serveur comme côté
// navigateur. C'est la même condition que pour lib/prixCatalogue.js — la
// fiche, le panier, le devis et le paiement doivent raisonner à l'identique.
// Le chargement depuis la base reste dans lib/catalogue.js.
//
// Documenté dans docs/modele-produit.md.
//
// LES TROIS NATURES DE CHOIX, ET CE QU'ELLES FONT
//
//   tarifaire   entre dans la combinaison, donc dans le prix ET la référence.
//               Une réponse ferme des possibilités : les valeurs qui ne mènent
//               à aucune combinaison ne sont plus proposées.
//
//   finition    n'entre pas dans le prix. Toutes ses valeurs restent ouvertes,
//               sauf celles qu'une exclusion interdit avec ce qui est déjà
//               choisi. Elle ajoute son jeton à la référence commandée.
//
//   option      ne configure pas le produit : elle s'ajoute au panier à côté.
//               Elle n'est pas traitée ici.
//
// LA RÉFÉRENCE
//
//   référence commandée = combinaison.referenceBase
//                       + Σ suffixeReference, dans l'ordre des rangReference
//
//   L'ordre d'assemblage n'est PAS l'ordre d'affichage : chez Eko la fiche
//   montre la serrure avant la finition, la référence écrit l'inverse. C'est
//   « rangReference » qui fait foi, et lui seul.

import { prixLigne } from "./prixCatalogue";

const estVide = (v) => v == null || v === "";

/** Les choix qui configurent le produit, dans l'ordre où on les pose. */
export function etapesDe(produit) {
  return [...(produit?.choix || [])]
    .filter((c) => c.nature === "tarifaire" || c.nature === "finition")
    .sort((a, b) => a.ordre - b.ordre);
}

export const choixTarifaires = (produit) => etapesDe(produit).filter((c) => c.nature === "tarifaire");
export const choixFinition = (produit) => etapesDe(produit).filter((c) => c.nature === "finition");

/**
 * Les combinaisons encore possibles compte tenu des réponses tarifaires.
 * `sauf` permet d'ignorer un choix pour savoir ce qu'il pourrait encore offrir.
 */
export function combinaisonsCompatibles(produit, reponses = {}, sauf = null) {
  const cles = choixTarifaires(produit).map((c) => c.cle);
  return (produit?.combinaisons || []).filter((comb) =>
    cles.every((cle) => {
      if (cle === sauf) return true;
      const rep = reponses[cle];
      return estVide(rep) || comb.valeurs?.[cle] === rep;
    }));
}

/**
 * Une association de finitions que le tarif ne vend pas ?
 * Les exclusions portent des identifiants de valeurs : une association est
 * interdite dès que TOUTES les valeurs d'une exclusion sont retenues.
 */
export function associationInterdite(produit, valeurIds = []) {
  const retenues = new Set(valeurIds.filter(Boolean));
  return (produit?.exclusionsFinition || []).some((e) => {
    const L = Array.isArray(e.valeurs) ? e.valeurs : [];
    return L.length > 0 && L.every((id) => retenues.has(id));
  });
}

/** L'identifiant de valeur retenu pour un choix, d'après les réponses. */
function valeurRetenue(choix, reponses) {
  const rep = reponses?.[choix.cle];
  if (estVide(rep)) return null;
  return (choix.valeurs || []).find((v) => v.libelle === rep) || null;
}

/**
 * La prochaine question à poser, avec les seules valeurs encore atteignables.
 * Rend null quand il n'y a plus rien à demander.
 *
 * Une étape sans véritable choix — une seule valeur possible — est sautée :
 * la poser ferait perdre un clic pour rien.
 */
export function prochaineEtape(produit, reponses = {}, dejaTraites = new Set()) {
  for (const choix of etapesDe(produit)) {
    if (!estVide(reponses[choix.cle]) || dejaTraites.has(choix.cle)) continue;

    if (choix.nature === "tarifaire") {
      const possibles = combinaisonsCompatibles(produit, reponses, choix.cle);
      const atteignables = new Set(possibles.map((c) => c.valeurs?.[choix.cle]).filter((v) => !estVide(v)));
      if (atteignables.size < 2) continue;
      // L'ordre d'affichage est celui du choix, pas celui des combinaisons.
      const valeurs = (choix.valeurs || []).filter((v) => atteignables.has(v.libelle));
      return { choix, valeurs, nature: "tarifaire" };
    }

    // Une finition ne ferme rien, sauf ce qu'une exclusion interdit avec les
    // finitions déjà retenues.
    const dejaRetenues = choixFinition(produit)
      .map((c) => valeurRetenue(c, reponses))
      .filter(Boolean)
      .map((v) => v.id);
    const valeurs = (choix.valeurs || [])
      .filter((v) => !associationInterdite(produit, [...dejaRetenues, v.id]));
    if (valeurs.length < 2) continue;
    return { choix, valeurs, nature: "finition" };
  }
  return null;
}

/** Combien de vraies questions restent à poser. */
export function etapesRestantes(produit, reponses = {}, dejaTraites = new Set()) {
  let n = 0;
  const vues = new Set(dejaTraites);
  let etape = prochaineEtape(produit, reponses, vues);
  while (etape) {
    n += 1;
    vues.add(etape.choix.cle);
    etape = prochaineEtape(produit, reponses, vues);
  }
  return n;
}

/** La combinaison retenue, ou null tant que les réponses n'en désignent qu'une. */
export function resoudreCombinaison(produit, reponses = {}) {
  const restantes = combinaisonsCompatibles(produit, reponses);
  if (restantes.length === 1) return restantes[0];
  // Un produit à combinaison unique n'a rien à faire choisir.
  if (!choixTarifaires(produit).length && restantes.length) return restantes[0];
  return null;
}

/**
 * La référence à commander chez le fournisseur.
 *
 * Rend null tant que la combinaison n'est pas résolue, ou qu'un choix qui
 * participe à la référence n'a pas reçu de réponse : mieux vaut pas de
 * référence qu'une référence incomplète, qu'on enverrait au fournisseur sans
 * s'en apercevoir.
 */
export function assemblerReference(produit, reponses = {}) {
  const comb = resoudreCombinaison(produit, reponses);
  if (!comb?.referenceBase) return null;

  const participants = etapesDe(produit)
    .filter((c) => c.rangReference != null)
    .sort((a, b) => a.rangReference - b.rangReference);

  let ref = comb.referenceBase;
  for (const choix of participants) {
    const valeur = valeurRetenue(choix, reponses);
    if (!valeur) return null;
    // Une valeur SANS jeton n'est pas déclinée par le tarif : elle figure sur
    // la fiche mais ne se commande pas. Y ajouter une chaîne vide fabriquerait
    // une référence plausible et fausse — « DZ51F » au lieu de « DZ51F5 » —
    // qu'on enverrait au fournisseur sans s'en apercevoir.
    if (valeur.suffixeReference == null) return null;
    // Un jeton vide est légitime : le groupe n'ajoute rien parce que sa
    // contribution est déjà dans la référence de base.
    ref += valeur.suffixeReference;
  }
  return ref;
}

/** Le détail de la référence, pour l'expliquer à l'écran ou en administration. */
export function detailReference(produit, reponses = {}) {
  const comb = resoudreCombinaison(produit, reponses);
  const parts = etapesDe(produit)
    .filter((c) => c.rangReference != null)
    .sort((a, b) => a.rangReference - b.rangReference)
    .map((choix) => {
      const valeur = valeurRetenue(choix, reponses);
      return { choixNom: choix.nom, libelle: valeur?.libelle || null, jeton: valeur?.suffixeReference || "" };
    });
  return { base: comb?.referenceBase || null, parts, complete: assemblerReference(produit, reponses) };
}

/** Les choix retenus, sous forme calculable — ce que la ligne de commande garde. */
export function choixRetenus(produit, reponses = {}) {
  const out = {};
  for (const choix of etapesDe(produit)) {
    const rep = reponses[choix.cle];
    if (!estVide(rep)) out[choix.cle] = rep;
  }
  return out;
}

/** La version lisible des choix retenus, pour un devis ou une facture. */
export function libelleChoix(produit, reponses = {}) {
  return etapesDe(produit)
    .map((c) => (estVide(reponses[c.cle]) ? null : `${c.nom} : ${reponses[c.cle]}`))
    .filter(Boolean)
    .join(" · ");
}

/**
 * Le prix. Ferme quand la combinaison est résolue, « à partir de » sinon.
 * Le calcul lui-même ne vit qu'ici : prixLigne, comme partout ailleurs.
 */
export function prixDe(produit, reponses = {}, marge = 0) {
  const restantes = combinaisonsCompatibles(produit, reponses);
  if (!restantes.length) return { montant: null, ferme: false, combinaison: null, possibles: 0 };

  const comb = resoudreCombinaison(produit, reponses);
  if (comb) {
    return { montant: prixLigne(comb, marge), ferme: true, combinaison: comb, possibles: 1 };
  }
  let mini = null;
  for (const c of restantes) {
    const p = prixLigne(c, marge);
    if (p == null) continue;
    if (mini == null || p < mini) mini = p;
  }
  return { montant: mini, ferme: false, combinaison: null, possibles: restantes.length };
}

/**
 * Les visuels à montrer, compte tenu des finitions retenues.
 *
 * Un visuel rattaché à des valeurs ne s'affiche que si TOUTES sont retenues :
 * une photo qui montre un piétement noir et un plateau nebraska n'a rien à
 * faire sur un bureau blanc. Les visuels sans rattachement restent toujours.
 */
export function visuelsPour(produit, reponses = {}) {
  const retenues = new Set(
    etapesDe(produit)
      .map((c) => valeurRetenue(c, reponses))
      .filter(Boolean)
      .map((v) => v.id));

  const garde = (v) => {
    const ids = (v.valeurs || []).map((x) => x.valeurChoixId ?? x.id).filter(Boolean);
    return ids.length === 0 || ids.every((id) => retenues.has(id));
  };

  const ordre = { vignette: 0, galerie: 1, schema: 2, ambiance: 3 };
  return [...(produit?.visuels || [])]
    .filter(garde)
    .sort((a, b) => (ordre[a.role] ?? 9) - (ordre[b.role] ?? 9) || a.ordre - b.ordre);
}

/** Tout ce dont une ligne de panier, de devis ou de commande a besoin. */
export function identiteCommande(produit, reponses = {}, marge = 0) {
  const { montant, ferme, combinaison } = prixDe(produit, reponses, marge);
  return {
    vitrineId: produit?.id ?? null,
    combinaisonId: combinaison?.id ?? null,
    referenceComplete: assemblerReference(produit, reponses),
    fournisseur: produit?.gamme?.marque?.nom ?? null,
    choix: choixRetenus(produit, reponses),
    finition: libelleChoix(produit, reponses) || null,
    prixHT: ferme ? montant : null,
    ecoContribution: combinaison?.ecoContribution ?? 0,
  };
}

/**
 * Une ligne est-elle commandable ?
 * L'invariant du modèle : sans référence complète, on ne sait pas quoi
 * commander — et il vaut mieux l'apprendre ici que devant le bon de commande.
 */
export function commandable(produit, reponses = {}) {
  if (!produit) return { ok: false, motif: "produit introuvable" };
  if (prochaineEtape(produit, reponses)) return { ok: false, motif: "configuration incomplète" };
  const comb = resoudreCombinaison(produit, reponses);
  if (!comb) return { ok: false, motif: "aucune combinaison ne correspond" };
  if (comb.prixTarifHT == null) return { ok: false, motif: "prix absent du tarif" };
  // Un produit sans suffixe de référence se commande par sa référence de base :
  // c'est le cas des fiches dont le tarif ne décline pas les finitions.
  const participants = etapesDe(produit).filter((c) => c.rangReference != null);
  if (participants.length && !assemblerReference(produit, reponses)) {
    return { ok: false, motif: "référence fournisseur incomplète" };
  }
  return { ok: true, motif: null };
}
