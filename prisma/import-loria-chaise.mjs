import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Loria";
const NOM_PRODUIT = "Chaise";

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
      mk({pietement:"4 pieds métal",garnissage:"Coque PP nue",tissu:"Sans tissu"},129,"LCA0"),
      mk({pietement:"4 pieds métal",garnissage:"Assise tapissée",tissu:"B"},179,"LCB0"),
      mk({pietement:"4 pieds métal",garnissage:"Assise tapissée",tissu:"B+"},182,"LCB0"),
      mk({pietement:"4 pieds métal",garnissage:"Assise tapissée",tissu:"C"},185,"LCB0"),
      mk({pietement:"4 pieds métal",garnissage:"Assise tapissée",tissu:"D"},193,"LCB0"),
      mk({pietement:"4 pieds bois",garnissage:"Coque PP nue",tissu:"Sans tissu"},364,"LCAB/B"),
      mk({pietement:"4 pieds bois",garnissage:"Assise tapissée",tissu:"B"},414,"LCBB/B"),
      mk({pietement:"4 pieds bois",garnissage:"Assise tapissée",tissu:"B+"},417,"LCBB/B"),
      mk({pietement:"4 pieds bois",garnissage:"Assise tapissée",tissu:"C"},420,"LCBB/B"),
      mk({pietement:"4 pieds bois",garnissage:"Assise tapissée",tissu:"D"},428,"LCBB/B"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Coque PP nue",tissu:"Sans tissu"},129,"LCAB"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise tapissée",tissu:"B"},179,"LCBB"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise tapissée",tissu:"B+"},182,"LCBB"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise tapissée",tissu:"C"},185,"LCBB"),
      mk({pietement:"4 pieds PP (outdoor)",garnissage:"Assise tapissée",tissu:"D"},193,"LCBB"),
      mk({pietement:"Giratoire roulettes",garnissage:"Coque PP nue",tissu:"Sans tissu"},224,"LCJ0 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise tapissée",tissu:"B"},274,"LCK0 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise tapissée",tissu:"B+"},277,"LCK0 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise tapissée",tissu:"C"},280,"LCK0 /000"),
      mk({pietement:"Giratoire roulettes",garnissage:"Assise tapissée",tissu:"D"},288,"LCK0 /000"),
      mk({pietement:"Giratoire patins",garnissage:"Coque PP nue",tissu:"Sans tissu"},232,"LCJ0 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise tapissée",tissu:"B"},282,"LCK0 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise tapissée",tissu:"B+"},285,"LCK0 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise tapissée",tissu:"C"},288,"LCK0 /010"),
      mk({pietement:"Giratoire patins",garnissage:"Assise tapissée",tissu:"D"},296,"LCK0 /010"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "pietement", nom: "Piètement", valeurs: ["4 pieds métal","4 pieds bois","4 pieds PP (outdoor)","Giratoire roulettes","Giratoire patins"] },
        { id: "garnissage", nom: "Garnissage", valeurs: ["Coque PP nue","Assise tapissée"] },
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
  console.log(`\n✓ Chaise Loria traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
