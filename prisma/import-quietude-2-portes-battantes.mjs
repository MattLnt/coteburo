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
  await prisma.groupeFinition.create({ data: { nom: "Corps", vitrineId: v.id, ordre: 0, finitions: { create: CORPS } } });
  await prisma.groupeFinition.create({ data: { nom: "Couleur poignée", vitrineId: v.id, ordre: 1, finitions: { create: POIGNEE_COULEUR } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 2 groupes de finitions`);
}

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const P = (nom) => findVitrine(gamme, produits, nom);

  // Rangement portes battantes (Largeur × Hauteur × Tablettes × Poignée) — grille creuse (H72 mélamine seul)
  {
    const v = P("Rangement portes battantes");
    if (v) await ecrire(v,
      [{ id:"largeur", nom:"Largeur", valeurs:["80 cm","100 cm"] },
       { id:"hauteur", nom:"Hauteur", valeurs:["72 cm","104 cm","136 cm","201 cm"] },
       { id:"tablettes", nom:"Tablettes", valeurs:["Mélamine","Métal"] },
       { id:"poignee", nom:"Poignée", valeurs:["Classique","Design"] }],
      [
      mk({largeur:"80 cm",hauteur:"72 cm",tablettes:"Mélamine",poignee:"Classique"},360,"BP51C"),
      mk({largeur:"80 cm",hauteur:"72 cm",tablettes:"Mélamine",poignee:"Design"},365,"BP51D"),
      mk({largeur:"100 cm",hauteur:"72 cm",tablettes:"Mélamine",poignee:"Classique"},425,"BU33C"),
      mk({largeur:"100 cm",hauteur:"72 cm",tablettes:"Mélamine",poignee:"Design"},430,"BU33D"),
      mk({largeur:"80 cm",hauteur:"104 cm",tablettes:"Mélamine",poignee:"Classique"},490,"BU24C"),
      mk({largeur:"80 cm",hauteur:"104 cm",tablettes:"Mélamine",poignee:"Design"},495,"BU24D"),
      mk({largeur:"100 cm",hauteur:"104 cm",tablettes:"Mélamine",poignee:"Classique"},560,"BU36C"),
      mk({largeur:"100 cm",hauteur:"104 cm",tablettes:"Mélamine",poignee:"Design"},565,"BU36D"),
      mk({largeur:"80 cm",hauteur:"104 cm",tablettes:"Métal",poignee:"Classique"},530,"BU25C"),
      mk({largeur:"80 cm",hauteur:"104 cm",tablettes:"Métal",poignee:"Design"},535,"BU25D"),
      mk({largeur:"100 cm",hauteur:"104 cm",tablettes:"Métal",poignee:"Classique"},600,"BU37C"),
      mk({largeur:"100 cm",hauteur:"104 cm",tablettes:"Métal",poignee:"Design"},605,"BU37D"),
      mk({largeur:"80 cm",hauteur:"136 cm",tablettes:"Mélamine",poignee:"Classique"},565,"BU28C"),
      mk({largeur:"80 cm",hauteur:"136 cm",tablettes:"Mélamine",poignee:"Design"},570,"BU28D"),
      mk({largeur:"100 cm",hauteur:"136 cm",tablettes:"Mélamine",poignee:"Classique"},630,"BU40C"),
      mk({largeur:"100 cm",hauteur:"136 cm",tablettes:"Mélamine",poignee:"Design"},635,"BU40D"),
      mk({largeur:"80 cm",hauteur:"136 cm",tablettes:"Métal",poignee:"Classique"},620,"BU29C"),
      mk({largeur:"80 cm",hauteur:"136 cm",tablettes:"Métal",poignee:"Design"},625,"BU29D"),
      mk({largeur:"100 cm",hauteur:"136 cm",tablettes:"Métal",poignee:"Classique"},685,"BU41C"),
      mk({largeur:"100 cm",hauteur:"136 cm",tablettes:"Métal",poignee:"Design"},690,"BU41D"),
      mk({largeur:"80 cm",hauteur:"201 cm",tablettes:"Mélamine",poignee:"Classique"},620,"BH97C"),
      mk({largeur:"80 cm",hauteur:"201 cm",tablettes:"Mélamine",poignee:"Design"},625,"BH97D"),
      mk({largeur:"100 cm",hauteur:"201 cm",tablettes:"Mélamine",poignee:"Classique"},725,"BH98C"),
      mk({largeur:"100 cm",hauteur:"201 cm",tablettes:"Mélamine",poignee:"Design"},730,"BH98D"),
      mk({largeur:"80 cm",hauteur:"201 cm",tablettes:"Métal",poignee:"Classique"},700,"BH99C"),
      mk({largeur:"80 cm",hauteur:"201 cm",tablettes:"Métal",poignee:"Design"},705,"BH99D"),
      mk({largeur:"100 cm",hauteur:"201 cm",tablettes:"Métal",poignee:"Classique"},805,"BJ00C"),
      mk({largeur:"100 cm",hauteur:"201 cm",tablettes:"Métal",poignee:"Design"},810,"BJ00D"),
      ]);
  }

  // Bibliothèque portes basses (Largeur × Poignée)
  {
    const v = P("Bibliothèque portes basses");
    if (v) await ecrire(v,
      [{ id:"largeur", nom:"Largeur", valeurs:["80 cm","100 cm"] },
       { id:"poignee", nom:"Poignée", valeurs:["Classique","Design"] }],
      [ mk({largeur:"80 cm",poignee:"Classique"},595,"BJ01C"),
        mk({largeur:"80 cm",poignee:"Design"},600,"BJ01D"),
        mk({largeur:"100 cm",poignee:"Classique"},665,"BJ02C"),
        mk({largeur:"100 cm",poignee:"Design"},670,"BJ02D") ]);
  }

  console.log(`\n✓ Portes battantes QUIETUDE traitées.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
