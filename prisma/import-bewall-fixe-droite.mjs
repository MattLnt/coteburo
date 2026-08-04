import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

// Référence racine par taille (Longueur × Hauteur) — le dernier chiffre du vrai code
// Buronomic (métal) et la lettre finale (couleur tissu) ne sont pas dans ce code racine ;
// la Finition "Structure métal" + la couleur tissu choisie suffisent à identifier la
// référence exacte à commander (même principe que pour ALTO RH).
const REF_PAR_TAILLE = {
  "80-136": "EG13",
  "120-136": "EG14",
  "80-160": "EG15",
  "120-160": "EG16",
  "80-180": "EG17",
  "120-180": "EG18",
};

// Prix par taille, pour chacun des 2 paliers de couleur tissu observés dans le tarif
const PRIX_PAR_TAILLE = {
  "80-136": { haut: 505, bas: 400 },
  "120-136": { haut: 630, bas: 495 },
  "80-160": { haut: 545, bas: 435 },
  "120-160": { haut: 700, bas: 555 },
  "80-180": { haut: 590, bas: 465 },
  "120-180": { haut: 755, bas: 600 },
};

const TISSU_PALIER_HAUT = ["Vert eau", "Gris clair", "Orange", "Vert acide", "Bleu pétrole", "Gris carbone", "Ocre", "Bleu", "Rouge"];
const TISSU_PALIER_BAS = ["Sable", "Beige", "Forêt", "Horizon", "Pêche", "Chocolat"];
const TOUS_LES_TISSUS = [...TISSU_PALIER_HAUT, ...TISSU_PALIER_BAS];

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Cloison fixe droite", gamme: { nom: "Bewall" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Cloison fixe droite" dans la gamme "Bewall".');
    process.exit(1);
  }

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

  console.log(`✓ ${declinaisons.length} combinaisons enregistrées sur "${vitrine.nom}" (gamme Bewall).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());