import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "TECSY CONCEPT";
const NOM_PRODUIT = "Fauteuil";

const COLORIS = [
  { nom: "Beige", couleur: "#d8c9a8", ordre: 0 },
  { nom: "Bleu paon", couleur: "#1f6f78", ordre: 1 },
  { nom: "Gris clair", couleur: "#c9c9c6", ordre: 2 },
  { nom: "Noir", couleur: "#23262a", ordre: 3 },
  { nom: "Taupe", couleur: "#8b7d6b", ordre: 4 },
  { nom: "Citron", couleur: "#d9c74a", ordre: 5 },
  { nom: "Terracotta", couleur: "#c56a4a", ordre: 6 },
  { nom: "Parme", couleur: "#9b8bb4", ordre: 7 },
];

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm(NOM_PRODUIT));
  if (!v) {
    console.error(`⚠ Produit "${NOM_PRODUIT}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun — crée-le d'abord)"}`);
    process.exit(1);
  }
  await prisma.produitVitrine.update({ where: { id: v.id }, data: {
    axesDeclinaisons: [ { id: "version", nom: "Version", valeurs: ["Dessinateur (structure noire)","Structure noire, maille noire","Structure blanche, maille beige"] } ],
    declinaisons: [
      mk({ version: "Dessinateur (structure noire)" }, 245, "TCY03NR-.."),
      mk({ version: "Structure noire, maille noire" }, 345, "TCY05NR-.."),
      mk({ version: "Structure blanche, maille beige" }, 365, "TCY05BE-.."),
    ],
  } });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris assise", vitrineId: v.id, ordre: 0, finitions: { create: COLORIS } } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — 3 combinaisons + coloris assise (informatif)`);
  console.log(`\n✓ TECSY CONCEPT traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
