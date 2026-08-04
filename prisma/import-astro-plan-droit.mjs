import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();

const NOM_PRODUIT = "Bureau plan droit";
const NOM_GAMME = "ASTRO";

async function main() {
  // ─── Recherche tolérante (casse + espaces) ───
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
  const axeProfondeur = { id: "profondeur", nom: "Profondeur", valeurs: ["70 cm", "80 cm"] };
  const axeLongueur   = { id: "longueur",   nom: "Longueur",   valeurs: ["120 cm", "140 cm", "143 cm", "160 cm", "163 cm", "180 cm"] };
  const axeType       = { id: "type",       nom: "Passage de câbles", valeurs: ["Obturateurs", "Échancrure", "TAC"] };

  // valeurs: { profondeur, longueur, type } · prix = tarif fournisseur Buronomic
  const rows = [
    // P70 (pas de TAC, pas de L180)
    ["70 cm", "120 cm", "Obturateurs", "475", "BK64"],
    ["70 cm", "120 cm", "Échancrure",  "480", "DP39"],
    ["70 cm", "140 cm", "Obturateurs", "485", "BK65"],
    ["70 cm", "140 cm", "Échancrure",  "490", "DP40"],
    ["70 cm", "143 cm", "Obturateurs", "490", "BY46"],
    ["70 cm", "143 cm", "Échancrure",  "495", "ED64"],
    ["70 cm", "160 cm", "Obturateurs", "495", "BT27"],
    ["70 cm", "160 cm", "Échancrure",  "500", "DP41"],
    ["70 cm", "163 cm", "Obturateurs", "500", "BY47"],
    ["70 cm", "163 cm", "Échancrure",  "505", "ED65"],
    // P80 (gamme complète)
    ["80 cm", "120 cm", "Obturateurs", "480", "BU58"],
    ["80 cm", "120 cm", "Échancrure",  "485", "DP42"],
    ["80 cm", "120 cm", "TAC",         "560", "DE43"],
    ["80 cm", "140 cm", "Obturateurs", "490", "BP16"],
    ["80 cm", "140 cm", "Échancrure",  "495", "DP43"],
    ["80 cm", "140 cm", "TAC",         "570", "DE44"],
    ["80 cm", "143 cm", "Obturateurs", "495", "EG87"],
    ["80 cm", "143 cm", "Échancrure",  "500", "EG89"],
    ["80 cm", "160 cm", "Obturateurs", "500", "BN09"],
    ["80 cm", "160 cm", "Échancrure",  "505", "DP44"],
    ["80 cm", "160 cm", "TAC",         "580", "DE45"],
    ["80 cm", "163 cm", "Obturateurs", "505", "EG88"],
    ["80 cm", "163 cm", "Échancrure",  "510", "EG90"],
    ["80 cm", "180 cm", "Obturateurs", "510", "BN10"],
    ["80 cm", "180 cm", "Échancrure",  "515", "DP45"],
    ["80 cm", "180 cm", "TAC",         "590", "DE46"],
  ];

  const declinaisons = rows.map(([profondeur, longueur, type, prix, ref]) => ({
    id: uid(),
    valeurs: { profondeur, longueur, type },
    prixTarifHT: prix,
    prixVenteHT: "",
    prixVerrouille: false,
    referenceFournisseur: ref,
  }));

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeProfondeur, axeLongueur, axeType],
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
