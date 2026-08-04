import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "SQUARE";
const NOM_PRODUIT = "Table basse";

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
    axesDeclinaisons: [], declinaisons: [ mk({}, 185, "SQU01..") ],
  } });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris plateau", vitrineId: v.id, ordre: 0, finitions: { create: [
      { nom: "Blanc", couleur: "#f2f0ec", ordre: 0 },
      { nom: "Bois", couleur: "#b08a5a", ordre: 1 },
      { nom: "Noir", couleur: "#23262a", ordre: 2 }
  ] } } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — prix unique 185€ + 3 coloris plateau`);
  console.log(`\n✓ SQUARE traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
