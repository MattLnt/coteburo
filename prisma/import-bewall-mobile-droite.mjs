import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

const REF_PAR_TAILLE = {
  "80-136": "EG21",
  "120-136": "EG22",
  "80-160": "EG23",
  "120-160": "EG24",
  "80-180": "EG25",
  "120-180": "EG26",
};
const PRIX_PAR_TAILLE = {
  "80-136": { haut: 605, bas: 500 },
  "120-136": { haut: 730, bas: 595 },
  "80-160": { haut: 645, bas: 535 },
  "120-160": { haut: 800, bas: 655 },
  "80-180": { haut: 690, bas: 565 },
  "120-180": { haut: 855, bas: 700 },
};

const TISSU_PALIER_HAUT = ["Vert eau", "Gris clair", "Orange", "Vert acide", "Bleu pétrole", "Gris carbone", "Ocre", "Bleu", "Rouge"];
const TISSU_PALIER_BAS = ["Sable", "Beige", "Forêt", "Horizon", "Pêche", "Chocolat"];
const TOUS_LES_TISSUS = [...TISSU_PALIER_HAUT, ...TISSU_PALIER_BAS];

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Cloison mobile droite", gamme: { nom: "Bewall" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Cloison mobile droite" dans la gamme "Bewall".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["80", "120"] };
  const axeHauteur = { id: "hauteur", nom: "Hauteur", valeurs: ["136", "160", "180"] };
  const axeTissu = { id: "tissu", nom: "Couleur tissu", valeurs: TOUS_LES_TISSUS };

  const declinaisons = [];
  for (const longueur of axeLongueur.valeurs) {
    for (const hauteur of axeHauteur.valeurs) {
      const cle = `${longueur}-${hauteur}`;
      const ref = REF_PAR_TAILLE[cle];
      const prix = PRIX_PAR_TAILLE[cle];
      for (const tissu of TOUS_LES_TISSUS) {
        const estPalierHaut = TISSU_PALIER_HAUT.includes(tissu);
        declinaisons.push({
          id: uid(),
          valeurs: { longueur, hauteur, tissu },
          prixTarifHT: String(estPalierHaut ? prix.haut : prix.bas),
          prixVenteHT: "",
          prixVerrouille: false,
          referenceFournisseur: ref,
        });
      }
    }
  }

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeLongueur, axeHauteur, axeTissu],
      declinaisons,
    },
  });

  // ─── 2. Finitions (couleur métal — sans impact prix) ───
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });

  await prisma.groupeFinition.create({
    data: {
      nom: "Structure métal",
      vitrineId: vitrine.id,
      ordre: 0,
      finitions: {
        create: [
          { nom: "Noir métal", couleur: "#23262a", ordre: 0 },
          { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 1 },
        ],
      },
    },
  });

  console.log(`✓ ${declinaisons.length} combinaisons + groupe "Structure métal" enregistrés sur "${vitrine.nom}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());