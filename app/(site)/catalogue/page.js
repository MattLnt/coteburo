import Link from "next/link";
import { getFiltresCatalogue, getCartesFiltrables } from "@/lib/catalogue";
import CatalogueClient from "@/components/CatalogueClient";

// La page était en force-dynamic : à chaque visite, y compris celle d'un
// robot, elle relisait tout le catalogue en base, recalculait le prix de
// chaque produit et re-sérialisait l'ensemble. C'est ce qui consommait
// l'essentiel du temps processeur du site.
//
// Rien ici ne dépend du visiteur : les mêmes cartes, les mêmes prix pour tout
// le monde. La page est donc rendue une fois puis servie depuis le cache. Le
// délai ci-dessous n'est qu'un filet — l'admin invalide la page dès qu'une
// fiche, un prix ou une promotion change (voir lib/invalidation.js).
export const revalidate = 3600;

export const metadata = {
  title: "Catalogue",
  alternates: { canonical: "/catalogue" },
};

export default async function CataloguePage() {
  const [filtres, cartes] = await Promise.all([
    getFiltresCatalogue(),
    getCartesFiltrables({}), // tous les produits, sans filtre — le filtrage se fait ensuite en JS
  ]);

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-6 pb-2 text-sm text-ink-soft">
        <Link href="/" className="hover:text-orange">Accueil</Link> / <span className="text-ink">Catalogue</span>
      </div>

      <CatalogueClient
        cartes={JSON.parse(JSON.stringify(cartes))}
        filtres={JSON.parse(JSON.stringify(filtres))}
        basePath="/catalogue"
      />
    </main>
  );
}
