import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Wimax Ergo";

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
  const v = produits.find((p) => norm(p.nom) === norm("Siège ergonomique"));
  if (!v) {
    console.error(`⚠ Produit "Siège ergonomique" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun — crée-le d'abord)"}`);
    process.exit(1);
  }

  const decl = [
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"B"},1055,"WE37F58"),
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"B+"},1060,"WE37F58"),
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"C"},1065,"WE37F58"),
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"D"},1085,"WE37F58"),
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"B"},927,"WE37F5P"),
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"B+"},932,"WE37F5P"),
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"C"},937,"WE37F5P"),
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"D"},957,"WE37F5P"),
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Sans accotoirs",tissu:"B"},766,"WE37F50"),
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Sans accotoirs",tissu:"B+"},771,"WE37F50"),
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Sans accotoirs",tissu:"C"},776,"WE37F50"),
      mk({dossier:"Tapissé",version:"Haut dossier + têtière",accotoirs:"Sans accotoirs",tissu:"D"},796,"WE37F50"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Accotoirs 4D cuir",tissu:"B"},1015,"WE36F58"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Accotoirs 4D cuir",tissu:"B+"},1020,"WE36F58"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Accotoirs 4D cuir",tissu:"C"},1025,"WE36F58"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Accotoirs 4D cuir",tissu:"D"},1045,"WE36F58"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Accotoirs 4D PU",tissu:"B"},887,"WE36F5P"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Accotoirs 4D PU",tissu:"B+"},892,"WE36F5P"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Accotoirs 4D PU",tissu:"C"},897,"WE36F5P"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Accotoirs 4D PU",tissu:"D"},917,"WE36F5P"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Sans accotoirs",tissu:"B"},726,"WE36F50"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Sans accotoirs",tissu:"B+"},731,"WE36F50"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Sans accotoirs",tissu:"C"},736,"WE36F50"),
      mk({dossier:"Tapissé",version:"Haut dossier",accotoirs:"Sans accotoirs",tissu:"D"},756,"WE36F50"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"B"},1065,"WE34F58"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"B+"},1069,"WE34F58"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"C"},1074,"WE34F58"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"D"},1094,"WE34F58"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"B"},937,"WE34F5P"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"B+"},941,"WE34F5P"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"C"},946,"WE34F5P"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"D"},966,"WE34F5P"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Sans accotoirs",tissu:"B"},776,"WE34F50"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Sans accotoirs",tissu:"B+"},780,"WE34F50"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Sans accotoirs",tissu:"C"},785,"WE34F50"),
      mk({dossier:"Tapissé",version:"Moyen dossier + têtière",accotoirs:"Sans accotoirs",tissu:"D"},805,"WE34F50"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"B"},912,"WI37F58"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"B+"},915,"WI37F58"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"C"},919,"WI37F58"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D cuir",tissu:"D"},929,"WI37F58"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"B"},784,"WI37F5P"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"B+"},787,"WI37F5P"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"C"},791,"WI37F5P"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Accotoirs 4D PU",tissu:"D"},801,"WI37F5P"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Sans accotoirs",tissu:"B"},623,"WI37F50"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Sans accotoirs",tissu:"B+"},626,"WI37F50"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Sans accotoirs",tissu:"C"},630,"WI37F50"),
      mk({dossier:"Résille",version:"Haut dossier + têtière",accotoirs:"Sans accotoirs",tissu:"D"},640,"WI37F50"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Accotoirs 4D cuir",tissu:"B"},826,"WI36F58"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Accotoirs 4D cuir",tissu:"B+"},829,"WI36F58"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Accotoirs 4D cuir",tissu:"C"},832,"WI36F58"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Accotoirs 4D cuir",tissu:"D"},842,"WI36F58"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Accotoirs 4D PU",tissu:"B"},698,"WI36F5P"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Accotoirs 4D PU",tissu:"B+"},701,"WI36F5P"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Accotoirs 4D PU",tissu:"C"},704,"WI36F5P"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Accotoirs 4D PU",tissu:"D"},714,"WI36F5P"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Sans accotoirs",tissu:"B"},537,"WI36F50"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Sans accotoirs",tissu:"B+"},540,"WI36F50"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Sans accotoirs",tissu:"C"},543,"WI36F50"),
      mk({dossier:"Résille",version:"Haut dossier",accotoirs:"Sans accotoirs",tissu:"D"},553,"WI36F50"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "dossier", nom: "Dossier", valeurs: ["Tapissé","Résille"] },
        { id: "version", nom: "Version", valeurs: ["Haut dossier + têtière","Haut dossier","Moyen dossier + têtière"] },
        { id: "accotoirs", nom: "Accotoirs", valeurs: ["Accotoirs 4D cuir","Accotoirs 4D PU","Sans accotoirs"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["B","B+","C","D"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris (aperçu)", vitrineId: v.id, ordre: 0, finitions: { create: COLORIS } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions (${COLORIS.length} coloris aperçu)`);
  console.log(`\n✓ Gamme "${gamme.nom}" (Wi-Max Ergo) traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
