import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "QUIETUDE";

// Coloris corps / façade — 24 paires (corps Argile/Blanc/Noir × 8 façades)
const PAIRES24 = [
  { nom: "Argile / Argile", couleur: "#a08d7c", ordre: 0 },
  { nom: "Argile / Blanc", couleur: "#a08d7c", ordre: 1 },
  { nom: "Argile / Chêne fil", couleur: "#a08d7c", ordre: 2 },
  { nom: "Argile / Hêtre", couleur: "#a08d7c", ordre: 3 },
  { nom: "Argile / Nebraska", couleur: "#a08d7c", ordre: 4 },
  { nom: "Argile / Noir", couleur: "#a08d7c", ordre: 5 },
  { nom: "Argile / Timber", couleur: "#a08d7c", ordre: 6 },
  { nom: "Argile / Yukon", couleur: "#a08d7c", ordre: 7 },
  { nom: "Blanc / Argile", couleur: "#f2f0ec", ordre: 8 },
  { nom: "Blanc / Blanc", couleur: "#f2f0ec", ordre: 9 },
  { nom: "Blanc / Chêne fil", couleur: "#f2f0ec", ordre: 10 },
  { nom: "Blanc / Hêtre", couleur: "#f2f0ec", ordre: 11 },
  { nom: "Blanc / Nebraska", couleur: "#f2f0ec", ordre: 12 },
  { nom: "Blanc / Noir", couleur: "#f2f0ec", ordre: 13 },
  { nom: "Blanc / Timber", couleur: "#f2f0ec", ordre: 14 },
  { nom: "Blanc / Yukon", couleur: "#f2f0ec", ordre: 15 },
  { nom: "Noir / Argile", couleur: "#23262a", ordre: 16 },
  { nom: "Noir / Blanc", couleur: "#23262a", ordre: 17 },
  { nom: "Noir / Chêne fil", couleur: "#23262a", ordre: 18 },
  { nom: "Noir / Hêtre", couleur: "#23262a", ordre: 19 },
  { nom: "Noir / Nebraska", couleur: "#23262a", ordre: 20 },
  { nom: "Noir / Noir", couleur: "#23262a", ordre: 21 },
  { nom: "Noir / Timber", couleur: "#23262a", ordre: 22 },
  { nom: "Noir / Yukon", couleur: "#23262a", ordre: 23 }
];
const POIGNEE_COULEUR = [
  { nom: "Aluminium", couleur: "#9a9a94", ordre: 0 },
  { nom: "Blanc", couleur: "#f2f0ec", ordre: 1 },
  { nom: "Noir", couleur: "#23262a", ordre: 2 }
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

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = findVitrine(gamme, produits, "Combinaison");
  if (!v) process.exit(1);

  const decl = [
    mk({largeur:"L200",hauteur:"72 cm",poignee:"Classique"},895,"BU42C"),
    mk({largeur:"L200",hauteur:"72 cm",poignee:"Design"},905,"BU42D"),
    mk({largeur:"L240",hauteur:"72 cm",poignee:"Classique"},1030,"BU43C"),
    mk({largeur:"L240",hauteur:"72 cm",poignee:"Design"},1040,"BU43D"),
    mk({largeur:"L200",hauteur:"104 cm",poignee:"Classique"},1180,"BU44C"),
    mk({largeur:"L200",hauteur:"104 cm",poignee:"Design"},1190,"BU44D"),
    mk({largeur:"L240",hauteur:"104 cm",poignee:"Classique"},1325,"BU45C"),
    mk({largeur:"L240",hauteur:"104 cm",poignee:"Design"},1335,"BU45D"),
    mk({largeur:"L200",hauteur:"136 cm",poignee:"Classique"},1300,"BU46C"),
    mk({largeur:"L200",hauteur:"136 cm",poignee:"Design"},1310,"BU46D"),
    mk({largeur:"L240",hauteur:"136 cm",poignee:"Classique"},1440,"BU47C"),
    mk({largeur:"L240",hauteur:"136 cm",poignee:"Design"},1450,"BU47D"),
    mk({largeur:"L200",hauteur:"201 cm",poignee:"Classique"},1600,"BU48C"),
    mk({largeur:"L200",hauteur:"201 cm",poignee:"Design"},1610,"BU48D"),
    mk({largeur:"L240",hauteur:"201 cm",poignee:"Classique"},1835,"BU49C"),
    mk({largeur:"L240",hauteur:"201 cm",poignee:"Design"},1845,"BU49D"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id:"largeur", nom:"Largeur", valeurs:["L200","L240"] },
        { id:"hauteur", nom:"Hauteur", valeurs:["72 cm","104 cm","136 cm","201 cm"] },
        { id:"poignee", nom:"Poignée", valeurs:["Classique","Design"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris corps / façade", vitrineId: v.id, ordre: 0, finitions: { create: PAIRES24 } } });
  await prisma.groupeFinition.create({ data: { nom: "Couleur poignée", vitrineId: v.id, ordre: 1, finitions: { create: POIGNEE_COULEUR } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 2 groupes de finitions`);
  console.log(`\n✓ Combinaisons QUIETUDE traitées.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
