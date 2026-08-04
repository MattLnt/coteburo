import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Rangement à composer Quiétude", gamme: { nom: "Quietude" } },
  });
  if (!vitrine) {
    console.error('Produit introuvable — vérifie le nom exact "Rangement à composer Quiétude" dans la gamme "Quietude".');
    process.exit(1);
  }

  // ─── Axes (libellés identiques à l'admin) ───
  const axes = [
    { id: "struct", nom: "Structure", valeurs: ["Rangement bas 69,5 cm", "Rangement haut 201 cm", "Bibliothèque 201 cm"] },
    { id: "long",   nom: "Longueur",  valeurs: ["80 cm", "100 cm"] },
    { id: "alcove", nom: "Alcôve",    valeurs: ["Avec", "Sans"] },
    { id: "portes", nom: "Portes",    valeurs: ["Portes battantes", "Sans"] },
    { id: "poign",  nom: "Poignées",  valeurs: ["Classiques", "Poignées métal"] },
  ];

  // ─── 24 combinaisons valides (prix = somme des briques, réf = codes concaténés) ───
  const declinaisons = [
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "80 cm", alcove: "Avec", portes: "Portes battantes", poign: "Classiques" }, prixTarifHT: "705", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH69+DZ07+EH78+BA00" },
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "80 cm", alcove: "Avec", portes: "Portes battantes", poign: "Poignées métal" }, prixTarifHT: "710", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH69+DZ07+EH78+DX21" },
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "80 cm", alcove: "Avec", portes: "Sans" }, prixTarifHT: "550", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH69+DZ07" },
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "80 cm", alcove: "Sans", portes: "Portes battantes", poign: "Classiques" }, prixTarifHT: "305", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH69+EH78+BA00" },
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "80 cm", alcove: "Sans", portes: "Portes battantes", poign: "Poignées métal" }, prixTarifHT: "310", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH69+EH78+DX21" },
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "80 cm", alcove: "Sans", portes: "Sans" }, prixTarifHT: "150", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH69" },
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "100 cm", alcove: "Avec", portes: "Portes battantes", poign: "Classiques" }, prixTarifHT: "775", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH70+DZ08+EH82+BA00" },
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "100 cm", alcove: "Avec", portes: "Portes battantes", poign: "Poignées métal" }, prixTarifHT: "780", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH70+DZ08+EH82+DX21" },
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "100 cm", alcove: "Avec", portes: "Sans" }, prixTarifHT: "595", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH70+DZ08" },
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "100 cm", alcove: "Sans", portes: "Portes battantes", poign: "Classiques" }, prixTarifHT: "360", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH70+EH82+BA00" },
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "100 cm", alcove: "Sans", portes: "Portes battantes", poign: "Poignées métal" }, prixTarifHT: "365", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH70+EH82+DX21" },
    { id: uid(), valeurs: { struct: "Rangement bas 69,5 cm", long: "100 cm", alcove: "Sans", portes: "Sans" }, prixTarifHT: "180", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH70" },
    { id: uid(), valeurs: { struct: "Rangement haut 201 cm", long: "80 cm", alcove: "Sans", portes: "Portes battantes", poign: "Classiques" }, prixTarifHT: "620", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH81+EH81+BA00" },
    { id: uid(), valeurs: { struct: "Rangement haut 201 cm", long: "80 cm", alcove: "Sans", portes: "Portes battantes", poign: "Poignées métal" }, prixTarifHT: "625", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH81+EH81+DX21" },
    { id: uid(), valeurs: { struct: "Rangement haut 201 cm", long: "80 cm", alcove: "Sans", portes: "Sans" }, prixTarifHT: "405", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH81" },
    { id: uid(), valeurs: { struct: "Rangement haut 201 cm", long: "100 cm", alcove: "Sans", portes: "Portes battantes", poign: "Classiques" }, prixTarifHT: "725", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH82+EH85+BA00" },
    { id: uid(), valeurs: { struct: "Rangement haut 201 cm", long: "100 cm", alcove: "Sans", portes: "Portes battantes", poign: "Poignées métal" }, prixTarifHT: "730", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH82+EH85+DX21" },
    { id: uid(), valeurs: { struct: "Rangement haut 201 cm", long: "100 cm", alcove: "Sans", portes: "Sans" }, prixTarifHT: "455", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BH82" },
    { id: uid(), valeurs: { struct: "Bibliothèque 201 cm", long: "80 cm", alcove: "Sans", portes: "Portes battantes", poign: "Classiques" }, prixTarifHT: "655", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DR16+EH81+BA00" },
    { id: uid(), valeurs: { struct: "Bibliothèque 201 cm", long: "80 cm", alcove: "Sans", portes: "Portes battantes", poign: "Poignées métal" }, prixTarifHT: "660", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DR16+EH81+DX21" },
    { id: uid(), valeurs: { struct: "Bibliothèque 201 cm", long: "80 cm", alcove: "Sans", portes: "Sans" }, prixTarifHT: "440", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DR16" },
    { id: uid(), valeurs: { struct: "Bibliothèque 201 cm", long: "100 cm", alcove: "Sans", portes: "Portes battantes", poign: "Classiques" }, prixTarifHT: "755", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DR17+EH85+BA00" },
    { id: uid(), valeurs: { struct: "Bibliothèque 201 cm", long: "100 cm", alcove: "Sans", portes: "Portes battantes", poign: "Poignées métal" }, prixTarifHT: "760", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DR17+EH85+DX21" },
    { id: uid(), valeurs: { struct: "Bibliothèque 201 cm", long: "100 cm", alcove: "Sans", portes: "Sans" }, prixTarifHT: "485", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DR17" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { axesDeclinaisons: axes, declinaisons },
  });

  console.log(`✓ ${declinaisons.length} combinaisons enregistrées sur "${vitrine.nom}".`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
