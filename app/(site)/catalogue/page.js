import Link from "next/link";
import { getFiltresCatalogue, getCartesFiltrables } from "@/lib/catalogue";
import { getFavorisContext } from "@/lib/favoris";
import CatalogueClient from "@/components/CatalogueClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catalogue",
  alternates: { canonical: "/catalogue" },
};

export default async function CataloguePage({ searchParams }) {
  const sp = await searchParams;
  // Ces valeurs ne servent qu'au tout premier rendu (URL partagée directement) —
  // ensuite, tout le filtrage se fait côté navigateur, sans redemander au serveur.
  const valeursInitiales = {
    categorieSlug: sp?.categorie || null,
    sousCategorieSlug: sp?.sousCategorie || null,
    marqueSlug: sp?.marque || null,
    prixMin: sp?.prixMin || null,
    prixMax: sp?.prixMax || null,
  };

  const [filtres, cartes, favCtx] = await Promise.all([
    getFiltresCatalogue(),
    getCartesFiltrables({}), // tous les produits, sans filtre — le filtrage se fait ensuite en JS
    getFavorisContext(),
  ]);

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-6 pb-2 text-sm text-ink-soft">
        <Link href="/" className="hover:text-orange">Accueil</Link> / <span className="text-ink">Catalogue</span>
      </div>

      <CatalogueClient
        cartes={JSON.parse(JSON.stringify(cartes))}
        filtres={JSON.parse(JSON.stringify(filtres))}
        favorisVitrines={favCtx.favorisVitrines}
        connecte={favCtx.connecte}
        valeursInitiales={valeursInitiales}
        basePath="/catalogue"
      />
    </main>
  );
}