import { prisma } from "@/lib/prisma";
import { getMargeGlobale } from "@/lib/catalogue";
import { prixLigne, prixUnitaire } from "@/lib/prixCatalogue";

// Catalogue à plat pour les sélecteurs de l'admin — panneau « Ajouter un
// produit » du chiffrage de devis, et choix des produits liés d'une fiche.
//
// Tout est chargé d'un coup puis filtré côté navigateur : instantané, et le
// volume reste raisonnable (quelques centaines de fiches).
//
// CE QU'IL LIT
//   Les combinaisons et les questions tarifaires du modèle à choix. Il lisait
//   les champs JSON `declinaisons` et `axesDeclinaisons`, que la migration a
//   laissés en place : un devis s'y chiffrait donc d'après des prix figés au
//   jour de la reprise, sans que rien ne le dise.
//
// `exclureOptions` écarte les accessoires — les fiches rangées dans une
// catégorie marquée estOption. Un devis peut légitimement contenir un
// accotoir ; une suggestion « Vous aimerez aussi » non.
export async function chargerCatalogueAdmin({ exclureOptions = false } = {}) {
  const [vitrines, categories, marges] = await Promise.all([
    prisma.produitVitrine.findMany({
      where: { publie: true, gamme: { publie: true } },
      orderBy: { nom: "asc" },
      select: {
        id: true, nom: true, slug: true, images: true, imageUrl: true,
        prixUnitaireHT: true, prixUnitaireTarifHT: true, prixUnitaireVerrouille: true,
        gamme: { select: { id: true, nom: true, marque: { select: { nom: true } } } },
        categories: { select: { id: true, slug: true, nom: true, estOption: true }, take: 1 },
        sousCategories: { select: { id: true, slug: true, nom: true }, take: 1 },
        // Les questions qui font le prix, dans l'ordre où la fiche les pose :
        // c'est de là que vient le libellé « 180 cm / Avec retour ».
        choix: {
          where: { nature: "tarifaire" },
          orderBy: { ordre: "asc" },
          select: { cle: true, nom: true },
        },
        combinaisons: {
          select: {
            id: true, valeurs: true, prixTarifHT: true,
            ecoContribution: true, referenceBase: true,
          },
        },
      },
    }),
    prisma.categorie.findMany({
      orderBy: { ordre: "asc" },
      include: { sousCategories: { orderBy: { ordre: "asc" }, select: { id: true, nom: true, slug: true } } },
    }),
    getMargeGlobale(),
  ]);

  const retenues = exclureOptions
    ? vitrines.filter((v) => !v.categories.some((c) => c.estOption))
    : vitrines;

  const produits = retenues.map((v) => {
    const cles = v.choix.map((c) => c.cle);

    // Libellé lisible d'une combinaison : « 180 cm / Avec retour ». Il suit
    // l'ordre d'affichage des questions, celui que le client a vu.
    const libelle = (k) => cles.map((c) => k.valeurs?.[c]).filter(Boolean).join(" / ")
      || k.referenceBase || "Variante";

    const declinaisons = v.combinaisons
      .map((k) => ({
        id: k.id,
        libelle: libelle(k),
        // Le prix de vente naît ici comme partout ailleurs : le tarif
        // fournisseur passé par la marge. Aucun prix de vente n'est stocké sur
        // une combinaison, et c'est ce qui garantit qu'un devis ne chiffre pas
        // d'après un prix figé au jour de la reprise.
        prixHT: prixLigne({ prixTarifHT: k.prixTarifHT }, marges) ?? 0,
        // L'éco-contribution ne subit pas la marge : c'est une taxe refacturée
        // telle quelle, et elle doit suivre jusqu'à la ligne du devis.
        ecoContribution: Number(k.ecoContribution) || 0,
        referenceFournisseur: k.referenceBase || null,
        // L'identité de commande, que la ligne emporte : sans elle, il faut
        // retrouver quoi commander au moment de l'acceptation du devis.
        combinaisonId: k.id,
        choix: k.valeurs || null,
      }))
      .sort((x, y) => x.libelle.localeCompare(y.libelle, "fr", { numeric: true }));

    const prixPositifs = declinaisons.map((d) => d.prixHT).filter((x) => x > 0);
    const prix = prixPositifs.length ? Math.min(...prixPositifs) : prixUnitaire(v, marges);

    const ecoUnitaire = declinaisons.length
      ? (declinaisons.find((d) => d.ecoContribution > 0)?.ecoContribution ?? 0)
      : 0;

    return {
      id: v.id,
      nom: v.nom,
      gammeId: v.gamme.id,
      gammeNom: v.gamme.nom,
      marqueNom: v.gamme.marque?.nom || null,
      imageUrl: (v.images && v.images[0]) || v.imageUrl || null,
      slug: v.slug,
      categorieId: v.categories[0]?.id || null,
      categorieNom: v.categories[0]?.nom || null,
      categorieSlug: v.categories[0]?.slug || null,
      sousCategorieId: v.sousCategories[0]?.id || null,
      sousCategorieNom: v.sousCategories[0]?.nom || null,
      sousCategorieSlug: v.sousCategories[0]?.slug || null,
      prixMini: Number.isFinite(prix) ? prix : null,
      prixUnitaire: prixUnitaire(v, marges),
      ecoUnitaire,
      declinaisons,
    };
  });

  // On ne garde que les catégories qui contiennent réellement des produits.
  const idsUtilises = new Set(produits.map((p) => p.categorieId).filter(Boolean));
  const cats = categories
    .filter((c) => idsUtilises.has(c.id))
    .map((c) => ({
      id: c.id,
      nom: c.nom,
      sousCategories: c.sousCategories.filter((s) => produits.some((p) => p.sousCategorieId === s.id)),
    }));

  // Gammes réellement représentées, pour le filtre du sélecteur.
  const gammes = [...new Map(produits.map((p) => [p.gammeId, { id: p.gammeId, nom: p.gammeNom }])).values()]
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return { produits, categories: cats, gammes };
}

// Accents et casse ignorés — « etagere » doit trouver « Étagère ».
export function normaliser(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Filtrage commun aux deux sélecteurs : une seule règle, un seul endroit.
export function filtrerProduitsAdmin(produits, { recherche = "", gammeId = null, categorieId = null, sousCategorieId = null } = {}) {
  const q = normaliser(recherche.trim());
  return (produits || []).filter((p) => {
    if (gammeId && p.gammeId !== gammeId) return false;
    if (categorieId && p.categorieId !== categorieId) return false;
    if (sousCategorieId && p.sousCategorieId !== sousCategorieId) return false;
    if (q && !normaliser(`${p.nom} ${p.gammeNom}`).includes(q)) return false;
    return true;
  });
}
