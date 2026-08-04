import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Maike";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const trouver = (n) => produits.find((p) => norm(p.nom) === norm(n));
  const manquants = [];

  const chaise = trouver("Chaise");
  if (!chaise) manquants.push("Chaise");
  else {
    await prisma.produitVitrine.update({ where: { id: chaise.id }, data: {
      axesDeclinaisons: [ { id: "conditionnement", nom: "Conditionnement", valeurs: ["Lot de 4","À l'unité"] } ],
      declinaisons: [
      mk({conditionnement:"Lot de 4"},514,"KEA04.."),
      mk({conditionnement:"À l'unité"},154,"KEA00.."),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: chaise.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: chaise.id, ordre: 0, finitions: { create: [
      { nom: "Rose Corail", couleur: "#e8746a", ordre: 0 },
      { nom: "Rose Poudré", couleur: "#e5b8b0", ordre: 1 },
      { nom: "Bleu Pastel", couleur: "#a8c4d9", ordre: 2 },
      { nom: "Vert Menthol", couleur: "#a9d4bf", ordre: 3 },
      { nom: "Beige Sable", couleur: "#d8c9a8", ordre: 4 },
      { nom: "Orange Mandarine", couleur: "#e08a3c", ordre: 5 },
      { nom: "Blanc Neige", couleur: "#f2f0ec", ordre: 6 },
      { nom: "Bleu océan (recyclé)", couleur: "#2f6f8f", ordre: 7 },
      { nom: "Gris perle (recyclé)", couleur: "#c9c9c6", ordre: 8 },
      { nom: "Gris lave (recyclé)", couleur: "#6b6560", ordre: 9 }
    ] } } });
    console.log(`  ✓ ${gamme.nom} / Chaise — 2 conditionnements + 10 coloris`);
  }

  const tabouret = trouver("Tabouret");
  if (!tabouret) manquants.push("Tabouret");
  else {
    await prisma.produitVitrine.update({ where: { id: tabouret.id }, data: {
      axesDeclinaisons: [ { id: "conditionnement", nom: "Conditionnement", valeurs: ["Lot de 2","À l'unité"] } ],
      declinaisons: [
      mk({conditionnement:"Lot de 2"},320,"KEH02.."),
      mk({conditionnement:"À l'unité"},188,"KEH00.."),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: tabouret.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: tabouret.id, ordre: 0, finitions: { create: [
      { nom: "Rose Corail", couleur: "#e8746a", ordre: 0 },
      { nom: "Rose Poudré", couleur: "#e5b8b0", ordre: 1 },
      { nom: "Bleu Pastel", couleur: "#a8c4d9", ordre: 2 },
      { nom: "Vert Menthol", couleur: "#a9d4bf", ordre: 3 },
      { nom: "Beige Sable", couleur: "#d8c9a8", ordre: 4 },
      { nom: "Blanc Neige", couleur: "#f2f0ec", ordre: 5 },
      { nom: "Gris perle (recyclé)", couleur: "#c9c9c6", ordre: 6 },
      { nom: "Gris lave (recyclé)", couleur: "#6b6560", ordre: 7 }
    ] } } });
    console.log(`  ✓ ${gamme.nom} / Tabouret — 2 conditionnements + 8 coloris`);
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ Maike traitée (Chaise + Tabouret).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
