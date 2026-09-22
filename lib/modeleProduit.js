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

// L extension est explicite : ce module est pur, et les scripts de prisma/
// le chargent directement avec node, qui ne devine pas les extensions.
import { prixLigne } from "./prixCatalogue.js";

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
 * Une finition tirée d'un nuancier est-elle encore permise ?
 *
 * Chez Sokoa, la catégorie de tissu est tarifaire — elle fixe le prix — et le
 * tissu lui-même est une finition. Les deux se tiennent par le nuancier : la
 * valeur « Tissu C » porte le nuancier C, et les quatre-vingt-cinq tissus qui
 * en viennent le portent aussi. Proposer un tissu de la catégorie B à qui a
 * payé la C fabriquerait une commande que le fournisseur refuserait.
 *
 * Le lien se fait par identifiant, jamais par le nom du nuancier : deux
 * gammes peuvent nommer « Grain » des nuanciers différents.
 *
 * Tant que la catégorie n'est pas répondue, tout reste ouvert : on ne ferme
 * rien avant d'avoir demandé.
 */
function palettePermise(produit, valeur, reponses) {
  const p = valeur?.palette?.id;
  if (!p) return true;                       // finition sans nuancier : rien à filtrer
  for (const c of choixCommandants(produit)) {
    // Un nuancier qu'AUCUNE valeur de ce choix ne désigne ne lui est pas
    // soumis. Sans cette réserve, un coloris de résille rattaché à son
    // nuancier — le Runner, chez Eman — disparaîtrait de la fiche dès la
    // catégorie de tissu choisie, puisque aucune catégorie ne désigne le
    // Runner. Un choix ne commande que ce qu'il sait nommer.
    if (!(c.valeurs || []).some((v) => v.palette?.id === p)) continue;
    const retenue = valeurCommandante(produit, c, reponses);
    if (retenue && retenue.palette?.id !== p) return false;
  }
  return true;
}

/** Les choix tarifaires dont les valeurs désignent un nuancier. */
function choixCommandants(produit) {
  return choixTarifaires(produit).filter((c) => (c.valeurs || []).some((v) => v.palette?.id));
}

/** Les nuanciers qu'un choix tarifaire de ce produit sait désigner. */
function nuanciersCommandes(produit) {
  const s = new Set();
  for (const c of choixCommandants(produit)) {
    for (const v of c.valeurs || []) if (v.palette?.id) s.add(v.palette.id);
  }
  return s;
}

/**
 * La valeur retenue d'un choix tarifaire — ou, à défaut, la seule encore
 * atteignable.
 *
 * Une étape sans véritable choix n'est jamais posée : la catégorie de tissu
 * d'un siège qui n'en offre qu'une resterait sans réponse pour toujours, et
 * les tissus des autres catégories resteraient proposés.
 */
function valeurCommandante(produit, choix, reponses) {
  const retenue = valeurRetenue(choix, reponses);
  if (retenue) return retenue;
  const atteignables = [...new Set(
    combinaisonsCompatibles(produit, reponses, choix.cle)
      .map((k) => k.valeurs?.[choix.cle])
      .filter((v) => !estVide(v)))];
  if (atteignables.length !== 1) return null;
  return (choix.valeurs || []).find((v) => v.libelle === atteignables[0]) || null;
}

/**
 * Les valeurs d'une finition encore proposables, compte tenu des réponses.
 *
 * La réponse du choix qu'on est en train de poser est écartée des exclusions :
 * quand on rouvre une question déjà répondue, la confronter à elle-même
 * écarterait justement la valeur retenue.
 */
