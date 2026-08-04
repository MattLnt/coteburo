import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function importTableCoworking() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Table coworking", gamme: { nom: "Cohésion" } },
  });
  if (!vitrine) {
    console.error('⚠ "Table coworking" introuvable dans la gamme "Cohésion" — étape ignorée.');
    return;
  }

  const axeDimension = { id: "dimension", nom: "Dimension", valeurs: ["L160 x P120", "L200 x P100", "L200 x P120", "L240 x P120"] };
  const axeElec = { id: "elec", nom: "Électrification", valeurs: ["Sans", "Avec"] };

  const DATA = {
    "L160 x P120": { sans: { ref: "DF98", prix: "825" }, avec: { ref: "DQ53", prix: "1180" } },
    "L200 x P100": { sans: { ref: "DH00", prix: "840" }, avec: { ref: "DQ52", prix: "1245" } },
    "L200 x P120": { sans: { ref: "BX99", prix: "870" }, avec: { ref: "DQ54", prix: "1280" } },
    "L240 x P120": { sans: { ref: "DX17", prix: "1005" }, avec: { ref: "DX18", prix: "1410" } },
  };

  const declinaisons = [];
  for (const dim of axeDimension.valeurs) {
    for (const [elecVal, cle] of [["Sans", "sans"], ["Avec", "avec"]]) {
      const info = DATA[dim][cle];
      declinaisons.push({
        id: uid(),
        valeurs: { dimension: dim, elec: elecVal },
        prixTarifHT: info.prix,
        prixVenteHT: "",
        prixVerrouille: false,
        referenceFournisseur: info.ref,
      });
    }
  }

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { axesDeclinaisons: [axeDimension, axeElec], declinaisons },
  });

  await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });
  await prisma.groupeFinition.create({
    data: {
      nom: "Structure métal", vitrineId: vitrine.id, ordre: 0,
      finitions: { create: [
        { nom: "Noir métal", couleur: "#23262a", ordre: 0 },
        { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 1 },
      ] },
    },
  });
  await prisma.groupeFinition.create({
    data: {
      nom: "Plateau", vitrineId: vitrine.id, ordre: 1,
      finitions: { create: [
        { nom: "Nebraska", couleur: "#c9a876", ordre: 0 },
        { nom: "Timber", couleur: "#a67c52", ordre: 1 },
        { nom: "Chêne fil", couleur: "#b8926a", ordre: 2 },
        { nom: "Blanc", couleur: "#f5f3ee", ordre: 3 },
        { nom: "Yukon", couleur: "#6b4a35", ordre: 4 },
      ] },
    },
  });

  console.log(`✓ "Table coworking" : ${declinaisons.length} combinaisons + 2 groupes de finitions.`);
}

async function importKitLiaison() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Kit de liaison", gamme: { nom: "Cohésion" } },
  });
  if (!vitrine) {
    console.error('⚠ "Kit de liaison" introuvable dans la gamme "Cohésion" — étape ignorée.');
    return;
  }

  // Un seul vrai SKU (pas de choix client) — un axe à une seule valeur pour que la
  // fiche produit ne pose aucune question, juste le prix qui s'affiche directement.
  const axeVersion = { id: "version", nom: "Version", valeurs: ["Standard"] };
  const declinaisons = [
    { id: uid(), valeurs: { version: "Standard" }, prixTarifHT: "30", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "DN78" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { axesDeclinaisons: [axeVersion], declinaisons },
  });

  console.log(`✓ "Kit de liaison" : 1 combinaison (finition Zinc métal, fixe, non modifiable).`);
}

async function main() {
  await importTableCoworking();
  await importKitLiaison();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());