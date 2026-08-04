import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Galet OfficePro";
const NOM_PRODUIT = "Table basse";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  // Résout la marque OfficePro (nom contient "officepro")
  const marques = await prisma.marque.findMany({ select: { id: true, nom: true } });
  const marqueOP = marques.find((m) => norm(m.nom).includes("officepro"));
  if (!marqueOP) { console.error(`Marque OfficePro introuvable. Marques : ${marques.map((m)=>m.nom).join(", ")}`); process.exit(1); }

  // Gamme GALET RATTACHÉE à OfficePro (évite la collision avec le Galet Buronomic)
  const gammes = await prisma.gamme.findMany({ where: { marqueId: marqueOP.id }, select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) {
    console.error(`Gamme "${NOM_GAMME}" (marque ${marqueOP.nom}) introuvable.`);
    console.error(`Gammes OfficePro : ${gammes.map((g)=>g.nom).join(", ") || "(aucune)"}`);
    process.exit(1);
  }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm(NOM_PRODUIT));
  if (!v) {
    console.error(`⚠ Produit "${NOM_PRODUIT}" introuvable dans la gamme "${gamme.nom}" (OfficePro).`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun — crée-le d'abord)"}`);
    process.exit(1);
  }
  await prisma.produitVitrine.update({ where: { id: v.id }, data: {
    axesDeclinaisons: [ { id: "taille", nom: "Taille", valeurs: ["Petite","Allongée"] } ],
    declinaisons: [
      mk({taille:"Petite"},125,"GAL01BLA"),
      mk({taille:"Allongée"},170,"GAL02BLA"),
    ],
  } });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  console.log(`  ✓ ${marqueOP.nom} / ${gamme.nom} / ${v.nom} — 2 combinaisons (Petite 125€ / Allongée 170€)`);
  console.log(`\n✓ GALET (OfficePro) traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
