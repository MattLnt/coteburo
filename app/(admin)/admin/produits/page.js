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

    if (!surDevis && declinaisons.length > 0) {
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Produits</h1>
          <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>
            Vue d'ensemble : chaque déclinaison boutique avec son prix, chaque produit sur devis. {lignes.length} ligne{lignes.length > 1 ? "s" : ""} au total.
          </p>
        </div>
      </div>

      <ProduitsTable lignes={JSON.parse(JSON.stringify(lignes))} gammes={JSON.parse(JSON.stringify(gammes))} margeGlobale={margeGlobale} />
    </>
  );
}