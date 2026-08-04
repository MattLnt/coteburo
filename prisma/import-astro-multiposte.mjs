import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();

const NOM_PRODUIT = "Bureau multiposte";
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
  const axeProfondeur = { id: "profondeur", nom: "Profondeur", valeurs: ["143 cm", "163 cm"] };
  const axeLongueur   = { id: "longueur",   nom: "Longueur",   valeurs: ["120 cm", "140 cm", "160 cm", "180 cm"] };
  const axeType       = { id: "type",       nom: "Passage de câbles", valeurs: ["Obturateurs", "Échancrure", "TAC"] };
  const axePosition   = { id: "position",   nom: "Position",   valeurs: ["Départ", "Suivant"] };

  // valeurs: { profondeur, longueur, type, position } · prix = tarif fournisseur Buronomic
  const rows = [
    // P143 (Obturateurs / Échancrure, L120-L160 — pas de TAC, pas de L180)
    ["143 cm", "120 cm", "Obturateurs", "Départ",  "770", "BQ98"],
    ["143 cm", "140 cm", "Obturateurs", "Départ",  "790", "BR00"],
    ["143 cm", "160 cm", "Obturateurs", "Départ",  "810", "BR42"],
    ["143 cm", "120 cm", "Obturateurs", "Suivant", "640", "BQ99"],
    ["143 cm", "140 cm", "Obturateurs", "Suivant", "660", "BR01"],
    ["143 cm", "160 cm", "Obturateurs", "Suivant", "680", "BR43"],
    ["143 cm", "120 cm", "Échancrure",  "Départ",  "780", "BK69"],
    ["143 cm", "140 cm", "Échancrure",  "Départ",  "800", "BK70"],
    ["143 cm", "160 cm", "Échancrure",  "Départ",  "820", "BR44"],
    ["143 cm", "120 cm", "Échancrure",  "Suivant", "650", "BK71"],
    ["143 cm", "140 cm", "Échancrure",  "Suivant", "670", "BK72"],
    ["143 cm", "160 cm", "Échancrure",  "Suivant", "690", "BR45"],
    // P163 (gamme complète Obturateurs / Échancrure / TAC, L120-L180)
    ["163 cm", "120 cm", "Obturateurs", "Départ",  "780",  "BP17"],
    ["163 cm", "140 cm", "Obturateurs", "Départ",  "800",  "BU67"],
    ["163 cm", "160 cm", "Obturateurs", "Départ",  "820",  "BP18"],
    ["163 cm", "180 cm", "Obturateurs", "Départ",  "840",  "BP19"],
    ["163 cm", "120 cm", "Obturateurs", "Suivant", "650",  "BU68"],
    ["163 cm", "140 cm", "Obturateurs", "Suivant", "670",  "BU69"],
    ["163 cm", "160 cm", "Obturateurs", "Suivant", "690",  "BU70"],
    ["163 cm", "180 cm", "Obturateurs", "Suivant", "710",  "BU71"],
    ["163 cm", "120 cm", "Échancrure",  "Départ",  "790",  "BR46"],
    ["163 cm", "140 cm", "Échancrure",  "Départ",  "810",  "BR48"],
    ["163 cm", "160 cm", "Échancrure",  "Départ",  "830",  "BK75"],
    ["163 cm", "180 cm", "Échancrure",  "Départ",  "850",  "BK76"],
    ["163 cm", "120 cm", "Échancrure",  "Suivant", "660",  "BR47"],
    ["163 cm", "140 cm", "Échancrure",  "Suivant", "680",  "BR49"],
    ["163 cm", "160 cm", "Échancrure",  "Suivant", "700",  "BK77"],
    ["163 cm", "180 cm", "Échancrure",  "Suivant", "720",  "BK78"],
    ["163 cm", "120 cm", "TAC",         "Départ",  "940",  "DE47"],
    ["163 cm", "140 cm", "TAC",         "Départ",  "960",  "DE48"],
    ["163 cm", "160 cm", "TAC",         "Départ",  "980",  "DE49"],
    ["163 cm", "180 cm", "TAC",         "Départ",  "1000", "DE50"],
    ["163 cm", "120 cm", "TAC",         "Suivant", "810",  "DE51"],
    ["163 cm", "140 cm", "TAC",         "Suivant", "830",  "DE52"],
    ["163 cm", "160 cm", "TAC",         "Suivant", "850",  "DE53"],
    ["163 cm", "180 cm", "TAC",         "Suivant", "870",  "DE54"],
  ];

  const declinaisons = rows.map(([profondeur, longueur, type, position, prix, ref]) => ({
    id: uid(),
    valeurs: { profondeur, longueur, type, position },
    prixTarifHT: prix,
    prixVenteHT: "",
    prixVerrouille: false,
    referenceFournisseur: ref,
  }));

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [axeProfondeur, axeLongueur, axeType, axePosition],
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
