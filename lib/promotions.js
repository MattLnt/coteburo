import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Campagnes de promotion — l'onglet « Promotions » de l'admin.
//
// Elles ciblaient le modèle Produit, vide depuis la migration vers
// ProduitVitrine : créer une campagne n'avait donc plus aucun effet, nulle
// part. Elles visent désormais des vitrines et des catégories réelles.
//
// Une campagne peut aussi viser des fournisseurs, chacun à son taux :
// « −25 % Buronomic, −20 % Sokoa » dans une seule campagne, donc un seul
// bandeau. La remise générale (valeur / typeRemise) ne s'applique qu'aux
// catégories et aux fiches ciblées.
//
// À ne pas confondre avec ProduitVitrine.promoPct, la promo propre à une
// fiche. Les deux coexistent ; quand les deux s'appliquent, c'est le prix le
// plus bas qui l'emporte — jamais de cumul (voir appliquerPromoVitrine).

// Taux par fournisseur d'une campagne, nettoyés : { buronomic: 25, sokoa: 20 }.
export function remisesMarquesDe(campagne) {
  const brut = campagne?.remisesMarques;
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return {};
  const propre = {};
  for (const [slug, v] of Object.entries(brut)) {
    const n = Number(v);
    if (slug && Number.isFinite(n) && n > 0) propre[slug] = n;
  }
  return propre;
}

// Une campagne de code promo : la remise attend d'être réclamée au panier,
// elle ne touche pas aux prix du catalogue.
export function estCampagneCode(c) {
  return c?.modeRemise === "code" && !!c?.code;
}

// Une campagne remise-t-elle quelque chose ? Une remise générale sans cible,
// ou une cible sans remise, ne changent aucun prix.
//
// Un code promo échappe à la règle des cibles : son code EST sa cible, et sa
// remise porte sur le panier entier.
export function aUneRemise(c) {
  if (estCampagneCode(c)) return c.valeur > 0;
  const generale = c.valeur > 0 && ((c.categories || []).length > 0 || (c.vitrineIds || []).length > 0);
  return generale || Object.keys(c.remisesMarques || {}).length > 0;
}

// Campagnes en cours : actives et dans leur période.
// `cache` de React déduplique un appel pour la durée d'UNE requête. Plusieurs
// blocs d'une même page réclament ces valeurs — l'accueil demandait trois fois
// la marge et trois fois les campagnes, soit six allers-retours en base pour
// deux réponses. Elles sont forcément identiques dans un même rendu.
export const getCampagnesActives = cache(async () => {
  const now = new Date();
  // Une campagne qui finit « le 7 décembre » vaut tout le 7 décembre. Les
  // dates sont enregistrées au premier instant du jour : comparées telles
  // quelles, elles faisaient expirer la campagne la veille au soir.
  const debutDuJour = new Date(now);
  debutDuJour.setHours(0, 0, 0, 0);
  const [campagnes, marques] = await Promise.all([
    prisma.promotion.findMany({
      where: {
        actif: true,
        AND: [
          { OR: [{ dateDebut: null }, { dateDebut: { lte: now } }] },
          { OR: [{ dateFin: null }, { dateFin: { gte: debutDuJour } }] },
        ],
      },
      include: { vitrines: { select: { vitrineId: true } } },
    }),
    // Les noms des fournisseurs, pour les libellés (« −20 % Sokoa »).
    prisma.marque.findMany({ select: { slug: true, nom: true } }),
  ]);
  const nomMarque = Object.fromEntries(marques.map((m) => [m.slug, m.nom]));

  // Forme allégée, sérialisable, utilisable par les fonctions pures de prix.
  return campagnes.map((c) => {
    const remisesMarques = remisesMarquesDe(c);
    return {
      id: c.id,
      nom: c.nom,
      typeRemise: c.typeRemise,
      valeur: c.valeur,
      // Message du bandeau, rédigé avec la campagne.
      messageBandeau: c.messageBandeau || null,
      afficherBandeau: c.afficherBandeau !== false,
      // « auto » : la remise est déduite des prix du catalogue. « code » : elle
      // attend que le client tape son code au panier (voir lib/codePromo.js).
      modeRemise: c.modeRemise || "auto",
      code: c.code || null,
      categories: Array.isArray(c.categories) ? c.categories : [],
      remisesMarques,
      marques: Object.entries(remisesMarques).map(([slug, pct]) => ({ slug, nom: nomMarque[slug] || slug, pct })),
      vitrineIds: c.vitrines.map((v) => v.vitrineId),
    };
  });
});

// Slug de la marque d'une fiche, telle que les requêtes la chargent : via sa
// gamme (gamme.marque.slug), ou posé à plat (marqueSlug) quand la gamme a été
// lue à part.
export function marqueSlugDeVitrine(vitrine) {
  return vitrine?.gamme?.marque?.slug || vitrine?.marqueSlug || null;
}

// Campagnes qui visent une vitrine donnée, chacune ramenée au taux qui la
// concerne : la remise générale si la fiche est ciblée nommément ou par une
// catégorie, le taux du fournisseur si sa marque l'est. Une même campagne
// peut sortir deux fois ; appliquerPromoVitrine garde le prix le plus bas.
// La vitrine doit porter ses `categories` (avec leur slug) et sa marque
// (voir marqueSlugDeVitrine).
export function campagnesPourVitrine(vitrine, campagnes = []) {
  if (!vitrine || !campagnes.length) return [];
  const slugs = (vitrine.categories || []).map((c) => c?.slug).filter(Boolean);
  const marque = marqueSlugDeVitrine(vitrine);
  const resultat = [];
  for (const c of campagnes) {
    // Une campagne à code ne touche à AUCUN prix du catalogue : sa remise
    // n'existe qu'au panier, quand le client l'a réclamée. Sans cette ligne,
    // le code serait déjà déduit avant d'être saisi — et saisi, il ne
    // changerait plus rien.
    if (estCampagneCode(c)) continue;
    if (c.valeur > 0 && (c.vitrineIds.includes(vitrine.id) || c.categories.some((s) => slugs.includes(s)))) {
      resultat.push(c);
    }
    const pct = marque ? (c.remisesMarques || {})[marque] : null;
    if (pct > 0) resultat.push({ ...c, typeRemise: "pourcentage", valeur: pct, marqueVisee: marque });
  }
  return resultat;
}

// Adresse du catalogue où le client retrouve ce que vise une campagne : les
// produits d'un fournisseur si elle n'en vise qu'un, sinon toutes les promos.
export function lienCampagne(campagne) {
  if (!campagne || !aUneRemise(campagne)) return null;
  // Un code promo ne remise aucun prix au catalogue : le filtre « en promotion »
  // ne montrerait rien. On envoie au catalogue entier, qu'il y a tout intérêt
  // à parcourir avant de saisir le code au panier.
  if (estCampagneCode(campagne)) return "/catalogue";
  const marques = campagne.marques || [];
  const generale = campagne.valeur > 0 && ((campagne.categories || []).length || (campagne.vitrineIds || []).length);
  if (marques.length === 1 && !generale) return `/catalogue?marque=${encodeURIComponent(marques[0].slug)}&promo=1`;
  return "/catalogue?promo=1";
}
