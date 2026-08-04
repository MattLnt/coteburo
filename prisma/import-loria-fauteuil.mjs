import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Loria";
const NOM_PRODUIT = "Fauteuil";

const GROUPES = [
  { nom: "Finition piètement métal", ordre: 0, finitions: [
    { nom: "Époxy noir", couleur: "#23262a", ordre: 0 },
    { nom: "Époxy blanc", couleur: "#f2f0ec", ordre: 1 },
    { nom: "Chromé", couleur: "#c8ccd0", ordre: 2 }
  ] },
  { nom: "Coloris pieds PP (outdoor)", ordre: 1, finitions: [
    { nom: "Blanc ciment", couleur: "#e8e6df", ordre: 0 },
    { nom: "Vert foncé", couleur: "#3a5241", ordre: 1 },
    { nom: "Taupe", couleur: "#8b7d6b", ordre: 2 },
    { nom: "Bordeaux foncé", couleur: "#5a2028", ordre: 3 },
    { nom: "Noir graphite", couleur: "#2b2d30", ordre: 4 }
  ] },
  { nom: "Coloris coque", ordre: 2, finitions: [
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
      mk({pietement:"4 pieds métal",garnissage:"Coque PP nue",tissu:"Sans tissu"},159,"LOA1"),
      mk({pietement:"4 pieds métal",garnissage:"Assise tapissée",tissu:"B"},209,"LOB1"),
      mk({pietement:"4 pieds métal",garnissage:"Assise tapissée",tissu:"B+"},212,"LOB1"),
      mk({pietement:"4 pieds métal",garnissage:"Assise tapissée",tissu:"C"},215,"LOB1"),
      mk({pietement:"4 pieds métal",garnissage:"Assise tapissée",tissu:"D"},223,"LOB1"),
      mk({pietement:"4 pieds métal",garnissage:"Assise + dos tapissés",tissu:"B"},414,"LOC1/10"),
      mk({pietement:"4 pieds métal",garnissage:"Assise + dos tapissés",tissu:"B+"},420,"LOC1/10"),
      mk({pietement:"4 pieds métal",garnissage:"Assise + dos tapissés",tissu:"C"},440,"LOC1/10"),
      mk({pietement:"4 pieds métal",garnissage:"Assise + dos tapissés",tissu:"D"},468,"LOC1/10"),
      mk({pietement:"4 pieds bois",garnissage:"Coque PP nue",tissu:"Sans tissu"},394,"LOA1/B"),
      mk({pietement:"4 pieds bois",garnissage:"Assise tapissée",tissu:"B"},444,"LOB1/B"),
      mk({pietement:"4 pieds bois",garnissage:"Assise tapissée",tissu:"B+"},447,"LOB1/B"),
      mk({pietement:"4 pieds bois",garnissage:"Assise tapissée",tissu:"C"},450,"LOB1/B"),
      mk({pietement:"4 pieds bois",garnissage:"Assise tapissée",tissu:"D"},458,"LOB1/B"),
      mk({pietement:"4 pieds bois",garnissage:"Assise + dos tapissés",tissu:"B"},649,"LOC1/B0"),
      mk({pietement:"4 pieds bois",garnissage:"Assise + dos tapissés",tissu:"B+"},655,"LOC1/B0"),
      mk({pietement:"4 pieds bois",garnissage:"Assise + dos tapissés",tissu:"C"},675,"LOC1/B0"),
      mk({pietement:"4 pieds bois",garnissage:"Assise + dos tapissés",tissu:"D"},703,"LOC1/B0"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Coque PP nue",tissu:"Sans tissu"},159,"LOA1"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise tapissée",tissu:"B"},209,"LOB1"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise tapissée",tissu:"B+"},212,"LOB1"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise tapissée",tissu:"C"},215,"LOB1"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise tapissée",tissu:"D"},223,"LOB1"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise + dos tapissés",tissu:"B"},414,"LOC1"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise + dos tapissés",tissu:"B+"},420,"LOC1"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise + dos tapissés",tissu:"C"},440,"LOC1"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise + dos tapissés",tissu:"D"},468,"LOC1"),
      mk({pietement:"Giratoire roulettes",garnissage:"Coque PP nue",tissu:"Sans tissu"},254,"LOJ1 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise tapissée",tissu:"B"},304,"LOK1 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise tapissée",tissu:"B+"},307,"LOK1 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise tapissée",tissu:"C"},310,"LOK1 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise tapissée",tissu:"D"},318,"LOK1 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise + dos tapissés",tissu:"B"},509,"LOL1 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise + dos tapissés",tissu:"B+"},515,"LOL1 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise + dos tapissés",tissu:"C"},535,"LOL1 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise + dos tapissés",tissu:"D"},563,"LOL1 /000"),
      mk({pietement:"Giratoire patins",garnissage:"Coque PP nue",tissu:"Sans tissu"},262,"LOJ1 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise tapissée",tissu:"B"},312,"LOK1 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise tapissée",tissu:"B+"},315,"LOK1 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise tapissée",tissu:"C"},318,"LOK1 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise tapissée",tissu:"D"},326,"LOK1 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise + dos tapissés",tissu:"B"},517,"LOL1 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise + dos tapissés",tissu:"B+"},523,"LOL1 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise + dos tapissés",tissu:"C"},543,"LOL1 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise + dos tapissés",tissu:"D"},571,"LOL1 /010"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "pietement", nom: "Piètement", valeurs: ["4 pieds métal","4 pieds bois","4 pieds PP (outdoor)","Giratoire roulettes","Giratoire patins"] },
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
  console.log(`\n✓ Fauteuil Loria traité.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
