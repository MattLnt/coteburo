import { notFound } from "next/navigation";
import { chargerProduit, surDevis } from "@/lib/chargerProduit";
import { getMargeGlobale } from "@/lib/catalogue";
import { listerNuanciers, listerBibliotheque, listerRangements } from "./actions";
import FicheProduitAdmin from "./FicheProduitAdmin";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const produit = await chargerProduit(id);
  return { title: produit ? `${produit.nom} · Admin` : "Produit · Admin" };
}

// La fiche produit en administration. Elle n'existait pas : tout se faisait en
// ligne dans le tableau, qui savait renommer, publier et supprimer une ligne.
// Quatre onglets — Identité, Choix, Prix, Visuels — pour corriger une donnée
// sans avoir à écrire un script.
export default async function ProduitAdminPage({ params }) {
  const { id } = await params;
  const [produit, marge, nuanciers, bibliotheque, rangements] = await Promise.all([
    chargerProduit(id),
    getMargeGlobale(),
    listerNuanciers(),
    listerBibliotheque(),
    listerRangements(),
  ]);
  if (!produit) notFound();

  return (
    <FicheProduitAdmin
      produit={JSON.parse(JSON.stringify(produit))}
      marge={marge}
      surDevis={surDevis(produit)}
      nuanciers={JSON.parse(JSON.stringify(nuanciers))}
      bibliotheque={JSON.parse(JSON.stringify(bibliotheque))}
      rangements={JSON.parse(JSON.stringify(rangements))}
    />
  );
}
