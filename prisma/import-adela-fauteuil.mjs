import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Adela";
const NOM_PRODUIT = "Fauteuil";

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
      mk({pietement:"4 pieds",garnissage:"Tapissé (assise + dos)",tissu:"B"},294,"ALA1/4N"),
      mk({pietement:"4 pieds",garnissage:"Tapissé (assise + dos)",tissu:"B+"},298,"ALA1/4N"),
      mk({pietement:"4 pieds",garnissage:"Tapissé (assise + dos)",tissu:"C"},302,"ALA1/4N"),
      mk({pietement:"4 pieds",garnissage:"Tapissé (assise + dos)",tissu:"D"},306,"ALA1/4N"),
      mk({pietement:"Traîneau",garnissage:"Tapissé (assise + dos)",tissu:"B"},304,"ALE1/4N"),
      mk({pietement:"Traîneau",garnissage:"Tapissé (assise + dos)",tissu:"B+"},308,"ALE1/4N"),
      mk({pietement:"Traîneau",garnissage:"Tapissé (assise + dos)",tissu:"C"},312,"ALE1/4N"),
      mk({pietement:"Traîneau",garnissage:"Tapissé (assise + dos)",tissu:"D"},316,"ALE1/4N"),
      mk({pietement:"Central 5 branches",garnissage:"Tapissé (assise + dos)",tissu:"B"},373,"ALJ1/5N"),
      mk({pietement:"Central 5 branches",garnissage:"Tapissé (assise + dos)",tissu:"B+"},379,"ALJ1/5N"),
      mk({pietement:"Central 5 branches",garnissage:"Tapissé (assise + dos)",tissu:"C"},385,"ALJ1/5N"),
      mk({pietement:"Central 5 branches",garnissage:"Tapissé (assise + dos)",tissu:"D"},391,"ALJ1/5N"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos résille",tissu:"B"},255,"ALB1/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos résille",tissu:"B+"},258,"ALB1/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos résille",tissu:"C"},262,"ALB1/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos résille",tissu:"D"},265,"ALB1/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos résille",tissu:"B"},265,"ALF1/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos résille",tissu:"B+"},268,"ALF1/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos résille",tissu:"C"},272,"ALF1/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos résille",tissu:"D"},275,"ALF1/4"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos résille",tissu:"B"},334,"ALK1/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos résille",tissu:"B+"},339,"ALK1/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos résille",tissu:"C"},345,"ALK1/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos résille",tissu:"D"},351,"ALK1/5"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos PP",tissu:"B"},216,"ALB1/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos PP",tissu:"B+"},219,"ALB1/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos PP",tissu:"C"},223,"ALB1/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos PP",tissu:"D"},226,"ALB1/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos PP",tissu:"B"},226,"ALF1/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos PP",tissu:"B+"},229,"ALF1/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos PP",tissu:"C"},233,"ALF1/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos PP",tissu:"D"},236,"ALF1/4"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos PP",tissu:"B"},297,"ALK1/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos PP",tissu:"B+"},302,"ALK1/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos PP",tissu:"C"},308,"ALK1/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos PP",tissu:"D"},314,"ALK1/5"),
      mk({pietement:"4 pieds",garnissage:"Tout PP",tissu:"Sans tissu"},190,"ALA1/4"),
      mk({pietement:"Traîneau",garnissage:"Tout PP",tissu:"Sans tissu"},200,"ALE1/4"),
      mk({pietement:"Central 5 branches",garnissage:"Tout PP",tissu:"Sans tissu"},271,"ALJ1/5"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "pietement", nom: "Piètement", valeurs: ["4 pieds","Traîneau","Central 5 branches"] },
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
  console.log(`\n✓ Fauteuil Adela traité.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
