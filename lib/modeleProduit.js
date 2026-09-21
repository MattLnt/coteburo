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
  // Les choix de finition que le composite tarifaire recouvre déjà : les
  // poser une seconde fois ne demanderait rien de neuf.
  const recouverts = choixRecouverts(produit);

  for (const choix of etapesDe(produit)) {
    if (!estVide(reponses[choix.cle]) || dejaTraites.has(choix.cle)) continue;
    if (recouverts.has(choix.cle)) continue;

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

const nu = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

/**
 * Décompose un choix tarifaire dont les valeurs sont des libellés composites.
 *
 * Trente-quatre fiches posent une question tarifaire « Finition » dont chaque
 * valeur agrège plusieurs pièces — « NOIR METAL / NEBRASKA / VERT EAU - VERT
 * EAU » — alors que les mêmes teintes existent à côté, en choix de finition
 * avec leurs couleurs. Le client se voyait demander deux fois la même chose,
 * dont une fois en charabia et sans couleurs.
 *
 * On rend ici, pour chaque position du libellé, la liste des teintes lisibles
 * avec leur couleur. L'écran pose alors UNE question par pièce, et recompose
 * la valeur tarifaire à partir des réponses.
 *
 * Rend null si la décomposition n'est pas franche : mieux vaut le libellé brut
 * qu'un découpage approximatif.
 */
export function decomposerComposite(choix, produit) {
  if (!choix || choix.nature !== "tarifaire") return null;
  const valeurs = choix.valeurs || [];
  if (valeurs.length < 2) return null;

  const morceaux = valeurs.map((v) => ({
    valeur: v,
    parts: v.libelle.split(/\s+\/\s+|\s+-\s+/).map((s) => s.trim()).filter(Boolean),
  }));
  const K = morceaux[0].parts.length;
  if (K < 2 || morceaux.some((m) => m.parts.length !== K)) return null;

  // Les teintes connues du produit, pour retrouver une couleur et un libellé
  // propre — « NOIR METAL » désigne le « Noir » du piétement.
  const connues = [];
  for (const c of choixFinition(produit)) {
    for (const v of c.valeurs || []) connues.push({ ...v, choixNom: c.nom });
  }
  const teinteDe = (part) => {
    const k = nu(part);
    let meilleure = null;
    for (const v of connues) {
      const kv = nu(v.libelle);
      if (!kv) continue;
      const ok = k === kv || k.startsWith(`${kv} `) || k.endsWith(` ${kv}`);
      if (ok && (!meilleure || kv.length > nu(meilleure.libelle).length)) meilleure = v;
    }
    return meilleure;
  };

  const positions = [];
  for (let i = 0; i < K; i += 1) {
    const vues = new Map();
    for (const m of morceaux) {
      const part = m.parts[i];
      if (vues.has(part)) continue;
      const teinte = teinteDe(part);
      vues.set(part, {
        part,
        libelle: teinte?.libelle || part.toLowerCase().replace(/^./, (c) => c.toUpperCase()),
        couleur: teinte?.couleur || null,
        imageUrl: teinte?.imageUrl || null,
        nomPiece: teinte?.choixNom || null,
      });
    }
    positions.push({
      // Le nom de la pièce vient des choix de finition quand il est connu ;
      // sinon on numérote plutôt que d'inventer.
      nom: [...vues.values()][0]?.nomPiece || `Partie ${i + 1}`,
      valeurs: [...vues.values()],
    });
  }

  // Une position dont toutes les valeurs sont identiques ne fait pas question.
  const utiles = positions.filter((p) => p.valeurs.length > 1);
  if (!utiles.length) return null;

  return {
    positions,
    utiles,
    /** Retrouve la valeur composite correspondant à un choix par position. */
    recomposer(parPosition) {
      const m = morceaux.find((x) =>
        x.parts.every((part, i) => parPosition[i] == null || parPosition[i] === part));
      return m ? m.valeur.libelle : null;
    },
    /** Les parts encore atteignables à une position, vu les autres réponses. */
    atteignables(i, parPosition, libellesPossibles) {
      const possibles = new Set(libellesPossibles);
      const out = new Set();
      for (const m of morceaux) {
        if (!possibles.has(m.valeur.libelle)) continue;
        const compatible = m.parts.every((part, j) => j === i || parPosition[j] == null || parPosition[j] === part);
        if (compatible) out.add(m.parts[i]);
      }
      return out;
    },
  };
}

/**
 * Les choix de finition qu'un composite tarifaire recouvre déjà.
 *
 * Quand la question tarifaire porte « NOIR METAL / NEBRASKA », les choix
 * « Piétement métal » et « Plateau » ne disent rien de plus : ils servent à
 * la lire, pas à la poser une seconde fois.
 */
export function choixRecouverts(produit) {
  const recouverts = new Set();
  for (const choix of choixTarifaires(produit)) {
    const d = decomposerComposite(choix, produit);
    if (!d) continue;
    for (const p of d.positions) {
      for (const v of p.valeurs) {
        if (!v.nomPiece) continue;
        const c = choixFinition(produit).find((x) => x.nom === v.nomPiece);
        if (c) recouverts.add(c.cle);
      }
    }
  }
  return recouverts;
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

/**
 * Cette question fait-elle bouger le prix, ICI, compte tenu de ce qui est
 * déjà répondu ?
 *
 * Un choix tarifaire ne coûte pas toujours quelque chose. L'armoire à rideaux
 * Classif facture certaines finitions, mais pas à toutes les dimensions :
 * annoncer « agit sur le prix » quand les cinq pastilles mènent au même
 * montant, c'est mentir au client sur ce qu'il est en train de décider.
 *
 * On rend le prix minimal atteignable par valeur, et s'ils sont tous égaux,
 * la question ne coûte rien.
 */
export function impactPrix(produit, etape, reponses = {}, marge = 0) {
  if (!etape) return { varie: false, parValeur: new Map() };
  if (etape.nature !== "tarifaire") return { varie: false, parValeur: new Map() };

  const parValeur = new Map();
  for (const v of etape.valeurs) {
    const { montant } = prixDe(produit, { ...reponses, [etape.choix.cle]: v.libelle }, marge);
    parValeur.set(v.libelle, montant);
  }
  const montants = [...parValeur.values()].filter((x) => x != null);
  const varie = new Set(montants).size > 1;
  return { varie, parValeur };
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
  // À quel choix appartient chaque valeur, et laquelle est retenue pour ce
  // choix. Un visuel n'est écarté que s'il CONTREDIT une réponse déjà donnée.
  const choixDe = new Map();
  const retenuePar = new Map();
  for (const c of etapesDe(produit)) {
    for (const v of c.valeurs || []) choixDe.set(v.id, c.cle);
    const r = valeurRetenue(c, reponses);
    if (r) retenuePar.set(c.cle, r.id);
  }

  const garde = (v) => {
    const ids = (v.valeurs || []).map((x) => x.valeurChoixId ?? x.id).filter(Boolean);
    if (!ids.length) return true;
    return ids.every((id) => {
      const cle = choixDe.get(id);
      // Rattaché à une valeur qu'on ne connaît pas, ou à un choix encore sans
      // réponse : le visuel reste. Avant de choisir, la galerie entière doit
      // se voir — exiger que toutes les teintes soient retenues n'en laissait
      // que trois sur vingt et une.
      if (!cle || !retenuePar.has(cle)) return true;
      return retenuePar.get(cle) === id;
    });
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
