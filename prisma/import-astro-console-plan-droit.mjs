import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();

const NOM_PRODUIT = "Bureau plan droit + Console B-Box";
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

  // ─── 1. Axes de déclinaison (font varier le prix) ───
  const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["140 cm", "160 cm", "180 cm"] };
  const axeType     = { id: "type",     nom: "Passage de câbles", valeurs: ["Obturateurs", "Échancrure", "TAC"] };
  const axePoignee  = { id: "poignee",  nom: "Poignée",  valeurs: ["Classique", "Design"] };

  // valeurs: { longueur, type, poignee } · prix = tarif fournisseur Buronomic · réf = code racine + C/D
  const rows = [
    ["140 cm", "Obturateurs", "Classique", "985",  "EB96C"],
    ["140 cm", "Obturateurs", "Design",    "990",  "EB96D"],
    ["160 cm", "Obturateurs", "Classique", "995",  "EB97C"],
    ["160 cm", "Obturateurs", "Design",    "1000", "EB97D"],
    ["180 cm", "Obturateurs", "Classique", "1005", "EB98C"],
    ["180 cm", "Obturateurs", "Design",    "1010", "EB98D"],
    ["140 cm", "Échancrure",  "Classique", "990",  "EB99C"],
    ["140 cm", "Échancrure",  "Design",    "995",  "EB99D"],
    ["160 cm", "Échancrure",  "Classique", "1000", "EC00C"],
    ["160 cm", "Échancrure",  "Design",    "1005", "EC00D"],
    ["180 cm", "Échancrure",  "Classique", "1010", "EC01C"],
    ["180 cm", "Échancrure",  "Design",    "1015", "EC01D"],
    ["140 cm", "TAC",         "Classique", "1065", "EC02C"],
    ["140 cm", "TAC",         "Design",    "1070", "EC02D"],
    ["160 cm", "TAC",         "Classique", "1075", "EC03C"],
    ["160 cm", "TAC",         "Design",    "1080", "EC03D"],
    ["180 cm", "TAC",         "Classique", "1085", "EC04C"],
    ["180 cm", "TAC",         "Design",    "1090", "EC04D"],
  ];

  const declinaisons = rows.map(([longueur, type, poignee, prix, ref]) => ({
    id: uid(),
    valeurs: { longueur, type, poignee },
    prixTarifHT: prix,
    prixVenteHT: "",
    prixVerrouille: false,
    referenceFournisseur: ref,
  }));

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeLongueur, axeType, axePoignee],
      declinaisons,
    },
  });

  // ─── 2. Finitions (sans impact prix) — 3 groupes ───
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
      nom: "Plateau bureau",
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

  await prisma.groupeFinition.create({
    data: {
      nom: "Plateau console",
      vitrineId: vitrine.id,
      ordre: 2,
      finitions: {
        create: [
          { nom: "Hêtre",     couleur: "#d8b384", ordre: 0 },
          { nom: "Noir",      couleur: "#23262a", ordre: 1 },
          { nom: "Nebraska",  couleur: "#b89b73", ordre: 2 },
          { nom: "Timber",    couleur: "#8a6a4a", ordre: 3 },
          { nom: "Chêne fil", couleur: "#c9a876", ordre: 4 },
          { nom: "Blanc",     couleur: "#f2f0ec", ordre: 5 },
          { nom: "Argile",    couleur: "#a08d7c", ordre: 6 },
          { nom: "Yukon",     couleur: "#6e5b4a", ordre: 7 },
        ],
      },
    },
  });

  console.log(`✓ ${declinaisons.length} combinaisons + 3 groupes de finitions enregistrés sur "${vitrine.nom}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
