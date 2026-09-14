import { notFound, permanentRedirect } from "next/navigation";
import { urlVitrineDepuisProduit } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

// Ancienne URL du modèle Produit. Elle lisait la table Produit en direct, dont
// les prix ne passent pas par la marge des Réglages : la fiche affichait donc un
// montant différent de la carte du catalogue. Les produits vivent désormais dans
// ProduitVitrine, servie par /[categorie]/[[...sousCategorie]]/[produit] — cette
// route ne fait plus que rediriger (308) pour ne pas casser les liens existants.
export default async function ProduitLegacyPage({ params }) {
  const { slug } = await params;
  const url = await urlVitrineDepuisProduit(decodeURIComponent(slug));
  // Pas de vitrine publiée : on renvoie un 404 plutôt qu'une redirection
  // permanente vers /catalogue, qui ferait croire aux moteurs que cette fiche
  // *est* le catalogue.
  if (!url) notFound();
  permanentRedirect(url);
}
