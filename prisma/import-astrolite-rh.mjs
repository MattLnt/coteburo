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
        { nom: "Aluminium", couleur: "#b8bcc0", ordre: 0 },
        { nom: "Noir métal", couleur: "#23262a", ordre: 1 },
        { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 2 },
      ] },
    },
  });
  await prisma.groupeFinition.create({
    data: {
      nom: "Plateau", vitrineId, ordre: 1,
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
}

async function importPlanDroit() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Plan droit", gamme: { nom: "Astrolite RH" } },
  });
  if (!vitrine) { console.error('⚠ "Plan droit" introuvable — étape ignorée.'); return; }

  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["120", "140", "160", "180"] };
  const axeType = { id: "type", nom: "Passage de câbles", valeurs: ["Obturateurs", "Échancrure", "TAC"] };

  const DATA = {
    "120-Obturateurs": { ref: "BM79", prix: "410" },
    "140-Obturateurs": { ref: "BM80", prix: "420" },
    "160-Obturateurs": { ref: "BM81", prix: "430" },
    "180-Obturateurs": { ref: "BM82", prix: "440" },
    "120-Échancrure": { ref: "DX75", prix: "415" },
    "140-Échancrure": { ref: "DX76", prix: "425" },
    "160-Échancrure": { ref: "DX77", prix: "435" },
    "180-Échancrure": { ref: "DX78", prix: "445" },
    "120-TAC": { ref: "DL30", prix: "490" },
    "140-TAC": { ref: "DL31", prix: "500" },
    "160-TAC": { ref: "DL32", prix: "510" },
    "180-TAC": { ref: "DL33", prix: "520" },
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
  await ajouterFinitions(vitrine.id);

  console.log(`✓ "Plan droit" : ${declinaisons.length} combinaisons + finitions.`);
}

async function importPlanCompact() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Plan compact", gamme: { nom: "Astrolite RH" } },
  });
  if (!vitrine) { console.error('⚠ "Plan compact" introuvable — étape ignorée.'); return; }

  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["160", "180"] };
  const axeSens = { id: "sens", nom: "Sens du retour", valeurs: ["Retour droit", "Retour gauche"] };

  const DATA = {
    "160-Retour droit": { ref: "BT67", prix: "540" },
    "160-Retour gauche": { ref: "BT68", prix: "540" },
    "180-Retour droit": { ref: "BT69", prix: "560" },
    "180-Retour gauche": { ref: "BT70", prix: "560" },
  };

  const declinaisons = [];
  for (const longueur of axeLongueur.valeurs) {
    for (const sens of axeSens.valeurs) {
      const info = DATA[`${longueur}-${sens}`];
      declinaisons.push({
        id: uid(),
        valeurs: { longueur, sens },
        prixTarifHT: info.prix,
        prixVenteHT: "",
        prixVerrouille: false,
        referenceFournisseur: info.ref,
      });
    }
  }

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { axesDeclinaisons: [axeLongueur, axeSens], declinaisons },
  });
  await ajouterFinitions(vitrine.id);

  console.log(`✓ "Plan compact" : ${declinaisons.length} combinaisons + finitions.`);
}

async function importExtension() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Extension", gamme: { nom: "Astrolite RH" } },
  });
  if (!vitrine) { console.error('⚠ "Extension" introuvable — étape ignorée.'); return; }

  const axeVersion = { id: "version", nom: "Version", valeurs: ["Standard"] };
  const declinaisons = [
    { id: uid(), valeurs: { version: "Standard" }, prixTarifHT: "250", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BU51" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { axesDeclinaisons: [axeVersion], declinaisons },
  });
  await ajouterFinitions(vitrine.id);

  console.log(`✓ "Extension" : 1 combinaison + finitions.`);
}

async function main() {
  await importPlanDroit();
  await importPlanCompact();
  await importExtension();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());