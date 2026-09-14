// lib/prixCatalogue.js — le seul endroit où naît un prix de vente.
//
// Module PUR : aucun accès base, donc utilisable côté serveur comme côté
// navigateur. C'est la condition pour que la carte du catalogue, la fiche, le
// panier, le devis et le paiement affichent le même montant. Toute la lecture
// base (marge des Réglages, chargement des vitrines) reste dans lib/catalogue.js.
//
// Règles, valables partout sans exception :
//
// 1. Ligne VERROUILLÉE → le prix de vente saisi, figé, quelle que soit la marge.
// 2. Sinon → tarif fournisseur × (1 + marge), recalculé à la volée : changer la
//    marge dans les Réglages fait bouger tout le catalogue instantanément.
// 3. Un montant NÉGATIF (minoration) échappe à la marge. Le fournisseur déduit
//    une somme fixe, on déduit la même ; la multiplier par la marge raboterait
//    la remise consentie.
// 4. Zéro n'est pas un prix : on retombe sur la valeur suivante.

export function nombreOuNull(v) {
  if (v === "" || v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

function arrondir2(n) {
  return Math.round(n * 100) / 100;
}

// Applique la marge à un tarif fournisseur, en respectant la règle 3.
function appliquerMarge(tarif, marge) {
  return tarif < 0 ? tarif : arrondir2(tarif * (1 + (marge ?? 0)));
}

// Prix d'une LIGNE de déclinaison (prixTarifHT / prixVenteHT / prixVerrouille).
export function prixLigne(ligne, marge) {
  if (!ligne) return null;
  const vente = nombreOuNull(ligne.prixVenteHT);
  if (ligne.prixVerrouille) return vente;
  const tarif = nombreOuNull(ligne.prixTarifHT);
  // Pas de tarif renseigné : on retombe sur le prix de vente déjà saisi plutôt
  // que d'afficher un prix nul.
  if (tarif == null) return vente;
  return appliquerMarge(tarif, marge);
}

// Prix d'une vitrine en mode « prix unique » (sansDeclinaisons).
export function prixUnitaire(vitrine, marge) {
  if (!vitrine) return null;
  const vente = nombreOuNull(vitrine.prixUnitaireHT);
  if (vitrine.prixUnitaireVerrouille && vente != null && vente !== 0) return vente;
  const tarif = nombreOuNull(vitrine.prixUnitaireTarifHT);
  if (tarif != null && tarif !== 0) return appliquerMarge(tarif, marge);
  if (vente != null && vente !== 0) return vente;
  return null;
}

// Promotion propre à la fiche (promoPct + période). Ne s'applique jamais à un
// montant négatif : réduire une minoration n'aurait pas de sens.
// Deux remises peuvent viser le même article : celle de la fiche (promoPct) et
// celle d'une campagne. On retient LA MEILLEURE POUR LE CLIENT, jamais les deux
// cumulées — additionner deux remises donne vite des prix qu'on ne voulait pas.
//
// `campagnes` est la liste déjà filtrée pour cette vitrine (campagnesPourVitrine).
// Elle est portée par la vitrine si l'appelant l'y a attachée, ce qui évite de
// passer le paramètre à travers toute la chaîne de prix.
export function appliquerPromoVitrine(vitrine, prixBase, campagnes) {
  const aucune = { enPromo: false, prixFinal: prixBase, prixBase, promoPct: null, origine: null };
  // Une minoration ne se remise pas : réduire une déduction n'a pas de sens.
  if (prixBase == null || prixBase < 0) return aucune;

  const candidats = [];

  // 1. Promo propre à la fiche, si elle est dans sa période.
  const pct = vitrine?.promoPct;
  if (pct) {
    const now = new Date();
    const debutOk = !vitrine.promoDebut || new Date(vitrine.promoDebut) <= now;
    const finOk = !vitrine.promoFin || new Date(vitrine.promoFin) >= now;
    if (debutOk && finOk) {
      candidats.push({ prixFinal: arrondir2(prixBase * (1 - pct / 100)), promoPct: pct, origine: "fiche" });
    }
  }

  // 2. Campagnes. Leur période est déjà vérifiée au chargement.
  const liste = campagnes ?? vitrine?.campagnes ?? [];
  for (const c of liste) {
    const prixFinal = c.typeRemise === "montant"
      ? arrondir2(prixBase - c.valeur)
      : arrondir2(prixBase * (1 - c.valeur / 100));
    if (prixFinal >= prixBase) continue;
    const promoPct = Math.round((1 - prixFinal / prixBase) * 100);
    candidats.push({ prixFinal, promoPct, origine: c.nom });
  }

  if (!candidats.length) return aucune;

  const meilleur = candidats.reduce((a, b) => (b.prixFinal < a.prixFinal ? b : a));
  // Une remise qui ne remise rien, ou qui passerait sous zéro, n'en est pas une.
  if (meilleur.prixFinal >= prixBase) return aucune;

  return {
    enPromo: true,
    prixFinal: Math.max(0, meilleur.prixFinal),
    prixBase,
    promoPct: meilleur.promoPct,
    origine: meilleur.origine,
  };
}

// ─────────── LA fonction ───────────
//
// Prix d'un article précis : une vitrine, éventuellement une déclinaison.
// Serveur (getCarteFront), paiement (checkout) et devis passent tous par ici,
// ce qui rend impossible qu'ils divergent.
//
// Renvoie { prixHT, prixBase, enPromo, promoPct, surDevis, motif }.
// motif est null quand le prix est sûr ; sinon il dit pourquoi il ne l'est pas.
export function prixVitrine(vitrine, { declinaisonId = null, surDevis = false, marge = 0 } = {}) {
  if (!vitrine) {
    return { prixHT: null, prixBase: null, enPromo: false, promoPct: null, surDevis, motif: "vitrine introuvable" };
  }

  if (surDevis) {
    // Sur devis : le montant n'est qu'un ordre de grandeur, il n'engage rien.
    const indicatif = vitrine.prixAPartir ?? null;
    return { prixHT: indicatif, prixBase: indicatif, enPromo: false, promoPct: null, surDevis: true, motif: null };
  }

  let base = null;
  let motif = null;

  if (vitrine.sansDeclinaisons || !declinaisonId) {
    base = prixUnitaire(vitrine, marge);
    if (base == null) motif = "aucun prix unique en base";
  } else {
    const lignes = Array.isArray(vitrine.declinaisons) ? vitrine.declinaisons : [];
    const ligne = lignes.find((d) => d.id === declinaisonId);
    if (!ligne) motif = "déclinaison disparue du catalogue";
    else {
      base = prixLigne(ligne, marge);
      if (base == null) motif = "aucun prix sur cette déclinaison";
    }
  }

  if (base == null) {
    return { prixHT: null, prixBase: null, enPromo: false, promoPct: null, surDevis: false, motif };
  }

  const promo = appliquerPromoVitrine(vitrine, base);
  return { prixHT: promo.prixFinal, prixBase: promo.prixBase, enPromo: promo.enPromo, promoPct: promo.promoPct, surDevis: false, motif: null };
}

// Tous les prix publics d'une fiche, promo comprise, prêts à afficher.
//
// C'est ce que le serveur envoie au navigateur : celui-ci ne calcule plus rien,
// il choisit une déclinaison et lit son montant. Sans cela, la fiche appliquait
// sa propre arithmétique et ignorait la promo, pendant que le paiement, lui,
// la déduisait — deux montants pour le même article.
//
// prixHT est ce que le client paie ; prixBase le montant avant promo, pour
// l'affichage barré.
export function prixPublicsVitrine(vitrine, { surDevis = false, marge = 0 } = {}) {
  // Les déclinaisons servent AUSSI à configurer le produit, pas seulement à le
  // tarifer : une fiche sur devis les garde, sinon elle perd ses questions
  // (prochainAxe n'a plus aucune valeur à proposer) et devient inconfigurable.
  // Seule la promo ne s'applique pas : sur devis, rien n'est engageant.
  const declinaisons = vitrine.sansDeclinaisons
    ? []
    : (Array.isArray(vitrine.declinaisons) ? vitrine.declinaisons : []).map((d) => {
        const base = prixLigne(d, marge);
        const promo = surDevis
          ? { prixFinal: base, prixBase: base, enPromo: false, promoPct: null }
          : appliquerPromoVitrine(vitrine, base);
        return {
          id: d.id,
          valeurs: d.valeurs,
          prixHT: promo.prixFinal,
          prixBase: promo.prixBase,
          enPromo: promo.enPromo,
          promoPct: promo.promoPct,
        };
      });

  if (surDevis) {
    // Le prix affiché reste le « à partir de » indicatif saisi par l'admin.
    const indicatif = vitrine.prixAPartir ?? null;
    return { prixMini: indicatif, prixMiniBase: indicatif, enPromo: false, promoPct: null, declinaisons };
  }

  // « À partir de » : le plus bas des montants avant promo, puis la promo par
  // dessus — pour que le barré et le prix final restent cohérents.
  const base = vitrine.sansDeclinaisons
    ? prixUnitaire(vitrine, marge)
    : (() => {
        const xs = declinaisons.map((l) => l.prixBase).filter((x) => x != null && x > 0);
        return xs.length ? Math.min(...xs) : null;
      })();

  const promo = appliquerPromoVitrine(vitrine, base);
  return {
    prixMini: promo.prixFinal,
    prixMiniBase: promo.prixBase,
    enPromo: promo.enPromo,
    promoPct: promo.promoPct,
    declinaisons,
  };
}

// Résout les prix des déclinaisons d'une vitrine (pour l'affichage d'une liste).
export function resoudrePrixDeclinaisons(declinaisons, marge) {
  return (Array.isArray(declinaisons) ? declinaisons : []).map((d) => ({
    ...d,
    prixVenteHT: prixLigne(d, marge),
  }));
}

// Vitrine « prête pour le prix » : déclinaisons résolues via la marge.
// À appeler avant calculerPrixMini, qui attend des montants déjà résolus.
export function resoudreVitrinePourPrix(vitrine, marge) {
  return { ...vitrine, declinaisons: resoudrePrixDeclinaisons(vitrine.declinaisons, marge) };
}

// Prix « à partir de » d'une fiche : le plus bas de ses déclinaisons, ou son
// prix unique. Attend une vitrine passée par resoudreVitrinePourPrix.
export function calculerPrixMini(vitrine, surDevis, marge = null) {
  if (surDevis) return vitrine.prixAPartir ?? null;
  if (vitrine.sansDeclinaisons) return prixUnitaire(vitrine, marge);

  const prix = (Array.isArray(vitrine.declinaisons) ? vitrine.declinaisons : [])
    .map((d) => nombreOuNull(d.prixVenteHT))
    .filter((x) => x != null && x > 0);

  return prix.length ? Math.min(...prix) : null;
}
