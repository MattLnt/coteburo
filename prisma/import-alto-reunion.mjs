import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Alto Réunion";

const PIED = [
    { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 0 },
    { nom: "Noir métal", couleur: "#23262a", ordre: 1 },
    { nom: "Ocre", couleur: "#c8892f", ordre: 2 },
    { nom: "Vert amande", couleur: "#9cae7e", ordre: 3 }
];
const PLATEAU = [
    { nom: "Blanc", couleur: "#f2f0ec", ordre: 0 },
    { nom: "Chêne fil", couleur: "#c9a876", ordre: 1 },
    { nom: "Nebraska", couleur: "#b89b73", ordre: 2 },
    { nom: "Timber", couleur: "#8a6a4a", ordre: 3 },
    { nom: "Yukon", couleur: "#6e5b4a", ordre: 4 }
];

function findVitrine(gamme, produits, nom) {
  const v = produits.find((p) => norm(p.nom) === norm(nom));
  if (!v) {
    console.error(`⚠ Produit "${nom}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n")}`);
  }
  return v;
}
const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });
async function ecrire(v, axes, decl, groupes) {
  await prisma.produitVitrine.update({ where: { id: v.id }, data: { axesDeclinaisons: axes, declinaisons: decl } });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  let ordre = 0;
  for (const g of groupes) await prisma.groupeFinition.create({ data: { nom: g.nom, vitrineId: v.id, ordre: ordre++, finitions: { create: g.finitions } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaison(s) + ${groupes.length} groupe(s) de finitions`);
}

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const P = (nom) => findVitrine(gamme, produits, nom);
  const AXES = (dims) => [
    { id:"dimension", nom:"Dimension", valeurs: dims },
    { id:"hauteur", nom:"Hauteur d'arche", valeurs:["75 cm","105 cm"] },
    { id:"position", nom:"Position", valeurs:["Départ","Suivant"] },
    { id:"elec", nom:"Électrification", valeurs:["Sans","Avec"] },
  ];
  const FIN = [{ nom:"Pied", finitions: PIED }, { nom:"Plateau", finitions: PLATEAU }];

  // Table de réunion carrée (16 combos)
  { const v = P("Table de réunion carrée");
     if (v) await ecrire(v, AXES(["140 cm","160 cm"]), [
      mk({dimension:"140 cm",hauteur:"75 cm",position:"Départ",elec:"Sans"},800,"DT70"),
      mk({dimension:"160 cm",hauteur:"75 cm",position:"Départ",elec:"Sans"},930,"DT71"),
      mk({dimension:"140 cm",hauteur:"75 cm",position:"Suivant",elec:"Sans"},650,"DT72"),
      mk({dimension:"160 cm",hauteur:"75 cm",position:"Suivant",elec:"Sans"},780,"DT73"),
      mk({dimension:"140 cm",hauteur:"75 cm",position:"Départ",elec:"Avec"},1050,"DT74"),
      mk({dimension:"160 cm",hauteur:"75 cm",position:"Départ",elec:"Avec"},1180,"DT75"),
      mk({dimension:"140 cm",hauteur:"75 cm",position:"Suivant",elec:"Avec"},900,"DT76"),
      mk({dimension:"160 cm",hauteur:"75 cm",position:"Suivant",elec:"Avec"},1030,"DT77"),
      mk({dimension:"140 cm",hauteur:"105 cm",position:"Départ",elec:"Sans"},975,"DT78"),
      mk({dimension:"160 cm",hauteur:"105 cm",position:"Départ",elec:"Sans"},1125,"DT79"),
      mk({dimension:"140 cm",hauteur:"105 cm",position:"Suivant",elec:"Sans"},790,"DT80"),
      mk({dimension:"160 cm",hauteur:"105 cm",position:"Suivant",elec:"Sans"},940,"DT81"),
      mk({dimension:"140 cm",hauteur:"105 cm",position:"Départ",elec:"Avec"},1225,"DT82"),
      mk({dimension:"160 cm",hauteur:"105 cm",position:"Départ",elec:"Avec"},1375,"DT83"),
      mk({dimension:"140 cm",hauteur:"105 cm",position:"Suivant",elec:"Avec"},1040,"DT84"),
      mk({dimension:"160 cm",hauteur:"105 cm",position:"Suivant",elec:"Avec"},1190,"DT85"),
     ], FIN); }

  // Table de réunion rectangulaire (24 combos)
  { const v = P("Table de réunion rectangulaire");
     if (v) await ecrire(v, AXES(["140 cm","160 cm","180 cm"]), [
      mk({dimension:"140 cm",hauteur:"105 cm",position:"Départ",elec:"Sans"},715,"DT86"),
      mk({dimension:"160 cm",hauteur:"105 cm",position:"Départ",elec:"Sans"},745,"DT87"),
      mk({dimension:"180 cm",hauteur:"105 cm",position:"Départ",elec:"Sans"},780,"DT88"),
      mk({dimension:"140 cm",hauteur:"105 cm",position:"Suivant",elec:"Sans"},580,"DT89"),
      mk({dimension:"160 cm",hauteur:"105 cm",position:"Suivant",elec:"Sans"},610,"DT90"),
      mk({dimension:"180 cm",hauteur:"105 cm",position:"Suivant",elec:"Sans"},645,"DT91"),
      mk({dimension:"140 cm",hauteur:"105 cm",position:"Départ",elec:"Avec"},995,"DT92"),
      mk({dimension:"160 cm",hauteur:"105 cm",position:"Départ",elec:"Avec"},1025,"DT93"),
      mk({dimension:"180 cm",hauteur:"105 cm",position:"Départ",elec:"Avec"},1055,"DT94"),
      mk({dimension:"140 cm",hauteur:"105 cm",position:"Suivant",elec:"Avec"},860,"DT95"),
      mk({dimension:"160 cm",hauteur:"105 cm",position:"Suivant",elec:"Avec"},890,"DT96"),
      mk({dimension:"180 cm",hauteur:"105 cm",position:"Suivant",elec:"Avec"},920,"DT97"),
      mk({dimension:"140 cm",hauteur:"75 cm",position:"Départ",elec:"Sans"},675,"DZ98"),
      mk({dimension:"160 cm",hauteur:"75 cm",position:"Départ",elec:"Sans"},705,"DZ99"),
      mk({dimension:"180 cm",hauteur:"75 cm",position:"Départ",elec:"Sans"},740,"EA00"),
      mk({dimension:"140 cm",hauteur:"75 cm",position:"Suivant",elec:"Sans"},560,"EA01"),
      mk({dimension:"160 cm",hauteur:"75 cm",position:"Suivant",elec:"Sans"},590,"EA02"),
      mk({dimension:"180 cm",hauteur:"75 cm",position:"Suivant",elec:"Sans"},625,"EA03"),
      mk({dimension:"140 cm",hauteur:"75 cm",position:"Départ",elec:"Avec"},955,"EA04"),
      mk({dimension:"160 cm",hauteur:"75 cm",position:"Départ",elec:"Avec"},985,"EA05"),
      mk({dimension:"180 cm",hauteur:"75 cm",position:"Départ",elec:"Avec"},1015,"EA06"),
      mk({dimension:"140 cm",hauteur:"75 cm",position:"Suivant",elec:"Avec"},840,"EA07"),
      mk({dimension:"160 cm",hauteur:"75 cm",position:"Suivant",elec:"Avec"},870,"EA08"),
      mk({dimension:"180 cm",hauteur:"75 cm",position:"Suivant",elec:"Avec"},900,"EA09"),
     ], FIN); }

  // TAC double (accessoire, structure métal Blanc/Noir)
  { const v = P("TAC double");
     if (v) await ecrire(v, [], [ mk({},100,"DU13") ],
       [{ nom:"Structure métal", finitions:[{ nom:"Blanc métal", couleur:"#f2f0ec", ordre:0 },{ nom:"Noir métal", couleur:"#23262a", ordre:1 }] }]); }

  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
