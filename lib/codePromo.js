// lib/codePromo.js — le seul endroit qui dit si un code promo vaut quelque chose.
//
// Un code est une campagne (model Promotion) dont modeRemise vaut "code" :
// elle ne touche pas aux prix du catalogue, elle attend que le client la
// réclame au panier. Sa remise s'applique au SOUS-TOTAL HT du panier entier,
// et se CUMULE avec les prix déjà remisés par les campagnes automatiques —
// c'est ce qu'un client attend d'un code, et c'est assumé.
//
// Le panier affiche, le paiement facture : les deux passent par ici, donc ils
// ne peuvent pas annoncer deux montants différents. La partie pure (pas de
// base) sert aussi au navigateur, qui recalcule la remise quand une quantité
// change, sans rappeler le serveur.

import { prisma } from "@/lib/prisma";

// ─────────── Partie PURE, utilisable côté navigateur ───────────

// Le code tel qu'on le compare : majuscules, sans espaces ni accents de
// frappe. « bienvenue10 », « BIENVENUE 10 » et « Bienvenue10 » sont le même
// code — la casse ne doit pas décider si une remise s'applique.
export function normaliserCode(brut) {
  return String(brut || "").trim().toUpperCase().replace(/\s+/g, "");
}

function arrondir2(n) {
  return Math.round(n * 100) / 100;
}

// Ce que le code retire d'un sous-total HT. Jamais plus que le sous-total :
// une remise ne rend pas d'argent.
export function remiseDuCode(campagne, sousTotalHT) {
  if (!campagne || !(sousTotalHT > 0)) return 0;
  const valeur = Number(campagne.valeur) || 0;
  if (valeur <= 0) return 0;
  const brut = campagne.typeRemise === "montant"
    ? valeur
    : sousTotalHT * (valeur / 100);
  return arrondir2(Math.min(Math.max(brut, 0), sousTotalHT));
}

// Libellé court du code, pour la ligne du récapitulatif : « −10 % » ou « −50 € ».
export function libelleRemise(campagne) {
  if (!campagne) return "";
  return campagne.typeRemise === "montant" ? `−${campagne.valeur} €` : `−${campagne.valeur} %`;
}

// ─────────── Partie SERVEUR ───────────

// Fin de journée : une date de fin saisie « 7 décembre » vaut jusqu'au
// 7 décembre au soir, pas jusqu'à son premier instant. Sans cela, un code
// valable un seul jour expirait avant d'avoir servi.
export function finDeJournee(d) {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

// Pourquoi un code ne s'applique pas — en français, tel quel pour le client.
// Un code inconnu et un code expiré donnent le même message : inutile
// d'apprendre à qui cherche qu'un code existe mais qu'il est périmé.
const INCONNU = "Ce code promo n'est pas valable.";

// Vérifie un code contre la base et contre un panier donné.
//
//   sousTotalHT : le sous-total du panier, remises catalogue déjà déduites.
//   email       : celle du client, pour le garde-fou « une fois par client ».
//                 Facultative au panier (personne n'est encore identifié),
//                 obligatoire au paiement.
//
// Renvoie { ok: true, campagne, remise, code } ou { ok: false, erreur }.
export async function verifierCodePromo({ code, sousTotalHT, email } = {}) {
  const propre = normaliserCode(code);
  if (!propre) return { ok: false, erreur: "Saisissez un code." };

  const campagne = await prisma.promotion.findUnique({ where: { code: propre } });
  if (!campagne || campagne.modeRemise !== "code") return { ok: false, erreur: INCONNU };
  if (!campagne.actif) return { ok: false, erreur: INCONNU };

  const now = new Date();
  if (campagne.dateDebut && new Date(campagne.dateDebut) > now) {
    return { ok: false, erreur: "Ce code n'est pas encore valable." };
  }
  if (campagne.dateFin && finDeJournee(campagne.dateFin) < now) {
    return { ok: false, erreur: "Ce code promo a expiré." };
  }
  if (!(Number(campagne.valeur) > 0)) return { ok: false, erreur: INCONNU };

  // Montant minimum de commande.
  if (campagne.codeMinimumHT && sousTotalHT != null && sousTotalHT < campagne.codeMinimumHT) {
    const manque = arrondir2(campagne.codeMinimumHT - sousTotalHT);
    return {
      ok: false,
      erreur: `Ce code est valable à partir de ${campagne.codeMinimumHT.toLocaleString("fr-FR")} € HT d'achat — il vous manque ${manque.toLocaleString("fr-FR")} €.`,
    };
  }

  // Nombre total d'utilisations. Le compteur se lit sur les commandes PAYÉES :
  // un panier abandonné ne consomme pas une place.
  if (campagne.codeMaxUtilisations) {
    const utilisees = await prisma.commande.count({ where: { codePromo: propre, paye: true } });
    if (utilisees >= campagne.codeMaxUtilisations) {
      return { ok: false, erreur: "Ce code promo a atteint son nombre d'utilisations." };
    }
  }

  // Une seule fois par client. Contournable avec une autre adresse, mais
  // arrête l'usage répété — c'est ce que promet « première commande ».
  if (campagne.codeUneFoisParClient && email) {
    const deja = await prisma.commande.count({
      where: { codePromo: propre, paye: true, email: { equals: email.trim(), mode: "insensitive" } },
    });
    if (deja > 0) return { ok: false, erreur: "Ce code a déjà été utilisé avec cette adresse e-mail." };
  }

  return {
    ok: true,
    code: propre,
    campagne,
    remise: remiseDuCode(campagne, sousTotalHT ?? 0),
  };
}
