import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Adela";
const NOM_PRODUIT = "Chaise";

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
      mk({pietement:"4 pieds",garnissage:"Tapissé (assise + dos)",tissu:"B"},255,"ALA0/4N"),
      mk({pietement:"4 pieds",garnissage:"Tapissé (assise + dos)",tissu:"B+"},259,"ALA0/4N"),
      mk({pietement:"4 pieds",garnissage:"Tapissé (assise + dos)",tissu:"C"},263,"ALA0/4N"),
      mk({pietement:"4 pieds",garnissage:"Tapissé (assise + dos)",tissu:"D"},267,"ALA0/4N"),
      mk({pietement:"Traîneau",garnissage:"Tapissé (assise + dos)",tissu:"B"},265,"ALE0/4N"),
      mk({pietement:"Traîneau",garnissage:"Tapissé (assise + dos)",tissu:"B+"},269,"ALE0/4N"),
      mk({pietement:"Traîneau",garnissage:"Tapissé (assise + dos)",tissu:"C"},273,"ALE0/4N"),
      mk({pietement:"Traîneau",garnissage:"Tapissé (assise + dos)",tissu:"D"},277,"ALE0/4N"),
      mk({pietement:"Central 5 branches",garnissage:"Tapissé (assise + dos)",tissu:"B"},331,"ALJO/5N"),
      mk({pietement:"Central 5 branches",garnissage:"Tapissé (assise + dos)",tissu:"B+"},337,"ALJO/5N"),
      mk({pietement:"Central 5 branches",garnissage:"Tapissé (assise + dos)",tissu:"C"},343,"ALJO/5N"),
      mk({pietement:"Central 5 branches",garnissage:"Tapissé (assise + dos)",tissu:"D"},349,"ALJO/5N"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos résille",tissu:"B"},216,"ALB0/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos résille",tissu:"B+"},219,"ALB0/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos résille",tissu:"C"},223,"ALB0/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos résille",tissu:"D"},226,"ALB0/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos résille",tissu:"B"},226,"ALF0/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos résille",tissu:"B+"},229,"ALF0/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos résille",tissu:"C"},233,"ALF0/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos résille",tissu:"D"},236,"ALF0/4"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos résille",tissu:"B"},292,"ALK0/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos résille",tissu:"B+"},297,"ALK0/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos résille",tissu:"C"},303,"ALK0/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos résille",tissu:"D"},309,"ALK0/5"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos PP",tissu:"B"},177,"ALB0/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos PP",tissu:"B+"},180,"ALB0/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos PP",tissu:"C"},184,"ALB0/4"),
      mk({pietement:"4 pieds",garnissage:"Assise tapissée, dos PP",tissu:"D"},187,"ALB0/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos PP",tissu:"B"},187,"ALF0/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos PP",tissu:"B+"},190,"ALF0/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos PP",tissu:"C"},194,"ALF0/4"),
      mk({pietement:"Traîneau",garnissage:"Assise tapissée, dos PP",tissu:"D"},197,"ALF0/4"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos PP",tissu:"B"},255,"ALK0/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos PP",tissu:"B+"},260,"ALK0/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos PP",tissu:"C"},266,"ALK0/5"),
      mk({pietement:"Central 5 branches",garnissage:"Assise tapissée, dos PP",tissu:"D"},272,"ALK0/5"),
      mk({pietement:"4 pieds",garnissage:"Tout PP",tissu:"Sans tissu"},151,"ALA0/4"),
      mk({pietement:"Traîneau",garnissage:"Tout PP",tissu:"Sans tissu"},161,"ALE0/4"),
      mk({pietement:"Central 5 branches",garnissage:"Tout PP",tissu:"Sans tissu"},229,"ALJ0/5"),
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
  console.log(`\n✓ Chaise Adela traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