function valeursFinitionOuvertes(produit, choix, reponses) {
  // Toutes les réponses déjà données, tarifaires comprises — pas seulement
  // les finitions. Page 241 du tarif Buronomic, quatre teintes de poignée
  // n'existent qu'en modèle design ; l'interdit associe donc une valeur
  // TARIFAIRE — « Poignées classiques » — à une finition. Sans les réponses
  // tarifaires ici, cette exclusion ne peut jamais se déclencher.
  //
  // Les exclusions déjà en base n'en sont pas dérangées : une exclusion ne
  // mord que si TOUTES ses valeurs sont retenues, et celles qui ne citent que
  // des finitions se comportent exactement comme avant.
  const dejaRetenues = etapesDe(produit)
    .filter((c) => c.cle !== choix.cle)
    .map((c) => valeurRetenue(c, reponses))
    .filter(Boolean)
    .map((v) => v.id);
  return (choix.valeurs || [])
    .filter((v) => palettePermise(produit, v, reponses))
    .filter((v) => !associationInterdite(produit, [...dejaRetenues, v.id]));
}

/**
 * La prochaine question à poser, avec les seules valeurs encore atteignables.
 * Rend null quand il n'y a plus rien à demander.
 *
 * Une étape sans véritable choix — une seule valeur possible — est sautée :
 * la poser ferait perdre un clic pour rien.
 */
/**
 * Ce choix habille-t-il un élément qu'AUCUNE combinaison encore possible ne
 * contient ? Alors il n'a rien à demander.
 *
 * Prudent par construction : tant qu'une seule combinaison possible porte
 * l'élément, la question reste. On ne retire jamais une question qui pourrait
 * encore servir.
 */
function elementHorsComposition(produit, choix, reponses = {}) {
  if (!choix?.element) return false;
  const possibles = combinaisonsCompatibles(produit, reponses);
  if (!possibles.length) return false;
  return !possibles.some((c) =>
    Array.isArray(c.elements) && c.elements.some((e) => e.cle === choix.element));
}

