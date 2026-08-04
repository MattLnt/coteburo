import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_PRODUIT = "Siège haut";

const COLORIS = [
  { nom: "Noir", couleur: "#23262a", ordre: 0 },
  { nom: "Gris anthracite", couleur: "#4a4d52", ordre: 1 },
  { nom: "Gris clair", couleur: "#b7b9bc", ordre: 2 },
  { nom: "Bleu marine", couleur: "#2b3a55", ordre: 3 },
  { nom: "Bleu", couleur: "#3f6fa3", ordre: 4 },
  { nom: "Vert d'eau", couleur: "#6ea3a0", ordre: 5 },
  { nom: "Vert", couleur: "#4a6b4a", ordre: 6 },
  { nom: "Bordeaux", couleur: "#6b2530", ordre: 7 },
  { nom: "Rouge", couleur: "#9e2b25", ordre: 8 },
  { nom: "Orange", couleur: "#c8892f", ordre: 9 },
  { nom: "Beige", couleur: "#cbb89a", ordre: 10 },
  { nom: "Marron", couleur: "#6b4a35", ordre: 11 }
];

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

let GAMMES_CACHE = null;

async function traiter(nomGamme, axes, decl) {
  if (!GAMMES_CACHE) GAMMES_CACHE = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = GAMMES_CACHE.find((g) => norm(g.nom) === norm(nomGamme));
  if (!gamme) {
    console.error(`⚠ Gamme "${nomGamme}" introuvable — crée-la d'abord. Gammes existantes :`);
    console.error(GAMMES_CACHE.map((g) => " - " + g.nom).join("\n"));
    return;
  }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm(NOM_PRODUIT));
  if (!v) {
    console.error(`⚠ Produit "${NOM_PRODUIT}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun — crée-le d'abord)"}`);
    return;
  }
  await prisma.produitVitrine.update({ where: { id: v.id }, data: { axesDeclinaisons: axes, declinaisons: decl } });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris (aperçu)", vitrineId: v.id, ordre: 0, finitions: { create: COLORIS } } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaison(s) + 1 groupe de finitions`);
}

