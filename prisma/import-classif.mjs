import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "CLASSIF";

const METAL3 = [
    { nom: "Aluminium", couleur: "#9a9a94", ordre: 0 },
    { nom: "Noir métal", couleur: "#23262a", ordre: 1 },
    { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 2 }
];
const CORPS8 = [
    { nom: "Argile", couleur: "#a08d7c", ordre: 0 },
    { nom: "Blanc", couleur: "#f2f0ec", ordre: 1 },
    { nom: "Chêne fil", couleur: "#c9a876", ordre: 2 },
    { nom: "Hêtre", couleur: "#d8b384", ordre: 3 },
    { nom: "Nebraska", couleur: "#b89b73", ordre: 4 },
    { nom: "Noir", couleur: "#23262a", ordre: 5 },
    { nom: "Timber", couleur: "#8a6a4a", ordre: 6 },
    { nom: "Yukon", couleur: "#6e5b4a", ordre: 7 }
];
const NOIR = [{ nom: "Noir métal", couleur: "#23262a", ordre: 0 }];

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

  // 1. Armoire à rideau (Largeur × Hauteur × Rideau) — rideau métal assorti (moins cher) ou bois (+20€)
  {
    const v = P("Armoire à rideau");
    if (v) await ecrire(v,
      [{ id:"largeur", nom:"Largeur", valeurs:["100 cm","120 cm"] },
       { id:"hauteur", nom:"Hauteur", valeurs:["102 cm","198 cm"] },
       { id:"rideau", nom:"Rideau", valeurs:["Métal assorti","Hêtre","Nebraska","Timber","Chêne fil","Blanc","Yukon"] }],
      [
      mk({largeur:"100 cm",hauteur:"102 cm",rideau:"Métal assorti"},530,"BK33"),
      mk({largeur:"100 cm",hauteur:"102 cm",rideau:"Hêtre"},550,"BK33"),
      mk({largeur:"100 cm",hauteur:"102 cm",rideau:"Nebraska"},550,"BK33"),
      mk({largeur:"100 cm",hauteur:"102 cm",rideau:"Timber"},550,"BK33"),
      mk({largeur:"100 cm",hauteur:"102 cm",rideau:"Chêne fil"},550,"BK33"),
      mk({largeur:"100 cm",hauteur:"102 cm",rideau:"Blanc"},550,"BK33"),
      mk({largeur:"100 cm",hauteur:"102 cm",rideau:"Yukon"},550,"BK33"),
      mk({largeur:"100 cm",hauteur:"198 cm",rideau:"Métal assorti"},715,"BK35"),
      mk({largeur:"100 cm",hauteur:"198 cm",rideau:"Hêtre"},745,"BK35"),
      mk({largeur:"100 cm",hauteur:"198 cm",rideau:"Nebraska"},745,"BK35"),
      mk({largeur:"100 cm",hauteur:"198 cm",rideau:"Timber"},745,"BK35"),
      mk({largeur:"100 cm",hauteur:"198 cm",rideau:"Chêne fil"},745,"BK35"),
      mk({largeur:"100 cm",hauteur:"198 cm",rideau:"Blanc"},745,"BK35"),
      mk({largeur:"100 cm",hauteur:"198 cm",rideau:"Yukon"},745,"BK35"),
      mk({largeur:"120 cm",hauteur:"102 cm",rideau:"Métal assorti"},540,"BN01"),
      mk({largeur:"120 cm",hauteur:"102 cm",rideau:"Hêtre"},560,"BN01"),
      mk({largeur:"120 cm",hauteur:"102 cm",rideau:"Nebraska"},560,"BN01"),
      mk({largeur:"120 cm",hauteur:"102 cm",rideau:"Timber"},560,"BN01"),
      mk({largeur:"120 cm",hauteur:"102 cm",rideau:"Chêne fil"},560,"BN01"),
      mk({largeur:"120 cm",hauteur:"102 cm",rideau:"Blanc"},560,"BN01"),
      mk({largeur:"120 cm",hauteur:"102 cm",rideau:"Yukon"},560,"BN01"),
      mk({largeur:"120 cm",hauteur:"198 cm",rideau:"Métal assorti"},730,"BN02"),
      mk({largeur:"120 cm",hauteur:"198 cm",rideau:"Hêtre"},755,"BN02"),
      mk({largeur:"120 cm",hauteur:"198 cm",rideau:"Nebraska"},755,"BN02"),
      mk({largeur:"120 cm",hauteur:"198 cm",rideau:"Timber"},755,"BN02"),
      mk({largeur:"120 cm",hauteur:"198 cm",rideau:"Chêne fil"},755,"BN02"),
      mk({largeur:"120 cm",hauteur:"198 cm",rideau:"Blanc"},755,"BN02"),
      mk({largeur:"120 cm",hauteur:"198 cm",rideau:"Yukon"},755,"BN02"),
      ],
      [{ nom:"Structure métal", finitions: METAL3 }]);
  }

  // 2. Armoire à rideau basse (L80 H69, rideau métal seul)
  {
    const v = P("Armoire à rideau basse");
    if (v) await ecrire(v, [], [ mk({},515,"BM51") ], [{ nom:"Structure métal", finitions: METAL3 }]);
  }

  // 3. Top armoire à rideau (L80/L100/L120, 8 teintes)
  {
    const v = P("Top armoire à rideau");
    if (v) await ecrire(v, [{ id:"largeur", nom:"Largeur", valeurs:["80 cm","100 cm","120 cm"] }],
      [ mk({largeur:"80 cm"},72,"BM52"), mk({largeur:"100 cm"},82,"BM49"), mk({largeur:"120 cm"},92,"BM50") ],
      [{ nom:"Coloris", finitions: CORPS8 }]);
  }

  // 4. Châssis télescopique dossiers suspendus (L100/L120, métal noir)
  {
    const v = P("Châssis télescopique dossiers suspendus");
    if (v) await ecrire(v, [{ id:"largeur", nom:"Largeur", valeurs:["100 cm","120 cm"] }],
      [ mk({largeur:"100 cm"},190,"BM57"), mk({largeur:"120 cm"},195,"BM58") ],
      [{ nom:"Structure métal", finitions: NOIR }]);
  }

  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