export function prochaineEtape(produit, reponses = {}, dejaTraites = new Set()) {
  // Les choix de finition que le composite tarifaire recouvre déjà : les
  // poser une seconde fois ne demanderait rien de neuf.
  const recouverts = choixRecouverts(produit);

  for (const choix of etapesDe(produit)) {
    if (dejaTraites.has(choix.cle)) continue;
    if (recouverts.has(choix.cle)) continue;

    // Une question déjà répondue est passée — SAUF si sa réponse n'est plus
    // permise. Changer de catégorie de tissu après avoir choisi son tissu
    // laisserait sinon une réponse que le fournisseur refuse, invisible à
    // l'écran parce que la question ne se repose jamais.
    if (!estVide(reponses[choix.cle])) {
      if (choix.nature !== "finition") continue;
      const retenue = valeurRetenue(choix, reponses);
      if (!retenue || palettePermise(produit, retenue, reponses)) continue;
      const valeurs = valeursFinitionOuvertes(produit, choix, reponses);
      if (!valeurs.length) continue;
      return { choix, valeurs, nature: "finition", perimee: true };
    }

    if (choix.nature === "tarifaire") {
      const possibles = combinaisonsCompatibles(produit, reponses, choix.cle);
      const atteignables = new Set(possibles.map((c) => c.valeurs?.[choix.cle]).filter((v) => !estVide(v)));
      if (atteignables.size < 2) continue;
      // L'ordre d'affichage est celui du choix, pas celui des combinaisons.
      const valeurs = (choix.valeurs || []).filter((v) => atteignables.has(v.libelle));
      return { choix, valeurs, nature: "tarifaire" };
    }

    // Une finition tirée d'un nuancier attend sa catégorie : la poser avant
    // montrerait les cent cinquante-sept tissus Sokoa d'un coup, pour en
    // retirer aussitôt les trois quarts. L'ordre d'affichage suffirait
    // presque, mais il se règle à la main et finirait par se dérégler.
    const commandes = nuanciersCommandes(produit);
    if ((choix.valeurs || []).some((v) => v.palette?.id && commandes.has(v.palette.id))
      && choixCommandants(produit).some((c) => !valeurCommandante(produit, c, reponses))) continue;

    // Sur une fiche composée, une finition qui habille un élément que la
    // composition n'a pas ne se demande pas : sans portes, le décor des
    // portes n'a pas d'objet. Tant que le choix des portes n'est pas fait,
    // les deux cas restent possibles et la question attend son tour.
    if (elementHorsComposition(produit, choix, reponses)) continue;

    // Une finition ne ferme rien, sauf ce qu'une exclusion interdit avec les
    // finitions déjà retenues, ou ce qu'un nuancier réserve à une autre
    // catégorie tarifaire.
    const valeurs = valeursFinitionOuvertes(produit, choix, reponses);
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

  // Chaque position doit se rattacher à UN choix de finition, et deux
  // positions ne peuvent pas se rattacher au même. Sans cette exigence, un
  // groupe qui contient par hasard les bonnes teintes rafle les deux
  // positions — chez l'armoire à rideaux Classif, « Portes et intérieur »
  // contient noir, aluminium et blanc, donc il « couvrait » aussi le
  // piétement, et le choix des portes disparaissait de la fiche.
  const groupes = choixFinition(produit);
  const correspond = (part, libelle) => {
    const k = nu(part);
    const kv = nu(libelle);
    if (!k || !kv) return false;
    return k === kv || k.startsWith(`${kv} `) || k.endsWith(` ${kv}`)
      || kv.startsWith(`${k} `) || kv.endsWith(` ${k}`);
  };
  const partsDe = (i) => [...new Set(morceaux.map((m) => m.parts[i]))];

  const couvrants = [];
  for (let i = 0; i < K; i += 1) {
    const parts = partsDe(i);
    couvrants.push(groupes
      .map((g, gi) => ({ g, gi }))
      .filter(({ g }) => parts.every((p) => (g.valeurs || []).some((v) => correspond(p, v.libelle))))
      .map(({ gi }) => gi));
  }

  // Un rattachement injectif, s'il en existe un.
  const attribue = new Array(K).fill(null);
  const chercher = (i, pris) => {
    if (i === K) return true;
    for (const gi of couvrants[i]) {
      if (pris.has(gi)) continue;
      pris.add(gi);
      attribue[i] = gi;
      if (chercher(i + 1, pris)) return true;
      pris.delete(gi);
      attribue[i] = null;
    }
    return false;
  };
  if (!couvrants.every((L) => L.length) || !chercher(0, new Set())) return null;

  const positions = [];
  for (let i = 0; i < K; i += 1) {
    const groupe = groupes[attribue[i]];
    const vues = new Map();
    for (const m of morceaux) {
      const part = m.parts[i];
      if (vues.has(part)) continue;
      // La teinte vient du groupe attribué à CETTE position, et d'aucun autre.
      const teinte = (groupe.valeurs || [])
        .filter((v) => correspond(part, v.libelle))
        .sort((a, b) => nu(b.libelle).length - nu(a.libelle).length)[0];
      vues.set(part, {
        part,
        libelle: teinte?.libelle || part.toLowerCase().replace(/^./, (c) => c.toUpperCase()),
        couleur: teinte?.couleur || null,
        imageUrl: teinte?.imageUrl || null,
        nomPiece: groupe.nom,
      });
    }
    positions.push({ nom: groupe.nom, valeurs: [...vues.values()] });
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
  // Une fiche composée n'a PAS de référence unique — elle en a quatre. Rendre
  // ici une concaténation fabriquerait une référence qui n'existe pas chez le
  // fournisseur, exactement ce que ce module refuse partout ailleurs. Les
  // appelants d'une fiche composée passent par elementsDe().
  if (estComposee(produit)) return null;
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

// ─────────────────────────────────────────────────────────────────────
// LES FICHES COMPOSÉES
//
// Page 241 du tarif Buronomic : « RANGEMENTS AVEC ALCÔVE à composer ». Le
// client configure UN produit, et la commande part en QUATRE références —
// une par élément, chacune avec son prix :
//
//   BH693 + S    structure   150,00 €
//   DZ07  + S S  alcôve      400,00 €
//   EH783 + N    portes      130,00 €
//   DX21  + 7S   poignées     25,00 €
//
// On aurait pu concaténer le tout dans une seule référence. On ne le fait
// pas : « BH693+S+DZ07+SS+EH783+N+DX21+7S » n'existe pas chez Buronomic, et
// docs/modele-produit.md pose l'invariant inverse — toute référence
// reconstruite doit se retrouver dans le tarif. Quatre lignes, quatre vraies
// références.
//
// La règle est la même qu'avant, appliquée une fois par élément :
//
//   référence de l'élément = element.referenceBase
//                          + Σ suffixeReference des choix de CET élément,
//                            dans l'ordre de leurs rangReference
//
// Un choix sans « element » appartient à l'élément principal — c'est ce qui
// fait que les fiches ordinaires traversent ce code sans le savoir.

/** Cette fiche se commande-t-elle en plusieurs références ? */
export function estComposee(produit) {
  return (produit?.combinaisons || []).some((c) => Array.isArray(c.elements) && c.elements.length > 1);
}

/**
 * Les éléments à commander, une fois la configuration faite.
 *
 * Rend [] tant que la combinaison n'est pas résolue. Un élément dont la
 * référence ne s'assemble pas porte `reference: null` — la fiche le montre
 * comme incomplet plutôt que de laisser croire qu'il est commandable.
 */
export function elementsDe(produit, reponses = {}) {
  const comb = resoudreCombinaison(produit, reponses);
  if (!comb) return [];

  const liste = Array.isArray(comb.elements) && comb.elements.length
    ? comb.elements
    : [{ cle: null, designation: produit?.nom || null, referenceBase: comb.referenceBase, prixTarifHT: comb.prixTarifHT }];

  const participants = etapesDe(produit)
    .filter((c) => c.rangReference != null)
    .sort((a, b) => a.rangReference - b.rangReference);

  return liste.map((el) => {
    let ref = el.referenceBase || null;
    const jetons = [];
    for (const choix of participants) {
      // Un choix sans élément sert la fiche entière : il n'appartient à
      // l'élément courant que si celui-ci est le principal.
      const sien = (choix.element ?? null) === (el.cle ?? null);
      if (!sien) continue;
      const valeur = valeurRetenue(choix, reponses);
      // Même règle qu'ailleurs : pas de référence plutôt qu'une fausse.
      if (!valeur || valeur.suffixeReference == null) { ref = null; break; }
      jetons.push({ choixNom: choix.nom, libelle: valeur.libelle, jeton: valeur.suffixeReference });
      ref += valeur.suffixeReference;
    }
    return {
      cle: el.cle ?? null,
      designation: el.designation || null,
      referenceBase: el.referenceBase || null,
      reference: ref,
      prixTarifHT: el.prixTarifHT ?? null,
      ecoContribution: el.ecoContribution ?? 0,
      jetons,
    };
  });
}

/** Les références à commander — une par élément. */
export function assemblerReferences(produit, reponses = {}) {
  return elementsDe(produit, reponses).map((e) => e.reference);
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
    // Une fiche composée pose plusieurs lignes : le panier, le devis et la
    // commande en font autant de LigneX reliées par ligneParenteId. Vide sur
    // une fiche ordinaire, qui garde son referenceComplete ci-dessus.
    elements: estComposee(produit) ? elementsDe(produit, reponses) : [],
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
  // Une fiche composée se commande si CHACUN de ses éléments se commande :
  // trois références sur quatre, c'est une composition qu'on ne peut pas
  // livrer.
  if (estComposee(produit)) {
    const elements = elementsDe(produit, reponses);
    const manquant = elements.find((e) => !e.reference);
    if (manquant) {
      return { ok: false, motif: `référence fournisseur incomplète — ${manquant.designation || manquant.cle}` };
    }
    return { ok: true, motif: null };
  }
  // Un produit sans suffixe de référence se commande par sa référence de base :
  // c'est le cas des fiches dont le tarif ne décline pas les finitions.
  const participants = etapesDe(produit).filter((c) => c.rangReference != null);
  if (participants.length && !assemblerReference(produit, reponses)) {
    return { ok: false, motif: "référence fournisseur incomplète" };
  }
  return { ok: true, motif: null };
}