async function main() {
  await traiter("Tertio", [
    { id:"lift", nom:"Lift", valeurs:["Assis-debout", "Haut"] },{ id:"meca", nom:"Mécanisme", valeurs:["Contact permanent", "Synchro"] },{ id:"tissu", nom:"Catégorie tissu", valeurs:["B","B+","C","D"] }
  ], [
      mk({lift:"Assis-debout",meca:"Contact permanent",tissu:"B"},330,"RT32/20"),
      mk({lift:"Assis-debout",meca:"Contact permanent",tissu:"B+"},335,"RT32/20"),
      mk({lift:"Assis-debout",meca:"Contact permanent",tissu:"C"},341,"RT32/20"),
      mk({lift:"Assis-debout",meca:"Contact permanent",tissu:"D"},356,"RT32/20"),
      mk({lift:"Assis-debout",meca:"Synchro",tissu:"B"},410,"RT52/20"),
      mk({lift:"Assis-debout",meca:"Synchro",tissu:"B+"},415,"RT52/20"),
      mk({lift:"Assis-debout",meca:"Synchro",tissu:"C"},421,"RT52/20"),
      mk({lift:"Assis-debout",meca:"Synchro",tissu:"D"},436,"RT52/20"),
      mk({lift:"Haut",meca:"Contact permanent",tissu:"B"},330,"RT32/00"),
      mk({lift:"Haut",meca:"Contact permanent",tissu:"B+"},335,"RT32/00"),
      mk({lift:"Haut",meca:"Contact permanent",tissu:"C"},341,"RT32/00"),
      mk({lift:"Haut",meca:"Contact permanent",tissu:"D"},356,"RT32/00"),
      mk({lift:"Haut",meca:"Synchro",tissu:"B"},410,"RT52/00"),
      mk({lift:"Haut",meca:"Synchro",tissu:"B+"},415,"RT52/00"),
      mk({lift:"Haut",meca:"Synchro",tissu:"C"},421,"RT52/00"),
      mk({lift:"Haut",meca:"Synchro",tissu:"D"},436,"RT52/00"),
  ]);

  await traiter("Alaia", [
    { id:"lift", nom:"Lift", valeurs:["Assis-debout", "Haut"] },{ id:"meca", nom:"Mécanisme", valeurs:["Contact permanent", "Synchro automatique", "Synchro"] },{ id:"tissu", nom:"Catégorie tissu", valeurs:["B","B+","C","D"] }
  ], [
      mk({lift:"Assis-debout",meca:"Contact permanent",tissu:"B"},337,"IA32/20"),
      mk({lift:"Assis-debout",meca:"Contact permanent",tissu:"B+"},342,"IA32/20"),
      mk({lift:"Assis-debout",meca:"Contact permanent",tissu:"C"},348,"IA32/20"),
      mk({lift:"Assis-debout",meca:"Contact permanent",tissu:"D"},363,"IA32/20"),
      mk({lift:"Assis-debout",meca:"Synchro automatique",tissu:"B"},392,"IA62/20"),
      mk({lift:"Assis-debout",meca:"Synchro automatique",tissu:"B+"},397,"IA62/20"),
      mk({lift:"Assis-debout",meca:"Synchro automatique",tissu:"C"},403,"IA62/20"),
      mk({lift:"Assis-debout",meca:"Synchro automatique",tissu:"D"},418,"IA62/20"),
      mk({lift:"Assis-debout",meca:"Synchro",tissu:"B"},397,"IA52/20"),
      mk({lift:"Assis-debout",meca:"Synchro",tissu:"B+"},402,"IA52/20"),
      mk({lift:"Assis-debout",meca:"Synchro",tissu:"C"},408,"IA52/20"),
      mk({lift:"Assis-debout",meca:"Synchro",tissu:"D"},423,"IA52/20"),
      mk({lift:"Haut",meca:"Contact permanent",tissu:"B"},337,"IA32/00"),
      mk({lift:"Haut",meca:"Contact permanent",tissu:"B+"},342,"IA32/00"),
      mk({lift:"Haut",meca:"Contact permanent",tissu:"C"},348,"IA32/00"),
      mk({lift:"Haut",meca:"Contact permanent",tissu:"D"},363,"IA32/00"),
      mk({lift:"Haut",meca:"Synchro automatique",tissu:"B"},392,"IA62/00"),
      mk({lift:"Haut",meca:"Synchro automatique",tissu:"B+"},397,"IA62/00"),
      mk({lift:"Haut",meca:"Synchro automatique",tissu:"C"},403,"IA62/00"),
      mk({lift:"Haut",meca:"Synchro automatique",tissu:"D"},418,"IA62/00"),
      mk({lift:"Haut",meca:"Synchro",tissu:"B"},397,"IA52/00"),
      mk({lift:"Haut",meca:"Synchro",tissu:"B+"},402,"IA52/00"),
      mk({lift:"Haut",meca:"Synchro",tissu:"C"},408,"IA52/00"),
      mk({lift:"Haut",meca:"Synchro",tissu:"D"},423,"IA52/00"),
  ]);

  await traiter("Torino", [
    { id:"lift", nom:"Lift", valeurs:["Assis-debout", "Haut"] },{ id:"tissu", nom:"Catégorie tissu", valeurs:["B","B+","C","D"] }
  ], [
      mk({lift:"Assis-debout",tissu:"B"},237,"TO32/20"),
      mk({lift:"Assis-debout",tissu:"B+"},242,"TO32/20"),
      mk({lift:"Assis-debout",tissu:"C"},248,"TO32/20"),
      mk({lift:"Assis-debout",tissu:"D"},263,"TO32/20"),
      mk({lift:"Haut",tissu:"B"},237,"TO32/00"),
      mk({lift:"Haut",tissu:"B+"},242,"TO32/00"),
      mk({lift:"Haut",tissu:"C"},248,"TO32/00"),
      mk({lift:"Haut",tissu:"D"},263,"TO32/00"),
  ]);

  console.log(`\n✓ Sièges Hauts (Tertio / Alaia / Torino) traités.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
