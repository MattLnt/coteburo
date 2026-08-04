import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();

const NOM_GAMME = "QUIETUDE";

// Coloris corps / façade — 29 paires réelles (façade assortie ou Argile/Blanc ; corps Argile/Blanc acceptent les 7)
const PAIRES29 = [
  { nom: "Argile / Argile", couleur: "#a08d7c", ordre: 0 },
  { nom: "Argile / Blanc", couleur: "#a08d7c", ordre: 1 },
  { nom: "Argile / Chêne fil", couleur: "#a08d7c", ordre: 2 },
  { nom: "Argile / Hêtre", couleur: "#a08d7c", ordre: 3 },
  { nom: "Argile / Nebraska", couleur: "#a08d7c", ordre: 4 },
  { nom: "Argile / Timber", couleur: "#a08d7c", ordre: 5 },
  { nom: "Argile / Yukon", couleur: "#a08d7c", ordre: 6 },
  { nom: "Blanc / Argile", couleur: "#f2f0ec", ordre: 7 },
  { nom: "Blanc / Blanc", couleur: "#f2f0ec", ordre: 8 },
  { nom: "Blanc / Chêne fil", couleur: "#f2f0ec", ordre: 9 },
  { nom: "Blanc / Hêtre", couleur: "#f2f0ec", ordre: 10 },
  { nom: "Blanc / Nebraska", couleur: "#f2f0ec", ordre: 11 },
  { nom: "Blanc / Timber", couleur: "#f2f0ec", ordre: 12 },
  { nom: "Blanc / Yukon", couleur: "#f2f0ec", ordre: 13 },
  { nom: "Chêne fil / Argile", couleur: "#c9a876", ordre: 14 },
  { nom: "Chêne fil / Blanc", couleur: "#c9a876", ordre: 15 },
  { nom: "Chêne fil / Chêne fil", couleur: "#c9a876", ordre: 16 },
  { nom: "Hêtre / Argile", couleur: "#d8b384", ordre: 17 },
  { nom: "Hêtre / Blanc", couleur: "#d8b384", ordre: 18 },
  { nom: "Hêtre / Hêtre", couleur: "#d8b384", ordre: 19 },
  { nom: "Nebraska / Argile", couleur: "#b89b73", ordre: 20 },
  { nom: "Nebraska / Blanc", couleur: "#b89b73", ordre: 21 },
  { nom: "Nebraska / Nebraska", couleur: "#b89b73", ordre: 22 },
  { nom: "Timber / Argile", couleur: "#8a6a4a", ordre: 23 },
  { nom: "Timber / Blanc", couleur: "#8a6a4a", ordre: 24 },
  { nom: "Timber / Timber", couleur: "#8a6a4a", ordre: 25 },
  { nom: "Yukon / Argile", couleur: "#6e5b4a", ordre: 26 },
  { nom: "Yukon / Blanc", couleur: "#6e5b4a", ordre: 27 },
  { nom: "Yukon / Yukon", couleur: "#6e5b4a", ordre: 28 }
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
async function ecrire(v, axes, decl) {
  await prisma.produitVitrine.update({ where: { id: v.id }, data: { axesDeclinaisons: axes, declinaisons: decl } });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris corps / façade", vitrineId: v.id, ordre: 0, finitions: { create: PAIRES29 } } });
  await prisma.groupeFinition.create({ data: { nom: "Couleur poignée", vitrineId: v.id, ordre: 1, finitions: { create: POIGNEE_COULEUR } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 2 groupes de finitions`);
}

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) {
    console.error(`Gamme "${NOM_GAMME}" introuvable. Gammes existantes :`);
    console.error(gammes.map((g) => " - " + g.nom).join("\n")); process.exit(1);
  }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const P = (nom) => findVitrine(gamme, produits, nom);

  // Armoire porte coulissante mélamine (Largeur × Hauteur × Poignée)
  {
    const v = P("Armoire porte coulissante mélamine");
    if (v) await ecrire(v,
      [{ id:"largeur", nom:"Largeur", valeurs:["143 cm","163 cm"] },
       { id:"hauteur", nom:"Hauteur", valeurs:["72 cm","104 cm","136 cm"] },
       { id:"poignee", nom:"Poignée", valeurs:["Classique","Design"] }],
      [ mk({largeur:"143 cm",hauteur:"72 cm",poignee:"Classique"},555,"EG98C"),
        mk({largeur:"143 cm",hauteur:"72 cm",poignee:"Design"},560,"EG98D"),
        mk({largeur:"163 cm",hauteur:"72 cm",poignee:"Classique"},590,"EG99C"),
        mk({largeur:"163 cm",hauteur:"72 cm",poignee:"Design"},595,"EG99D"),
        mk({largeur:"143 cm",hauteur:"104 cm",poignee:"Classique"},710,"EH00C"),
        mk({largeur:"143 cm",hauteur:"104 cm",poignee:"Design"},715,"EH00D"),
        mk({largeur:"163 cm",hauteur:"104 cm",poignee:"Classique"},745,"EH01C"),
        mk({largeur:"163 cm",hauteur:"104 cm",poignee:"Design"},750,"EH01D"),
        mk({largeur:"143 cm",hauteur:"136 cm",poignee:"Classique"},865,"EH02C"),
        mk({largeur:"143 cm",hauteur:"136 cm",poignee:"Design"},870,"EH02D"),
        mk({largeur:"163 cm",hauteur:"136 cm",poignee:"Classique"},895,"EH03C"),
        mk({largeur:"163 cm",hauteur:"136 cm",poignee:"Design"},900,"EH03D") ]);
  }

  // Armoire porte coulissante métal (L120 ; Hauteur × Poignée)
  {
    const v = P("Armoire porte coulissante métal");
    if (v) await ecrire(v,
      [{ id:"hauteur", nom:"Hauteur", valeurs:["104 cm","136 cm","160 cm"] },
       { id:"poignee", nom:"Poignée", valeurs:["Classique","Design"] }],
      [ mk({hauteur:"104 cm",poignee:"Classique"},610,"EH04C"),
        mk({hauteur:"104 cm",poignee:"Design"},615,"EH04D"),
        mk({hauteur:"136 cm",poignee:"Classique"},710,"EH05C"),
        mk({hauteur:"136 cm",poignee:"Design"},715,"EH05D"),
        mk({hauteur:"160 cm",poignee:"Classique"},815,"EH06C"),
        mk({hauteur:"160 cm",poignee:"Design"},820,"EH06D") ]);
  }

  console.log(`\n✓ Armoires coulissantes QUIETUDE traitées.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
