import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Luz";

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
  const v = produits.find((p) => norm(p.nom) === norm("Siège opérateur"));
  if (!v) {
    console.error(`⚠ Produit "Siège opérateur" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun — crée-le d'abord)"}`);
    process.exit(1);
  }

  const decl = [
      mk({accotoirs:"Accotoirs 3D",tissu:"B"},350,"LU76/15"),
      mk({accotoirs:"Accotoirs 3D",tissu:"B+"},354,"LU76/15"),
      mk({accotoirs:"Accotoirs 3D",tissu:"C"},358,"LU76/15"),
      mk({accotoirs:"Accotoirs 3D",tissu:"D"},370,"LU76/15"),
      mk({accotoirs:"Accotoirs 1D",tissu:"B"},327,"LU76/17"),
      mk({accotoirs:"Accotoirs 1D",tissu:"B+"},331,"LU76/17"),
      mk({accotoirs:"Accotoirs 1D",tissu:"C"},335,"LU76/17"),
      mk({accotoirs:"Accotoirs 1D",tissu:"D"},347,"LU76/17"),
      mk({accotoirs:"Sans accotoirs",tissu:"B"},287,"LU76/10"),
      mk({accotoirs:"Sans accotoirs",tissu:"B+"},291,"LU76/10"),
      mk({accotoirs:"Sans accotoirs",tissu:"C"},295,"LU76/10"),
      mk({accotoirs:"Sans accotoirs",tissu:"D"},307,"LU76/10"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "accotoirs", nom: "Accotoirs", valeurs: ["Accotoirs 3D","Accotoirs 1D","Sans accotoirs"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["B","B+","C","D"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris (aperçu)", vitrineId: v.id, ordre: 0, finitions: { create: COLORIS } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions (${COLORIS.length} coloris aperçu)`);
  console.log(`\n✓ Gamme "${gamme.nom}" (Luz collaboratif) traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
