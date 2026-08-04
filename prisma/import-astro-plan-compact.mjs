import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();

const NOM_PRODUIT = "Bureau plan compact";
const NOM_GAMME = "ASTRO";

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) {
    console.error(`Gamme "${NOM_GAMME}" introuvable. Gammes existantes :`);
    console.error(gammes.map((g) => ` - ${g.nom}`).join("\n"));
    process.exit(1);
  }

  const produits = await prisma.produitVitrine.findMany({
    where: { gammeId: gamme.id },
    select: { id: true, nom: true },
  });
  const vitrine = produits.find((p) => norm(p.nom) === norm(NOM_PRODUIT));
  if (!vitrine) {
    console.error(`Produit "${NOM_PRODUIT}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(
      produits.length
        ? `Produits existants dans cette gamme :\n${produits.map((p) => ` - ${p.nom}`).join("\n")}`
        : "Aucun produit dans cette gamme pour l'instant — cree-le d'abord dans l'admin."
    );
    process.exit(1);
  }

  // ─── 1. Axes de déclinaison ───
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["160 cm", "180 cm"] };
  const axeRetour   = { id: "retour",   nom: "Retour",   valeurs: ["Droit", "Gauche"] };

  // valeurs: { longueur, retour } · prix = tarif fournisseur Buronomic
  const rows = [
    ["160 cm", "Droit",  "610", "BP27"],
    ["160 cm", "Gauche", "610", "BP28"],
    ["180 cm", "Droit",  "630", "BP29"],
    ["180 cm", "Gauche", "630", "BP30"],
  ];

  const declinaisons = rows.map(([longueur, retour, prix, ref]) => ({
    id: uid(),
    valeurs: { longueur, retour },
    prixTarifHT: prix,
    prixVenteHT: "",
    prixVerrouille: false,
    referenceFournisseur: ref,
  }));

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeLongueur, axeRetour],
      declinaisons,
    },
  });

  // ─── 2. Finitions (sans impact prix) ───
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });

  await prisma.groupeFinition.create({
    data: {
      nom: "Structure métal",
      vitrineId: vitrine.id,
      ordre: 0,
      finitions: {
        create: [
          { nom: "Aluminium",   couleur: "#9a9a94", ordre: 0 },
          { nom: "Noir métal",  couleur: "#23262a", ordre: 1 },
          { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 2 },
        ],
      },
    },
  });

  await prisma.groupeFinition.create({
    data: {
      nom: "Plateau",
      vitrineId: vitrine.id,
      ordre: 1,
      finitions: {
        create: [
          { nom: "Hêtre",     couleur: "#d8b384", ordre: 0 },
          { nom: "Nebraska",  couleur: "#b89b73", ordre: 1 },
          { nom: "Timber",    couleur: "#8a6a4a", ordre: 2 },
          { nom: "Chêne fil", couleur: "#c9a876", ordre: 3 },
          { nom: "Blanc",     couleur: "#f2f0ec", ordre: 4 },
          { nom: "Argile",    couleur: "#a08d7c", ordre: 5 },
          { nom: "Yukon",     couleur: "#6e5b4a", ordre: 6 },
        ],
      },
    },
  });

  console.log(`✓ ${declinaisons.length} combinaisons + 2 groupes de finitions enregistrés sur "${vitrine.nom}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
