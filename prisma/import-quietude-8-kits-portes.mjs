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
  { nom: "Yukon", couleur: "#6e5b4a", ordre: 7 },
  { nom: "Horizon", couleur: "#8ba0ab", ordre: 8 },
  { nom: "Ombre", couleur: "#6b6b68", ordre: 9 },
  { nom: "Pêche", couleur: "#e8b9a0", ordre: 10 },
  { nom: "Sauge", couleur: "#a3b18a", ordre: 11 }
];
const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm("Kit 2 portes battantes"));
  if (!v) {
    console.error(`⚠ Produit "Kit 2 portes battantes" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n")}`);
    process.exit(1);
  }

  const decl = [
    mk({largeur:"80 cm",hauteur:"72 cm"},140,"EH78"),
    mk({largeur:"80 cm",hauteur:"104 cm"},160,"EH79"),
    mk({largeur:"80 cm",hauteur:"136 cm"},185,"EH80"),
    mk({largeur:"80 cm",hauteur:"201 cm"},200,"EH81"),
    mk({largeur:"100 cm",hauteur:"72 cm"},165,"EH82"),
    mk({largeur:"100 cm",hauteur:"104 cm"},175,"EH83"),
    mk({largeur:"100 cm",hauteur:"136 cm"},200,"EH84"),
    mk({largeur:"100 cm",hauteur:"201 cm"},255,"EH85"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "largeur", nom: "Largeur", valeurs: ["80 cm", "100 cm"] },
        { id: "hauteur", nom: "Hauteur", valeurs: ["72 cm", "104 cm", "136 cm", "201 cm"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: v.id, ordre: 0, finitions: { create: CORPS } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions (12 coloris)`);
  console.log(`\n✓ Kits portes battantes QUIETUDE traités.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
