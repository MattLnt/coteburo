import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

const REF_PAR_PROFIL = {
  "160-136": "EG27",
  "180-160": "EG28",
};
const PRIX_PAR_PROFIL = {
  "160-136": { haut: 700, bas: 585 },
  "180-160": { haut: 690, bas: 575 },
};

const TISSU_PALIER_HAUT = ["Vert eau", "Gris clair", "Orange", "Vert acide", "Bleu pétrole", "Gris carbone", "Ocre", "Bleu", "Rouge"];
const TISSU_PALIER_BAS = ["Sable", "Beige", "Forêt", "Horizon", "Pêche", "Chocolat"];
const TOUS_LES_TISSUS = [...TISSU_PALIER_HAUT, ...TISSU_PALIER_BAS];

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Cloison mobile inclinée", gamme: { nom: "Bewall" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Cloison mobile inclinée" dans la gamme "Bewall".');
    process.exit(1);
  }

  // ─── 1. Déclinaisons + prix + références ───
  const axeProfil = { id: "profil", nom: "Hauteur", valeurs: ["160-136", "180-160"] };
  const axeTissu = { id: "tissu", nom: "Couleur tissu", valeurs: TOUS_LES_TISSUS };

  const declinaisons = [];
  for (const profil of axeProfil.valeurs) {
    const ref = REF_PAR_PROFIL[profil];
    const prix = PRIX_PAR_PROFIL[profil];
    for (const tissu of TOUS_LES_TISSUS) {
      const estPalierHaut = TISSU_PALIER_HAUT.includes(tissu);
      declinaisons.push({
        id: uid(),
        valeurs: { profil, tissu },
        prixTarifHT: String(estPalierHaut ? prix.haut : prix.bas),
        prixVenteHT: "",
        prixVerrouille: false,
        referenceFournisseur: ref,
      });
    }
  }

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeProfil, axeTissu],
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