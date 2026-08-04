import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "COIGNY";
const NOM_PRODUIT = "Chaise";

const COLORIS = [
  { nom: "Bleu jean", couleur: "#4a6079", ordre: 0 },
  { nom: "Gris clair", couleur: "#c9c9c6", ordre: 1 },
  { nom: "Noir", couleur: "#23262a", ordre: 2 },
  { nom: "Vert anis", couleur: "#a3c14a", ordre: 3 },
  { nom: "Prune", couleur: "#6b3552", ordre: 4 },
  { nom: "Bleu", couleur: "#3f6fa3", ordre: 5 },
  { nom: "Gris", couleur: "#8b8d90", ordre: 6 },
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
    axesDeclinaisons: [ { id: "modele", nom: "Modèle", valeurs: ["Eco (pieds noirs)","Max (pieds chromés)","Max (pieds noirs)","Color (pieds noirs)","Mili (pieds noirs)"] } ],
    declinaisons: [
      mk({ modele: "Eco (pieds noirs)" }, 56, "CQPN41.."),
      mk({ modele: "Max (pieds chromés)" }, 62, "CQPC61NRNR"),
      mk({ modele: "Max (pieds noirs)" }, 62, "CQPN61NR"),
      mk({ modele: "Color (pieds noirs)" }, 56, "CQPN05.."),
      mk({ modele: "Mili (pieds noirs)" }, 56, "CQPN41.."),
    ],
  } });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: v.id, ordre: 0, finitions: { create: COLORIS } } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — 5 combinaisons (modèles) + coloris (informatif)`);
  console.log(`\n✓ COIGNY traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
