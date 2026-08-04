import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Adela";
const NOM_PRODUIT = "Tabouret";

const GROUPES = [
  { nom: "Coloris dossier résille", ordre: 0, finitions: [
    { nom: "Noir", couleur: "#23262a", ordre: 0 },
    { nom: "Gris clair", couleur: "#b7b9bc", ordre: 1 },
    { nom: "Blanc pur", couleur: "#f2f0ec", ordre: 2 }
  ] },
  { nom: "Coloris PP", ordre: 1, finitions: [
    { nom: "Noir", couleur: "#23262a", ordre: 0 },
    { nom: "Blanc", couleur: "#f2f0ec", ordre: 1 },
    { nom: "Gris", couleur: "#8b8d90", ordre: 2 },
    { nom: "Bordeaux", couleur: "#6b2530", ordre: 3 }
  ] },
];

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm(NOM_PRODUIT));
  if (!v) {
    console.error(`⚠ Produit "${NOM_PRODUIT}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun — crée-le d'abord)"}`);
    process.exit(1);
  }

  const decl = [
      mk({garnissage:"Tapissé (assise + dos)",tissu:"B"},383,"ALG0/4N"),
      mk({garnissage:"Tapissé (assise + dos)",tissu:"B+"},388,"ALG0/4N"),
      mk({garnissage:"Tapissé (assise + dos)",tissu:"C"},394,"ALG0/4N"),
      mk({garnissage:"Tapissé (assise + dos)",tissu:"D"},400,"ALG0/4N"),
      mk({garnissage:"Assise tapissée, dos résille",tissu:"B"},332,"ALH0/4"),
      mk({garnissage:"Assise tapissée, dos résille",tissu:"B+"},337,"ALH0/4"),
      mk({garnissage:"Assise tapissée, dos résille",tissu:"C"},342,"ALH0/4"),
      mk({garnissage:"Assise tapissée, dos résille",tissu:"D"},347,"ALH0/4"),
      mk({garnissage:"Assise tapissée, dos PP",tissu:"B"},304,"ALH0/4"),
      mk({garnissage:"Assise tapissée, dos PP",tissu:"B+"},309,"ALH0/4"),
      mk({garnissage:"Assise tapissée, dos PP",tissu:"C"},314,"ALH0/4"),
      mk({garnissage:"Assise tapissée, dos PP",tissu:"D"},319,"ALH0/4"),
      mk({garnissage:"Tout PP",tissu:"Sans tissu"},275,"ALG0/4"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "garnissage", nom: "Garnissage", valeurs: ["Tapissé (assise + dos)","Assise tapissée, dos résille","Assise tapissée, dos PP","Tout PP"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["Sans tissu","B","B+","C","D"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  for (const g of GROUPES) {
    await prisma.groupeFinition.create({ data: { nom: g.nom, vitrineId: v.id, ordre: g.ordre, finitions: { create: g.finitions } } });
  }
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons + ${GROUPES.length} groupes de finitions`);
  console.log(`\n✓ Tabouret Adela traité — gamme Adela complète (Chaise, Fauteuil, Tabouret).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
