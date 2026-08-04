import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "LOOPS";

const COLORIS = [
  { nom: "Beige", couleur: "#d8c9a8", ordre: 0 },
  { nom: "Blanc", couleur: "#f2f0ec", ordre: 1 },
  { nom: "Gris", couleur: "#8b8d90", ordre: 2 },
  { nom: "Jaune", couleur: "#e0b93c", ordre: 3 },
  { nom: "Kaki", couleur: "#6b6a4a", ordre: 4 },
  { nom: "Noir", couleur: "#23262a", ordre: 5 },
  { nom: "Rouge", couleur: "#b23a34", ordre: 6 },
];

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const trouver = (n) => produits.find((p) => norm(p.nom) === norm(n));
  const manquants = [];

  // ── Chaise : Piètement × Placet ──
  const chaise = trouver("Chaise");
  if (!chaise) manquants.push("Chaise");
  else {
    await prisma.produitVitrine.update({ where: { id: chaise.id }, data: {
      axesDeclinaisons: [
        { id: "pietement", nom: "Piètement", valeurs: ["Pyramide métal noir","Bois"] },
        { id: "placet", nom: "Placet (assise rembourrée)", valeurs: ["Sans placet","Avec placet"] },
      ],
      declinaisons: [
        mk({ pietement: "Pyramide métal noir", placet: "Sans placet" }, 170, "LOO01.."),
        mk({ pietement: "Pyramide métal noir", placet: "Avec placet" }, 195, "LOO07BLA"),
        mk({ pietement: "Bois", placet: "Sans placet" }, 145, "LOO03.."),
        mk({ pietement: "Bois", placet: "Avec placet" }, 175, "LOO08BLA"),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: chaise.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: chaise.id, ordre: 0, finitions: { create: COLORIS } } });
    console.log(`  ✓ ${gamme.nom} / Chaise — 4 combinaisons + 7 coloris (placet = blanc uniquement)`);
  }

  // ── Fauteuil : Piètement ──
  const fauteuil = trouver("Fauteuil");
  if (!fauteuil) manquants.push("Fauteuil");
  else {
    await prisma.produitVitrine.update({ where: { id: fauteuil.id }, data: {
      axesDeclinaisons: [ { id: "pietement", nom: "Piètement", valeurs: ["Pyramide métal noir","Bois"] } ],
      declinaisons: [
        mk({ pietement: "Pyramide métal noir" }, 185, "LOO02.."),
        mk({ pietement: "Bois" }, 160, "LOO04.."),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: fauteuil.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: fauteuil.id, ordre: 0, finitions: { create: COLORIS } } });
    console.log(`  ✓ ${gamme.nom} / Fauteuil — 2 combinaisons + 7 coloris`);
  }

  // ── Chaise haute : Placet ──
  const haute = trouver("Chaise haute");
  if (!haute) manquants.push("Chaise haute");
  else {
    await prisma.produitVitrine.update({ where: { id: haute.id }, data: {
      axesDeclinaisons: [ { id: "placet", nom: "Placet (assise rembourrée)", valeurs: ["Sans placet","Avec placet"] } ],
      declinaisons: [
        mk({ placet: "Sans placet" }, 135, "LOO05.."),
        mk({ placet: "Avec placet" }, 160, "LOO09BLA"),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: haute.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: haute.id, ordre: 0, finitions: { create: COLORIS } } });
    console.log(`  ✓ ${gamme.nom} / Chaise haute — 2 combinaisons + 7 coloris (placet = blanc uniquement)`);
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ LOOPS traitée (Chaise, Fauteuil, Chaise haute).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
