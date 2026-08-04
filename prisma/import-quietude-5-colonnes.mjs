import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "QUIETUDE";

const CORPS = [
  { nom: "Argile", couleur: "#a08d7c", ordre: 0 },
  { nom: "Blanc",  couleur: "#f2f0ec", ordre: 1 },
  { nom: "Noir",   couleur: "#23262a", ordre: 2 },
];

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm("Colonne"));
  if (!v) {
    console.error(`⚠ Produit "Colonne" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n")}`);
    process.exit(1);
  }

  const decl = [
    mk({ hauteur: "69,5 cm" },  170, "AW71"),
    mk({ hauteur: "101,5 cm" }, 195, "AW72"),
    mk({ hauteur: "133,5 cm" }, 205, "AW73"),
    mk({ hauteur: "200,5 cm" }, 245, "AW74"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [{ id: "hauteur", nom: "Hauteur", valeurs: ["69,5 cm", "101,5 cm", "133,5 cm", "200,5 cm"] }],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: v.id, ordre: 0, finitions: { create: CORPS } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions`);
  console.log(`\n✓ Colonnes QUIETUDE traitées.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
