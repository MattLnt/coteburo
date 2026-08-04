import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "QUIETUDE";

const CORPS = [
  { nom: "Argile", couleur: "#a08d7c", ordre: 0 },
  { nom: "Blanc", couleur: "#f2f0ec", ordre: 1 },
  { nom: "Chêne fil", couleur: "#c9a876", ordre: 2 },
  { nom: "Hêtre", couleur: "#d8b384", ordre: 3 },
  { nom: "Nebraska", couleur: "#b89b73", ordre: 4 },
  { nom: "Noir", couleur: "#23262a", ordre: 5 },
  { nom: "Timber", couleur: "#8a6a4a", ordre: 6 },
  { nom: "Yukon", couleur: "#6e5b4a", ordre: 7 }
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
  await prisma.groupeFinition.create({ data: { nom: "Corps", vitrineId: v.id, ordre: 0, finitions: { create: CORPS } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions`);
}

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const P = (nom) => findVitrine(gamme, produits, nom);

  // Rangement ouvert (Top × Nombre de tablettes × Matière × Largeur) — grille creuse (1 tablette = mélamine ; 4 tablettes = sans top)
  {
    const v = P("Rangement ouvert");
    if (v) await ecrire(v,
      [{ id:"top", nom:"Top", valeurs:["Sans top","Avec top"] },
       { id:"tablettes", nom:"Nombre de tablettes", valeurs:["1 tablette","2 tablettes","3 tablettes","4 tablettes"] },
       { id:"matiere", nom:"Tablettes", valeurs:["Mélamine","Métal"] },
       { id:"largeur", nom:"Largeur", valeurs:["80 cm","100 cm"] }],
      [
      mk({top:"Sans top",tablettes:"1 tablette",matiere:"Mélamine",largeur:"80 cm"},150,"BH69"),
      mk({top:"Sans top",tablettes:"1 tablette",matiere:"Mélamine",largeur:"100 cm"},180,"BH70"),
      mk({top:"Sans top",tablettes:"2 tablettes",matiere:"Mélamine",largeur:"80 cm"},260,"BH73"),
      mk({top:"Sans top",tablettes:"2 tablettes",matiere:"Mélamine",largeur:"100 cm"},305,"BH74"),
      mk({top:"Sans top",tablettes:"2 tablettes",matiere:"Métal",largeur:"80 cm"},300,"BH75"),
      mk({top:"Sans top",tablettes:"2 tablettes",matiere:"Métal",largeur:"100 cm"},345,"BH76"),
      mk({top:"Sans top",tablettes:"3 tablettes",matiere:"Mélamine",largeur:"80 cm"},310,"BH77"),
      mk({top:"Sans top",tablettes:"3 tablettes",matiere:"Mélamine",largeur:"100 cm"},355,"BH78"),
      mk({top:"Sans top",tablettes:"3 tablettes",matiere:"Métal",largeur:"80 cm"},365,"BH79"),
      mk({top:"Sans top",tablettes:"3 tablettes",matiere:"Métal",largeur:"100 cm"},410,"BH80"),
      mk({top:"Sans top",tablettes:"4 tablettes",matiere:"Mélamine",largeur:"80 cm"},405,"BH81"),
      mk({top:"Sans top",tablettes:"4 tablettes",matiere:"Mélamine",largeur:"100 cm"},455,"BH82"),
      mk({top:"Sans top",tablettes:"4 tablettes",matiere:"Métal",largeur:"80 cm"},485,"BH83"),
      mk({top:"Sans top",tablettes:"4 tablettes",matiere:"Métal",largeur:"100 cm"},535,"BH84"),
      mk({top:"Avec top",tablettes:"1 tablette",matiere:"Mélamine",largeur:"80 cm"},205,"BP50"),
      mk({top:"Avec top",tablettes:"1 tablette",matiere:"Mélamine",largeur:"100 cm"},245,"BU32"),
      mk({top:"Avec top",tablettes:"2 tablettes",matiere:"Mélamine",largeur:"80 cm"},315,"BU22"),
      mk({top:"Avec top",tablettes:"2 tablettes",matiere:"Mélamine",largeur:"100 cm"},370,"BU34"),
      mk({top:"Avec top",tablettes:"2 tablettes",matiere:"Métal",largeur:"80 cm"},355,"BU23"),
      mk({top:"Avec top",tablettes:"2 tablettes",matiere:"Métal",largeur:"100 cm"},410,"BU35"),
      mk({top:"Avec top",tablettes:"3 tablettes",matiere:"Mélamine",largeur:"80 cm"},365,"BU26"),
      mk({top:"Avec top",tablettes:"3 tablettes",matiere:"Mélamine",largeur:"100 cm"},420,"BU38"),
      mk({top:"Avec top",tablettes:"3 tablettes",matiere:"Métal",largeur:"80 cm"},420,"BU27"),
      mk({top:"Avec top",tablettes:"3 tablettes",matiere:"Métal",largeur:"100 cm"},475,"BU39"),
      ]);
  }

  // Bibliothèque ouverte (Largeur) — H201, tablette intermédiaire
  {
    const v = P("Bibliothèque ouverte");
    if (v) await ecrire(v,
      [{ id:"largeur", nom:"Largeur", valeurs:["80 cm","100 cm"] }],
      [ mk({largeur:"80 cm"},440,"DR16"), mk({largeur:"100 cm"},485,"DR17") ]);
  }

  console.log(`\n✓ Rangements ouverts QUIETUDE traités.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
