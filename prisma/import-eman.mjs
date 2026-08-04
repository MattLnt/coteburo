import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Eman";

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
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B"},880,"NT87/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B+"},885,"NT87/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"C"},890,"NT87/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"D"},905,"NT87/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"E"},980,"NT87/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"H"},1035,"NT87/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B"},870,"NT17/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B+"},875,"NT17/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"C"},880,"NT17/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"D"},895,"NT17/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"E"},970,"NT17/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"H"},1025,"NT17/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B"},813,"NT86/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B+"},818,"NT86/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"C"},823,"NT86/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"D"},838,"NT86/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"E"},908,"NT86/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"H"},958,"NT86/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B"},803,"NT16/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B+"},808,"NT16/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"C"},813,"NT16/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"D"},828,"NT16/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"E"},898,"NT16/K0"),
      mk({dossier:"Tapissé",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"H"},948,"NT16/K0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B"},916,"NH87/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B+"},921,"NH87/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"C"},926,"NH87/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"D"},941,"NH87/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"E"},1016,"NH87/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"H"},1071,"NH87/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B"},906,"NH17/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B+"},911,"NH17/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"C"},916,"NH17/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"D"},931,"NH17/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"E"},1006,"NH17/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"H"},1061,"NH17/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B"},849,"NH86/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B+"},854,"NH86/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"C"},859,"NH86/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"D"},874,"NH86/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"E"},944,"NH86/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"H"},994,"NH86/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B"},839,"NH16/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B+"},844,"NH16/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"C"},849,"NH16/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"D"},864,"NH16/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"E"},934,"NH16/J0"),
      mk({dossier:"Tapissé",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"H"},984,"NH16/J0"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B"},865,"NR87/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B+"},870,"NR87/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"C"},875,"NR87/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"D"},890,"NR87/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"E"},910,"NR87/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"H"},945,"NR87/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B"},855,"NR17/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B+"},860,"NR17/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"C"},865,"NR17/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"D"},880,"NR17/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"E"},900,"NR17/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"H"},935,"NR17/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B"},798,"NR86/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B+"},803,"NR86/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"C"},808,"NR86/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"D"},823,"NR86/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"E"},838,"NR86/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"H"},868,"NR86/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B"},788,"NR16/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B+"},793,"NR16/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"C"},798,"NR16/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"D"},813,"NR16/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"E"},828,"NR16/K"),
      mk({dossier:"Résille",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"H"},858,"NR16/K"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B"},899,"NL87/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B+"},904,"NL87/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"C"},909,"NL87/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"D"},924,"NL87/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"E"},944,"NL87/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"H"},979,"NL87/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B"},889,"NL17/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B+"},894,"NL17/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"C"},899,"NL17/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"D"},914,"NL17/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"E"},934,"NL17/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"H"},969,"NL17/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B"},832,"NL86/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B+"},837,"NL86/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"C"},842,"NL86/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"D"},857,"NL86/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"E"},872,"NL86/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"H"},902,"NL86/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B"},822,"NL16/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B+"},827,"NL16/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"C"},832,"NL16/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"D"},847,"NL16/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"E"},862,"NL16/J"),
      mk({dossier:"Résille",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"H"},892,"NL16/J"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B"},865,"NN87/K"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B+"},870,"NN87/K"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"C"},875,"NN87/K"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B"},855,"NN17/K"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B+"},860,"NN17/K"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"C"},865,"NN17/K"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B"},798,"NN86/K"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B+"},803,"NN86/K"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"C"},808,"NN86/K"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B"},788,"NN16/K"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B+"},793,"NN16/K"),
      mk({dossier:"Toile",coque:"Noir",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"C"},798,"NN16/K"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B"},899,"NB87/J"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"B+"},904,"NB87/J"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro automatique",tissu:"C"},909,"NB87/J"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B"},889,"NB17/J"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"B+"},894,"NB17/J"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Avec têtière",meca:"Synchro Plus",tissu:"C"},899,"NB17/J"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B"},832,"NB86/J"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"B+"},837,"NB86/J"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro automatique",tissu:"C"},842,"NB86/J"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B"},822,"NB16/J"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"B+"},827,"NB16/J"),
      mk({dossier:"Toile",coque:"Blanc",tetiere:"Sans têtière",meca:"Synchro Plus",tissu:"C"},832,"NB16/J"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "dossier", nom: "Dossier", valeurs: ["Tapissé","Résille","Toile"] },
        { id: "coque", nom: "Coque", valeurs: ["Noir","Blanc"] },
        { id: "tetiere", nom: "Têtière", valeurs: ["Avec têtière","Sans têtière"] },
        { id: "meca", nom: "Mécanisme", valeurs: ["Synchro automatique","Synchro Plus"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["B","B+","C","D","E","H"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris (aperçu)", vitrineId: v.id, ordre: 0, finitions: { create: COLORIS } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions (${COLORIS.length} coloris aperçu)`);
  console.log(`\n✓ Gamme "${gamme.nom}" (Eman direction) traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
