import { prisma } from "@/lib/prisma";
import { ProduitsTable } from "./ProduitsTable";
import { getGammesPourRecherche } from "./actions";
import { prixVenteEffectif } from "@/lib/prixDeclinaison";

export const dynamic = "force-dynamic";

function libelleDeclinaison(axes, valeurs) {
  return (axes || [])
    .map((a) => {
      const val = valeurs?.[a.id];
      return val ? `${a.nom}: ${val}` : null;
    })
    .filter(Boolean)
    .join(" · ");
}

// Prix de vente d'un produit à prix unique (sansDeclinaisons) :
// verrouillé → prix de vente saisi ; sinon → fournisseur × (1 + marge) ; repli sur le prix de vente.
function prixUniqueEffectif(carte, marge) {
  const vente = carte.prixUnitaireHT != null ? Number(carte.prixUnitaireHT) : null;
  if (carte.prixUnitaireVerrouille && vente != null && !Number.isNaN(vente) && vente > 0) return vente;
  const tarif = carte.prixUnitaireTarifHT != null ? Number(carte.prixUnitaireTarifHT) : null;
  if (tarif != null && !Number.isNaN(tarif) && tarif > 0) return Math.round(tarif * (1 + marge) * 100) / 100;
  if (vente != null && !Number.isNaN(vente) && vente > 0) return vente;
  return null;
}

export default async function ProduitsPage() {
  const [cartes, gammes, reglages] = await Promise.all([
    prisma.produitVitrine.findMany({
      orderBy: { nom: "asc" },
      select: {
        id: true,
        nom: true,
        slug: true,
        publie: true,
        venteSurDevis: true,
        axesDeclinaisons: true,
        declinaisons: true,
        prixAPartir: true,
        sansDeclinaisons: true,
        prixUnitaireTarifHT: true,
        prixUnitaireHT: true,
        prixUnitaireVerrouille: true,
        referenceUnitaire: true,
        categories: { select: { nom: true }, take: 1 },
        sousCategories: { select: { nom: true }, take: 1 },
        gamme: {
          select: { id: true, nom: true, slug: true, venteSurDevis: true, marque: { select: { nom: true } } },
        },
      },
    }),
    getGammesPourRecherche(),
    prisma.reglages.findUnique({ where: { id: 1 }, select: { margeGlobale: true } }),
  ]);

  const margeGlobale = reglages?.margeGlobale ?? 0.3;
  const lignes = [];

  for (const carte of cartes) {
    const surDevis = carte.gamme.venteSurDevis || carte.venteSurDevis;
    const axes = Array.isArray(carte.axesDeclinaisons) ? carte.axesDeclinaisons : [];
    const declinaisons = Array.isArray(carte.declinaisons) ? carte.declinaisons : [];
    const categorieNom = carte.categories?.[0]?.nom || null;
    const sousCategorieNom = carte.sousCategories?.[0]?.nom || null;
    const marqueNom = carte.gamme.marque?.nom || null;

    // Produit à PRIX UNIQUE (sans déclinaisons) : une seule ligne, prix depuis prixUnitaire*.
    if (!surDevis && carte.sansDeclinaisons) {
      const prix = prixUniqueEffectif(carte, margeGlobale);
      const tarif = carte.prixUnitaireTarifHT != null ? Number(carte.prixUnitaireTarifHT) : null;
      lignes.push({
        key: carte.id,
        nom: carte.nom,
        sousLibelle: "Prix unique",
        reference: carte.referenceUnitaire || null,
        gammeNom: carte.gamme.nom,
        marqueNom,
        categorieNom,
        sousCategorieNom,
        gammeId: carte.gamme.id,
        carteId: carte.id,
        publie: carte.publie,
        // Une ligne à prix unique n'est pas éditable en ligne (pas de declinaisonId) :
        // le mode "boutique-vide" reste utilisé quand le prix manque réellement.
        mode: prix != null ? "boutique" : "boutique-vide",
        declinaisonId: null,
        prixTarif: tarif,
        prix,
        verrouille: !!carte.prixUnitaireVerrouille,
      });
    } else if (!surDevis && declinaisons.length > 0) {
      for (const d of declinaisons) {
        const tarif = d.prixTarifHT != null && d.prixTarifHT !== "" ? Number(d.prixTarifHT) : null;
        lignes.push({
          key: `${carte.id}-${d.id}`,
          nom: carte.nom,
          sousLibelle: libelleDeclinaison(axes, d.valeurs) || null,
          reference: d.referenceFournisseur || null,
          gammeNom: carte.gamme.nom,
          marqueNom,
          categorieNom,
          sousCategorieNom,
          gammeId: carte.gamme.id,
          carteId: carte.id,
          publie: carte.publie,
          mode: "boutique",
          declinaisonId: d.id,
          prixTarif: tarif,
          prix: prixVenteEffectif(d, margeGlobale),
          verrouille: !!d.prixVerrouille,
        });
      }
    } else if (!surDevis) {
      lignes.push({
        key: carte.id,
        nom: carte.nom,
        sousLibelle: null,
        reference: null,
        gammeNom: carte.gamme.nom,
        marqueNom,
        categorieNom,
        sousCategorieNom,
        gammeId: carte.gamme.id,
        carteId: carte.id,
        publie: carte.publie,
        mode: "boutique-vide",
        declinaisonId: null,
        prixTarif: null,
        prix: null,
        verrouille: false,
      });
    } else {
      lignes.push({
        key: carte.id,
        nom: carte.nom,
        sousLibelle: null,
        reference: null,
        gammeNom: carte.gamme.nom,
        marqueNom,
        categorieNom,
        sousCategorieNom,
        gammeId: carte.gamme.id,
        carteId: carte.id,
        publie: carte.publie,
        mode: "devis",
        declinaisonId: null,
        prixTarif: null,
        prix: carte.prixAPartir != null ? Number(carte.prixAPartir) : null,
        verrouille: false,
      });
    }
  }

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: 0 }}>Produits</h1>
      </div>

      <ProduitsTable lignes={JSON.parse(JSON.stringify(lignes))} gammes={JSON.parse(JSON.stringify(gammes))} margeGlobale={margeGlobale} />
    </>
  );
}