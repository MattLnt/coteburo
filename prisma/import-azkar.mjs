import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Azkar";

// Palette d'aperçu tissu (générique — à affiner avec le vrai nuancier Sokoa)
const COLORIS = [
  { nom: "Noir", couleur: "#23262a", ordre: 0 },
  { nom: "Gris anthracite", couleur: "#4a4d52", ordre: 1 },
  { nom: "Gris clair", couleur: "#b7b9bc", ordre: 2 },
  { nom: "Bleu marine", couleur: "#2b3a55", ordre: 3 },
  { nom: "Bleu", couleur: "#3f6fa3", ordre: 4 },
  { nom: "Vert d'eau", couleur: "#6ea3a0", ordre: 5 },
  { nom: "Vert", couleur: "#4a6b4a", ordre: 6 },
  { nom: "Bordeaux", couleur: "#6b2530", ordre: 7 },
  { nom: "Rouge", couleur: "#9e2b25", ordre: 8 },
  { nom: "Orange", couleur: "#c8892f", ordre: 9 },
  { nom: "Beige", couleur: "#cbb89a", ordre: 10 },
  { nom: "Marron", couleur: "#6b4a35", ordre: 11 }
];

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable. Gammes existantes :`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm("Fauteuil de direction"));
  if (!v) {
    console.error(`⚠ Produit "Fauteuil de direction" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun — crée-le d'abord)"}`);
    process.exit(1);
  }

  const decl = [
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs 4D",tissu:"B"},1342,"AK77/55"),
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs 4D",tissu:"B+"},1347,"AK77/55"),
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs 4D",tissu:"C"},1352,"AK77/55"),
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs 4D",tissu:"D"},1372,"AK77/55"),
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs 4D",tissu:"E"},1472,"AK77/55"),
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs 4D",tissu:"H"},1522,"AK77/55"),
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"B"},1329,"AK77/51"),
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"B+"},1334,"AK77/51"),
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"C"},1339,"AK77/51"),
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"D"},1359,"AK77/51"),
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"E"},1459,"AK77/51"),
      mk({tetiere:"Avec têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"H"},1509,"AK77/51"),
      mk({tetiere:"Avec têtière",accotoirs:"Sans accotoirs",tissu:"B"},1220,"AK77/50"),
      mk({tetiere:"Avec têtière",accotoirs:"Sans accotoirs",tissu:"B+"},1225,"AK77/50"),
      mk({tetiere:"Avec têtière",accotoirs:"Sans accotoirs",tissu:"C"},1230,"AK77/50"),
      mk({tetiere:"Avec têtière",accotoirs:"Sans accotoirs",tissu:"D"},1250,"AK77/50"),
      mk({tetiere:"Avec têtière",accotoirs:"Sans accotoirs",tissu:"E"},1350,"AK77/50"),
      mk({tetiere:"Avec têtière",accotoirs:"Sans accotoirs",tissu:"H"},1400,"AK77/50"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs 4D",tissu:"B"},1286,"AK76/55"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs 4D",tissu:"B+"},1291,"AK76/55"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs 4D",tissu:"C"},1296,"AK76/55"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs 4D",tissu:"D"},1316,"AK76/55"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs 4D",tissu:"E"},1416,"AK76/55"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs 4D",tissu:"H"},1466,"AK76/55"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"B"},1273,"AK76/51"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"B+"},1278,"AK76/51"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"C"},1283,"AK76/51"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"D"},1303,"AK76/51"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"E"},1403,"AK76/51"),
      mk({tetiere:"Sans têtière",accotoirs:"Accotoirs fixes alu poli",tissu:"H"},1453,"AK76/51"),
      mk({tetiere:"Sans têtière",accotoirs:"Sans accotoirs",tissu:"B"},1164,"AK76/50"),
      mk({tetiere:"Sans têtière",accotoirs:"Sans accotoirs",tissu:"B+"},1169,"AK76/50"),
      mk({tetiere:"Sans têtière",accotoirs:"Sans accotoirs",tissu:"C"},1174,"AK76/50"),
      mk({tetiere:"Sans têtière",accotoirs:"Sans accotoirs",tissu:"D"},1194,"AK76/50"),
      mk({tetiere:"Sans têtière",accotoirs:"Sans accotoirs",tissu:"E"},1294,"AK76/50"),
      mk({tetiere:"Sans têtière",accotoirs:"Sans accotoirs",tissu:"H"},1344,"AK76/50"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "tetiere", nom: "Têtière", valeurs: ["Avec têtière","Sans têtière"] },
        { id: "accotoirs", nom: "Accotoirs", valeurs: ["Sans accotoirs","Accotoirs fixes alu poli","Accotoirs 4D"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["B","B+","C","D","E","H"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris (aperçu)", vitrineId: v.id, ordre: 0, finitions: { create: COLORIS } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions (${COLORIS.length} coloris aperçu)`);
  console.log(`\n✓ Gamme "${gamme.nom}" (Azkar direction) traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
