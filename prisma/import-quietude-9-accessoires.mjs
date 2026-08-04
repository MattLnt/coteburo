import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "QUIETUDE";

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
const POI3 = [
    { nom: "Aluminium", couleur: "#9a9a94", ordre: 0 },
    { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 1 },
    { nom: "Noir métal", couleur: "#23262a", ordre: 2 }
];
const POI7 = [
    { nom: "Aluminium", couleur: "#9a9a94", ordre: 0 },
    { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 1 },
    { nom: "Horizon", couleur: "#8ba0ab", ordre: 2 },
    { nom: "Noir métal", couleur: "#23262a", ordre: 3 },
    { nom: "Ombre", couleur: "#6b6b68", ordre: 4 },
    { nom: "Pêche", couleur: "#e8b9a0", ordre: 5 },
    { nom: "Sauge", couleur: "#a3b18a", ordre: 6 }
];
const NOIR = [{ nom: "Noir métal", couleur: "#23262a", ordre: 0 }];
const ALU  = [{ nom: "Aluminium", couleur: "#9a9a94", ordre: 0 }];

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
  const L = (vals) => [{ id:"largeur", nom:"Largeur", valeurs: vals }];

  // 1. Châssis télescopique dossiers suspendus (L80/L100, métal noir)
  { const v = P("Châssis télescopique dossiers suspendus");
     if (v) await ecrire(v, L(["80 cm","100 cm"]),
       [ mk({largeur:"80 cm"},215,"AE29"), mk({largeur:"100 cm"},240,"AE01") ],
       [{ nom:"Structure métal", finitions: NOIR }]); }

  // 2. Tablette métal dossiers suspendus (L80/L100/L120, aluminium)
  { const v = P("Tablette métal dossiers suspendus");
     if (v) await ecrire(v, L(["80 cm","100 cm","120 cm"]),
       [ mk({largeur:"80 cm"},55,"AE30"), mk({largeur:"100 cm"},60,"AE02"), mk({largeur:"120 cm"},65,"EH93") ],
       [{ nom:"Structure métal", finitions: ALU }]); }

  // 3. Kit anti-basculement (réf unique)
  { const v = P("Kit anti-basculement");
     if (v) await ecrire(v, [], [ mk({},75,"AE99") ], [{ nom:"Structure métal", finitions: ALU }]); }

  // 4. Kit 2 poignées classiques (réf unique, 3 coloris)
  { const v = P("Kit 2 poignées classiques");
     if (v) await ecrire(v, [], [ mk({},15,"BA00") ], [{ nom:"Couleur", finitions: POI3 }]); }

  // 5. Kit 2 poignées design (réf unique, 7 coloris)
  { const v = P("Kit 2 poignées design");
     if (v) await ecrire(v, [], [ mk({},20,"DX21") ], [{ nom:"Couleur", finitions: POI7 }]); }

  // 6. Top rangement mélamine (L80/L100, 8 teintes)
  { const v = P("Top rangement mélamine");
     if (v) await ecrire(v, L(["80 cm","100 cm"]),
       [ mk({largeur:"80 cm"},55,"BH71"), mk({largeur:"100 cm"},65,"BH72") ],
       [{ nom:"Coloris", finitions: CORPS8 }]); }

  // 7. Top combinaison (L160/L200/L240, 8 teintes)
  { const v = P("Top combinaison");
     if (v) await ecrire(v, [{ id:"dimension", nom:"Dimension", valeurs:["L160","L200","L240"] }],
       [ mk({dimension:"L160"},100,"BJ08"), mk({dimension:"L200"},115,"BJ10"), mk({dimension:"L240"},140,"BJ09") ],
       [{ nom:"Coloris", finitions: CORPS8 }]); }

  // 8. Tablette mélamine supplémentaire (rangt L80/L100, 8 teintes)
  { const v = P("Tablette mélamine supplémentaire");
     if (v) await ecrire(v, L(["80 cm","100 cm"]),
       [ mk({largeur:"80 cm"},40,"BJ53"), mk({largeur:"100 cm"},45,"BJ54") ],
       [{ nom:"Coloris", finitions: CORPS8 }]); }

  console.log(`\n✓ Accessoires QUIETUDE traités.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
