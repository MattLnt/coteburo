import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Loria";
const NOM_PRODUIT = "Tabouret";

const GROUPES = [
  { nom: "Finition piètement", ordre: 0, finitions: [
    { nom: "Époxy noir", couleur: "#23262a", ordre: 0 },
    { nom: "Chromé", couleur: "#c8ccd0", ordre: 1 }
  ] },
  { nom: "Coloris coque", ordre: 1, finitions: [
    { nom: "Noir", couleur: "#23262a", ordre: 0 },
    { nom: "Blanc plâtre", couleur: "#f2f0ec", ordre: 1 },
    { nom: "Bordeaux", couleur: "#6b2530", ordre: 2 },
    { nom: "Vert torrent", couleur: "#3f6f6a", ordre: 3 },
    { nom: "Rose quartz", couleur: "#d9a7a0", ordre: 4 },
    { nom: "Taupe", couleur: "#8b7d6b", ordre: 5 }
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
      mk({coque:"Sans accotoirs",garnissage:"Coque PP nue",tissu:"Sans tissu"},246,"LCHA"),
      mk({coque:"Sans accotoirs",garnissage:"Assise tapissée",tissu:"B"},296,"LCHB"),
      mk({coque:"Sans accotoirs",garnissage:"Assise tapissée",tissu:"B+"},299,"LCHB"),
      mk({coque:"Sans accotoirs",garnissage:"Assise tapissée",tissu:"C"},302,"LCHB"),
      mk({coque:"Sans accotoirs",garnissage:"Assise tapissée",tissu:"D"},310,"LCHB"),
      mk({coque:"Sans accotoirs",garnissage:"Assise + dos tapissés",tissu:"B"},384,"LCHC"),
      mk({coque:"Sans accotoirs",garnissage:"Assise + dos tapissés",tissu:"B+"},390,"LCHC"),
      mk({coque:"Sans accotoirs",garnissage:"Assise + dos tapissés",tissu:"C"},410,"LCHC"),
      mk({coque:"Sans accotoirs",garnissage:"Assise + dos tapissés",tissu:"D"},437,"LCHC"),
      mk({coque:"Avec accotoirs",garnissage:"Coque PP nue",tissu:"Sans tissu"},276,"LOHA"),
      mk({coque:"Avec accotoirs",garnissage:"Assise tapissée",tissu:"B"},326,"LOHB"),
      mk({coque:"Avec accotoirs",garnissage:"Assise tapissée",tissu:"B+"},329,"LOHB"),
      mk({coque:"Avec accotoirs",garnissage:"Assise tapissée",tissu:"C"},332,"LOHB"),
      mk({coque:"Avec accotoirs",garnissage:"Assise tapissée",tissu:"D"},340,"LOHB"),
      mk({coque:"Avec accotoirs",garnissage:"Assise + dos tapissés",tissu:"B"},472,"LOHC"),
      mk({coque:"Avec accotoirs",garnissage:"Assise + dos tapissés",tissu:"B+"},480,"LOHC"),
      mk({coque:"Avec accotoirs",garnissage:"Assise + dos tapissés",tissu:"C"},495,"LOHC"),
      mk({coque:"Avec accotoirs",garnissage:"Assise + dos tapissés",tissu:"D"},535,"LOHC"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "coque", nom: "Coque", valeurs: ["Sans accotoirs","Avec accotoirs"] },
        { id: "garnissage", nom: "Garnissage", valeurs: ["Coque PP nue","Assise tapissée","Assise + dos tapissés"] },
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
  console.log(`\n✓ Tabouret Loria traité — gamme Loria complète (Chaise, Fauteuil, Tabouret).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
