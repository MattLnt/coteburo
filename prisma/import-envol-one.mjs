import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function importPlanDroit() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Plan droit", gamme: { nom: "Envol One" } },
  });
  if (!vitrine) { console.error('⚠ "Plan droit" introuvable — étape ignorée.'); return; }

  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["120", "140", "160", "180"] };
  const axeType = { id: "type", nom: "Passage de câbles", valeurs: ["Obturateurs", "Échancrure", "TAC"] };

  const DATA = {
    "120-Obturateurs": { ref: "EC14", prix: "615" },
    "140-Obturateurs": { ref: "EC15", prix: "625" },
    "160-Obturateurs": { ref: "EC16", prix: "635" },
    "180-Obturateurs": { ref: "EC17", prix: "645" },
    "120-Échancrure": { ref: "EC18", prix: "620" },
    "140-Échancrure": { ref: "EC19", prix: "630" },
    "160-Échancrure": { ref: "EC20", prix: "640" },
    "180-Échancrure": { ref: "EC21", prix: "650" },
    "120-TAC": { ref: "EC22", prix: "695" },
    "140-TAC": { ref: "EC23", prix: "705" },
    "160-TAC": { ref: "EC24", prix: "715" },
    "180-TAC": { ref: "EC25", prix: "725" },
  };

  const declinaisons = [];
  for (const longueur of axeLongueur.valeurs) {
    for (const type of axeType.valeurs) {
      const info = DATA[`${longueur}-${type}`];
      declinaisons.push({
        id: uid(),
        valeurs: { longueur, type },
        prixTarifHT: info.prix,
        prixVenteHT: "",
        prixVerrouille: false,
        referenceFournisseur: info.ref,
      });
    }
  }

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { axesDeclinaisons: [axeLongueur, axeType], declinaisons },
  });

  await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });
  await prisma.groupeFinition.create({
    data: {
      nom: "Structure métal", vitrineId: vitrine.id, ordre: 0,
      finitions: { create: [
        { nom: "Aluminium", couleur: "#b8bcc0", ordre: 0 },
        { nom: "Noir métal", couleur: "#23262a", ordre: 1 },
        { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 2 },
      ] },
    },
  });
  await prisma.groupeFinition.create({
    data: {
      nom: "Plateau", vitrineId: vitrine.id, ordre: 1,
      finitions: { create: [
        { nom: "Hêtre", couleur: "#d9b98a", ordre: 0 },
        { nom: "Nebraska", couleur: "#c9a876", ordre: 1 },
        { nom: "Timber", couleur: "#a67c52", ordre: 2 },
        { nom: "Chêne fil", couleur: "#b8926a", ordre: 3 },
        { nom: "Blanc", couleur: "#f5f3ee", ordre: 4 },
        { nom: "Argile", couleur: "#c77b5a", ordre: 5 },
        { nom: "Yukon", couleur: "#6b4a35", ordre: 6 },
      ] },
    },
  });

  console.log(`✓ "Plan droit" : ${declinaisons.length} combinaisons + 2 groupes de finitions.`);
}

async function importTiroirMetal() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Tiroir métal", gamme: { nom: "Envol One" } },
  });
  if (!vitrine) { console.error('⚠ "Tiroir métal" introuvable — étape ignorée.'); return; }

  const axeVersion = { id: "version", nom: "Version", valeurs: ["Standard"] };
  const declinaisons = [
    { id: uid(), valeurs: { version: "Standard" }, prixTarifHT: "113", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "EC26" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { axesDeclinaisons: [axeVersion], declinaisons },
  });

  await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });
  await prisma.groupeFinition.create({
    data: {
      nom: "Structure métal", vitrineId: vitrine.id, ordre: 0,
      finitions: { create: [{ nom: "Noir métal", couleur: "#23262a", ordre: 0 }] },
    },
  });

  console.log(`✓ "Tiroir métal" : 1 combinaison (Noir métal uniquement).`);
}

async function main() {
  await importPlanDroit();
  await importTiroirMetal();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());