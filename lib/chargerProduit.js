// lib/chargerProduit.js — charger un produit du modèle à choix, une fois.
//
// Le pendant impur de lib/modeleProduit.js : celui-ci parle à la base, celui-là
// raisonne. La fiche, le panier, le devis et le paiement passent tous par ici,
// pour que tous voient le même produit.
//
// CE QUE CE MODULE NE FAIT PAS
//   Il ne calcule aucun prix et ne résout aucune étape. Tout cela est dans
//   lib/modeleProduit.js, qui est pur et tourne aussi bien côté navigateur.
//   Séparer les deux est ce qui permet au serveur de refaire, à la commande,
//   exactement le calcul que le client a vu.

import { prisma } from "./prisma";

// La forme complète d'un produit configurable. Elle tient en une requête :
// les combinaisons d'un produit se comptent en dizaines depuis que la finition
// est sortie du prix, et les charger toutes évite un aller-retour par étape.
const FORME = {
  id: true,
  nom: true,
  slug: true,
  descriptif: true,
  publie: true,
  venteSurDevis: true,
  sectionsDevis: true,
  prixAPartir: true,
  gamme: {
    select: {
      id: true, nom: true, slug: true, venteSurDevis: true,
      marque: { select: { nom: true, slug: true } },
    },
  },
  choix: {
    orderBy: { ordre: "asc" },
    select: {
      id: true, cle: true, nom: true, nature: true, rendu: true,
      ordre: true, rangReference: true, obligatoire: true,
      valeurs: {
        orderBy: { ordre: "asc" },
        select: {
          id: true, libelle: true, couleur: true, imageUrl: true,
          suffixeReference: true, supplementHT: true, ordre: true,
          // La couleur et la pastille s'héritent du modèle de nuancier : la
          // valeur ne porte que ce qui diffère. C'est ce lien qui empêche les
          // teintes de se perdre à chaque refonte.
          modele: { select: { id: true, nom: true, couleur: true, imageUrl: true } },
          palette: { select: { id: true, nom: true } },
        },
      },
    },
  },
  // Une combinaison ne porte QUE le tarif fournisseur : ni prix de vente, ni
  // verrou. Le catalogue reconstruit n'en employait aucun — zéro sur sept
  // mille trois cent quatre-vingt-dix — et un prix de vente stocké finit
  // toujours par diverger du panier. prixLigne s'en accommode : sans verrou
  // ni prix de vente, il applique la marge au tarif, ce qu'on veut ici.
  combinaisons: {
    select: {
      id: true, valeurs: true, prixTarifHT: true,
      ecoContribution: true, poids: true, ean: true,
      referenceBase: true, pageCatalogue: true, ancienId: true,
    },
  },
  exclusionsFinition: { select: { id: true, valeurs: true } },
  visuels: {
    orderBy: { ordre: "asc" },
    select: {
      id: true, url: true, role: true, ordre: true, recadre: true,
      valeurs: { select: { valeurChoixId: true } },
    },
  },
};

/**
 * Résout l'héritage des nuanciers : une valeur sans couleur ni pastille prend
 * celles de son modèle. Fait ici, une fois, plutôt que dans chaque affichage.
 */
function heriter(produit) {
  if (!produit) return produit;
  for (const choix of produit.choix || []) {
    for (const valeur of choix.valeurs || []) {
      if (valeur.modele) {
        if (!valeur.couleur) valeur.couleur = valeur.modele.couleur;
        if (!valeur.imageUrl) valeur.imageUrl = valeur.modele.imageUrl;
      }
      valeur.paletteNom = valeur.palette?.nom ?? null;
    }
  }
  return produit;
}

/** Un produit par son identifiant. */
export async function chargerProduit(id) {
  if (!id) return null;
  return heriter(await prisma.produitVitrine.findUnique({ where: { id }, select: FORME }));
}

/** Un produit par sa gamme et son slug, comme l'appelle une adresse publique. */
export async function chargerProduitParSlug(gammeSlug, slug) {
  if (!gammeSlug || !slug) return null;
  const gamme = await prisma.gamme.findUnique({ where: { slug: gammeSlug }, select: { id: true } });
  if (!gamme) return null;
  return heriter(await prisma.produitVitrine.findUnique({
    where: { gammeId_slug: { gammeId: gamme.id, slug } },
    select: FORME,
  }));
}

/**
 * Plusieurs produits d'un coup, pour un panier ou un devis.
 * Le serveur refait le calcul sur ces objets-là, jamais sur ce que le
 * navigateur lui a envoyé.
 */
export async function chargerProduits(ids = []) {
  const uniques = [...new Set(ids.filter(Boolean))];
  if (!uniques.length) return new Map();
  const L = await prisma.produitVitrine.findMany({ where: { id: { in: uniques } }, select: FORME });
  return new Map(L.map((p) => [p.id, heriter(p)]));
}

/** Un produit est-il vendu sur devis ? La gamme l'emporte sur la fiche. */
export const surDevis = (produit) => !!(produit?.gamme?.venteSurDevis || produit?.venteSurDevis);
