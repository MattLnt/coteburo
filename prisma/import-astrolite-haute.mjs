import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function ajouterFinitions(vitrineId) {
  await prisma.groupeFinition.deleteMany({ where: { vitrineId } });
  await prisma.groupeFinition.create({
    data: {
      nom: "Structure métal", vitrineId, ordre: 0,
      finitions: { create: [
        { nom: "Noir métal", couleur: "#23262a", ordre: 0 },
        { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 1 },
      ] },
    },
  });
  await prisma.groupeFinition.create({
    data: {
      nom: "Plateau", vitrineId, ordre: 1,
      finitions: { create: [
        { nom: "Nebraska", couleur: "#c9a876", ordre: 0 },
        { nom: "Timber", couleur: "#a67c52", ordre: 1 },
        { nom: "Chêne fil", couleur: "#b8926a", ordre: 2 },
        { nom: "Blanc", couleur: "#f5f3ee", ordre: 3 },
        { nom: "Argile", couleur: "#c77b5a", ordre: 4 },
        { nom: "Yukon", couleur: "#6b4a35", ordre: 5 },
      ] },
    },
  });
}

async function importTableHaute() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Table haute", gamme: { nom: "Astrolite Haute" } },
  });
  if (!vitrine) { console.error('⚠ "Table haute" introuvable — étape ignorée.'); return; }

  const axeDimension = {
    id: "dimension", nom: "Dimension",
    valeurs: ["L120 x P80", "L140 x P80", "L160 x P80", "L140 x P143", "L140 x P143 + TAC"],
  };
  const DATA = {
    "L120 x P80": { ref: "DR82", prix: "590" },
    "L140 x P80": { ref: "DQ86", prix: "620" },
    "L160 x P80": { ref: "DQ87", prix: "650" },
    "L140 x P143": { ref: "DQ88", prix: "830" },
    "L140 x P143 + TAC": { ref: "DQ89", prix: "940" },
  };

  const declinaisons = axeDimension.valeurs.map((dim) => ({
    id: uid(),
    valeurs: { dimension: dim },
    prixTarifHT: DATA[dim].prix,
    prixVenteHT: "",
    prixVerrouille: false,
    referenceFournisseur: DATA[dim].ref,
  }));

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { axesDeclinaisons: [axeDimension], declinaisons },
  });
  await ajouterFinitions(vitrine.id);

  console.log(`✓ "Table haute" : ${declinaisons.length} combinaisons + finitions.`);
}

async function importTableHauteMobile() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Table haute mobile", gamme: { nom: "Astrolite Haute" } },
  });
  if (!vitrine) { console.error('⚠ "Table haute mobile" introuvable — étape ignorée.'); return; }

  const axeDimension = { id: "dimension", nom: "Dimension", valeurs: ["L120 x P80", "L140 x P80", "L160 x P80"] };
  const DATA = {
    "L120 x P80": { ref: "EB51", prix: "630" },
    "L140 x P80": { ref: "EB52", prix: "660" },
    "L160 x P80": { ref: "EB53", prix: "690" },
  };

  const declinaisons = axeDimension.valeurs.map((dim) => ({
    id: uid(),
    valeurs: { dimension: dim },
    prixTarifHT: DATA[dim].prix,
    prixVenteHT: "",
    prixVerrouille: false,
    referenceFournisseur: DATA[dim].ref,
  }));

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { axesDeclinaisons: [axeDimension], declinaisons },
  });
  await ajouterFinitions(vitrine.id);

  console.log(`✓ "Table haute mobile" : ${declinaisons.length} combinaisons + finitions.`);
}

async function main() {
  await importTableHaute();
  await importTableHauteMobile();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());